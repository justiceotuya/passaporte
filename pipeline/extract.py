"""Extract exercises from classified student-book pages (150 DPI vision).

Writes ``extracted/<book>/<run_id>/p-NNN.json`` and never overwrites an existing file.
Answers are optional here — teacher-key join fills them later.
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
from typing import Any, Literal

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError, field_validator

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

DEFAULT_RAW = ROOT / "raw"
DEFAULT_EXTRACTED = ROOT / "extracted"
FAILURES_PATH = ROOT / "failures.jsonl"
EXAMPLES_DIR = Path(__file__).resolve().parent / "prompts" / "examples"
DEFAULT_MODEL = os.environ.get(
    "ANTHROPIC_EXTRACT_MODEL",
    "claude-sonnet-4-5-20250929",
)

BOOKS = ("passaporte-aluno", "passaporte-professor", "valer")
ItemType = Literal[
    "choice",
    "fill_blank",
    "match",
    "order",
    "true_false",
    "transform",
    "listen_choice",
    "open",
]
Skill = Literal["grammar", "vocabulary", "reading", "listening", "other"]


class MatchPair(BaseModel):
    left: str = Field(min_length=1)
    right: str = Field(min_length=1)


class ExtractedItem(BaseModel):
    item_index: int = Field(ge=1)
    type: ItemType
    skill: Skill = "other"
    topic: str = "unknown"
    instruction: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    options: list[str] | None = None
    pairs: list[MatchPair] | None = None
    sequence: list[str] | None = None
    transcript: str | None = None
    needs_image: bool = False
    bbox: list[float] | None = None

    @field_validator("type", mode="before")
    @classmethod
    def coerce_type(cls, value: object) -> object:
        allowed = {
            "choice",
            "fill_blank",
            "match",
            "order",
            "true_false",
            "transform",
            "listen_choice",
            "open",
        }
        if isinstance(value, str) and value not in allowed:
            return "open"
        return value

    @field_validator("pairs", mode="before")
    @classmethod
    def clean_pairs(cls, value: object) -> object:
        if not isinstance(value, list):
            return value
        cleaned = []
        for pair in value:
            if not isinstance(pair, dict):
                continue
            left = str(pair.get("left") or "").strip() or "?"
            right = str(pair.get("right") or "").strip() or "?"
            cleaned.append({"left": left, "right": right})
        return cleaned or None

    @field_validator("options", "sequence")
    @classmethod
    def non_empty_entries(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        if any(not s.strip() for s in value):
            raise ValueError("list entries must be non-empty")
        return value


class ExtractedExercise(BaseModel):
    letter: str = Field(min_length=1)

    @field_validator("letter")
    @classmethod
    def upper_letter(cls, value: str) -> str:
        letter = value.strip().upper()
        if not re.fullmatch(r"[A-Z]", letter):
            raise ValueError(f"invalid exercise letter: {value!r}")
        return letter

    items: list[ExtractedItem] = Field(min_length=1)


class ExtractedPage(BaseModel):
    book: str
    page: int = Field(ge=1)
    unit: int | None = None
    exercises: list[ExtractedExercise] = Field(default_factory=list)


class ExtractError(RuntimeError):
    pass


def load_examples() -> str:
    chunks: list[str] = []
    for name in ("choice.json", "fill_blank.json", "match.json"):
        path = EXAMPLES_DIR / name
        if path.is_file():
            chunks.append(path.read_text(encoding="utf-8"))
    return "\n\n".join(chunks)


EXTRACT_SYSTEM = f"""You extract closed exercises from a scanned A1 Portuguese textbook page.
Return ONLY valid JSON:
{{
  "unit": <int or null>,
  "exercises": [
    {{
      "letter": "A",
      "items": [
        {{
          "item_index": 1,
          "type": "choice|fill_blank|match|order|true_false|transform|listen_choice|open",
          "skill": "grammar|vocabulary|reading|listening|other",
          "topic": "short topic label",
          "instruction": "verbatim Portuguese instruction from the book",
          "prompt": "item prompt / stem",
          "options": ["..."] ,
          "pairs": [{{"left":"...","right":"..."}}],
          "sequence": ["..."],
          "transcript": null,
          "needs_image": false,
          "bbox": null
        }}
      ]
    }}
  ]
}}
Rules:
- Prefer closed types. Use open only when the task cannot be graded automatically.
- instruction must be the book's Portuguese wording.
- Do not invent answers; omit answers entirely.
- Include options for choice / listen_choice / tile-style fill_blank when visible.
- For match, use pairs. For order, use sequence as the tokens to reorder (not the solution order if unclear — use the jumbled tokens as shown).
- needs_image true when the item depends on a photo/drawing on the page.
- If the page has no exercises, return {{"unit": null, "exercises": []}}.

