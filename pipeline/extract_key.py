"""Extract answer keys from the teacher book (vision).

Writes ``extracted/<book>/<run_id>/p-NNN.json`` for answer_key pages.
Never overwrites an existing page file in that run.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError, field_validator

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

DEFAULT_RAW = ROOT / "raw"
DEFAULT_EXTRACTED = ROOT / "extracted"
FAILURES_PATH = ROOT / "failures.jsonl"
DEFAULT_MODEL = os.environ.get(
    "ANTHROPIC_EXTRACT_MODEL",
    "claude-sonnet-4-5-20250929",
)

# Teacher book only for Passaporte v1 key extraction
BOOKS = ("passaporte-professor",)


class KeyItem(BaseModel):
    item_index: int = Field(ge=1)
    answer: str = Field(min_length=1)
    accepted: list[str] = Field(default_factory=list)


class KeyExercise(BaseModel):
    letter: str = Field(min_length=1)
    skill: str = "other"
    student_page: int | None = Field(default=None, ge=1)
    solution_text: str = ""
    items: list[KeyItem] = Field(default_factory=list)

    @field_validator("letter")
    @classmethod
    def upper_letter(cls, value: str) -> str:
        letter = value.strip().upper()
        if not re.fullmatch(r"[A-Z]", letter):
            raise ValueError(f"invalid exercise letter: {value!r}")
        return letter


class KeyPage(BaseModel):
    book: str
    page: int = Field(ge=1)
    unit: int | None = None
    exercises: list[KeyExercise] = Field(default_factory=list)


class ExtractKeyError(RuntimeError):
    pass


EXTRACT_KEY_SYSTEM = """You extract answer keys from a scanned Portuguese teacher's book page.
Return ONLY valid JSON:
{
  "unit": <int or null>,
  "exercises": [
    {
      "letter": "H",
      "skill": "grammar|vocabulary|reading|listening|other",
      "student_page": <int page in the student book, or null if unclear>,
      "solution_text": "verbatim solution prose from the teacher book",
      "items": [
        {"item_index": 1, "answer": "não gosta", "accepted": []}
      ]
    }
  ]
}
Rules:
- Map each exercise letter to per-item answers when the key lists 1. 2. 3. or a/b/c choices.
- If the solution is only prose like "1. c, 2. a", split into items with the option text if visible, else the letter/choice as answer.
- student_page is the Livro do Aluno page referenced (e.g. p. 42).
- skill from headings when present (GRAMÁTICA → grammar, VOCABULÁRIO → vocabulary, etc.).
- If the page is not an answer key, return {"unit": null, "exercises": []}.
"""


def page_json_name(page: int) -> str:
    return f"p-{page:03d}.json"


def page_png_name(page: int) -> str:
    return f"p-{page:03d}.png"


def append_failure(record: dict[str, Any]) -> None:
    FAILURES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with FAILURES_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def extract_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def new_run_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"{stamp}-{uuid.uuid4().hex[:8]}"


def load_answer_key_pages(
    pages_json: Path, page_filter: list[int] | None
) -> list[dict[str, Any]]:
    data = json.loads(pages_json.read_text(encoding="utf-8"))
    selected = []
    for entry in data.get("pages", []):
        if entry.get("page_kind") != "answer_key":
            continue
        page = int(entry["page"])
        if page_filter is not None and page not in page_filter:
            continue
        selected.append(entry)
    return selected


def parse_pages_arg(value: str | None) -> list[int] | None:
    if not value:
        return None
    if "-" in value:
        left, right = value.split("-", 1)
        return list(range(int(left), int(right) + 1))
    return [int(value)]


def extract_key_image(
    *,
    client: Any,
    model: str,
    image_path: Path,
    book: str,
    page: int,
    unit_hint: int | None,
) -> KeyPage:
    image_b64 = base64.standard_b64encode(image_path.read_bytes()).decode("ascii")

    def call(strict: bool) -> str:
        hint = f"Book={book}. Teacher page={page}. Unit hint={unit_hint}."
        if strict:
            hint += " JSON object only — no markdown."
        message = client.messages.create(
            model=model,
            max_tokens=4096,
            system=EXTRACT_KEY_SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": hint},
                    ],
                }
            ],
        )
        parts = []
        for block in message.content:
            if getattr(block, "type", None) == "text":
                parts.append(block.text)
        return "\n".join(parts)

    raw = call(strict=False)
    try:
        data = extract_json_object(raw)
        data["book"] = book
        data["page"] = page
        if data.get("unit") is None and unit_hint is not None:
            data["unit"] = unit_hint
        return KeyPage.model_validate(data)
    except (json.JSONDecodeError, ValidationError, TypeError, ValueError):
        raw = call(strict=True)
        data = extract_json_object(raw)
        data["book"] = book
        data["page"] = page
        if data.get("unit") is None and unit_hint is not None:
            data["unit"] = unit_hint
        return KeyPage.model_validate(data)


def extract_keys(
    *,
    book: str,
    pages: list[int] | None,
    raw_dir: Path = DEFAULT_RAW,
    extracted_dir: Path = DEFAULT_EXTRACTED,
    model: str = DEFAULT_MODEL,
    client: Any | None = None,
    run_id: str | None = None,
    sleep_s: float = 0.2,
) -> Path:
    if book not in BOOKS:
        raise ExtractKeyError(f"Unknown book '{book}'. Expected one of {BOOKS}")

    pages_json = extracted_dir / book / "pages.json"
    if not pages_json.is_file():
        raise ExtractKeyError(f"Missing {pages_json} — run classify.py first")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if client is None:
        if not api_key.startswith("sk-ant-"):
            raise ExtractKeyError("ANTHROPIC_API_KEY missing or invalid in .env")
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)

    run_id = run_id or new_run_id()
    out_dir = extracted_dir / book / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    entries = load_answer_key_pages(pages_json, pages)
    if not entries:
        raise ExtractKeyError("No answer_key pages matched the filter")

    for entry in entries:
        page = int(entry["page"])
        dest = out_dir / page_json_name(page)
        if dest.exists():
            print(f"skip {book} p-{page:03d} (exists)")
            continue

        image_path = raw_dir / book / page_png_name(page)
        if not image_path.is_file():
            append_failure(
                {
                    "stage": "extract_key",
                    "book": book,
                    "page": page,
                    "error": f"missing image {image_path}",
                    "at": datetime.now(timezone.utc).isoformat(),
                }
            )
            continue

        try:
            result = extract_key_image(
                client=client,
                model=model,
                image_path=image_path,
                book=book,
                page=page,
                unit_hint=entry.get("unit"),
            )
            dest.write_text(result.model_dump_json(indent=2), encoding="utf-8")
            n_items = sum(len(ex.items) for ex in result.exercises)
            print(
                f"ok  {book} p-{page:03d} → {len(result.exercises)} exercises / {n_items} answers"
            )
        except Exception as exc:  # noqa: BLE001
            append_failure(
                {
                    "stage": "extract_key",
                    "book": book,
                    "page": page,
                    "error": str(exc),
                    "at": datetime.now(timezone.utc).isoformat(),
                }
            )
            print(f"fail {book} p-{page:03d}: {exc}", file=sys.stderr)
        if sleep_s:
            time.sleep(sleep_s)

    meta = {
        "book": book,
        "run_id": run_id,
        "model": model,
        "kind": "answer_key",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "pages_requested": pages,
    }
    (out_dir / "run.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return out_dir


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Extract teacher-book answer keys")
    parser.add_argument("--book", required=True, choices=BOOKS)
    parser.add_argument("--pages", default=None, help="e.g. 10-15")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--sleep", type=float, default=0.2)
    parser.add_argument("--run-id", default=None)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    pages = parse_pages_arg(args.pages)
    try:
        out = extract_keys(
            book=args.book,
            pages=pages,
            model=args.model,
            sleep_s=args.sleep,
            run_id=args.run_id,
        )
    except ExtractKeyError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(f"Wrote run → {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