Worked examples:
{load_examples()}
"""


def page_filename(page: int) -> str:
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


def load_exercise_pages(pages_json: Path, page_filter: list[int] | None) -> list[dict[str, Any]]:
    data = json.loads(pages_json.read_text(encoding="utf-8"))
    pages = data.get("pages", [])
    selected = []
    for entry in pages:
        if entry.get("page_kind") != "exercises":
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


def extract_page_image(
    *,
    client: Any,
    model: str,
    image_path: Path,
    book: str,
    page: int,
    unit_hint: int | None,
    letters_hint: list[str],
) -> ExtractedPage:
    image_b64 = base64.standard_b64encode(image_path.read_bytes()).decode("ascii")

    def call(strict: bool) -> str:
        hint = (
            f"Book={book}. Page={page}. Unit hint={unit_hint}. "
            f"Expected exercise letters hint={letters_hint}."
        )
        if strict:
            hint += " JSON object only — no markdown."
        message = client.messages.create(
            model=model,
            max_tokens=4096,
            system=EXTRACT_SYSTEM,
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
        return ExtractedPage.model_validate(data)
    except (json.JSONDecodeError, ValidationError, TypeError, ValueError):
        raw = call(strict=True)
        data = extract_json_object(raw)
        data["book"] = book
        data["page"] = page
        if data.get("unit") is None and unit_hint is not None:
            data["unit"] = unit_hint
        return ExtractedPage.model_validate(data)


def extract_book(
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
        raise ExtractError(f"Unknown book '{book}'")

    pages_json = extracted_dir / book / "pages.json"
    if not pages_json.is_file():
        raise ExtractError(f"Missing {pages_json} — run classify.py first")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if client is None:
        if not api_key.startswith("sk-ant-"):
            raise ExtractError("ANTHROPIC_API_KEY missing or invalid in .env")
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)

    run_id = run_id or new_run_id()
    out_dir = extracted_dir / book / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    entries = load_exercise_pages(pages_json, pages)
    if not entries:
        raise ExtractError("No exercise pages matched the filter")

    for entry in entries:
        page = int(entry["page"])
        dest = out_dir / page_filename(page).replace(".png", ".json")
        if dest.exists():
            print(f"skip {book} p-{page:03d} (exists)")
            continue

        image_path = raw_dir / book / page_filename(page)
        if not image_path.is_file():
            append_failure(
                {
                    "stage": "extract",
                    "book": book,
                    "page": page,
                    "error": f"missing image {image_path}",
                    "at": datetime.now(timezone.utc).isoformat(),
                }
            )
            continue

        try:
            result = extract_page_image(
                client=client,
                model=model,
                image_path=image_path,
                book=book,
                page=page,
                unit_hint=entry.get("unit"),
                letters_hint=entry.get("exercise_letters") or [],
            )
            dest.write_text(result.model_dump_json(indent=2), encoding="utf-8")
            n_items = sum(len(ex.items) for ex in result.exercises)
            print(
                f"ok  {book} p-{page:03d} → {len(result.exercises)} exercises / {n_items} items"
            )
        except Exception as exc:  # noqa: BLE001
            append_failure(
                {
                    "stage": "extract",
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "pages_requested": pages,
    }
    (out_dir / "run.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return out_dir


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Extract exercises from page images")
    parser.add_argument("--book", required=True, choices=BOOKS)
    parser.add_argument("--pages", help="e.g. 10-15 (exercise pages only)", default=None)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--sleep", type=float, default=0.2)
    parser.add_argument(
        "--run-id",
        default=None,
        help="Reuse an existing run folder (skips pages that already have JSON)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    pages = parse_pages_arg(args.pages)
    try:
        out = extract_book(
            book=args.book,
            pages=pages,
            model=args.model,
            sleep_s=args.sleep,
            run_id=args.run_id,
        )
    except ExtractError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(f"Wrote run → {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
