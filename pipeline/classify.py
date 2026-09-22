"""Classify rasterized textbook pages via Anthropic vision (thumbnails).

Writes ``extracted/<book>/pages.json`` and appends failures to ``failures.jsonl``.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError, field_validator

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

DEFAULT_RAW = ROOT / "raw"
DEFAULT_OUT = ROOT / "extracted"
FAILURES_PATH = ROOT / "failures.jsonl"
DEFAULT_MODEL = os.environ.get("ANTHROPIC_CLASSIFY_MODEL", "claude-haiku-4-5-20251001")

BOOKS = ("passaporte-aluno", "passaporte-professor", "valer")


class PageKind(str, Enum):
    EXERCISES = "exercises"
    GRAMMAR_REF = "grammar_ref"
    TRANSCRIPT = "transcript"
    ANSWER_KEY = "answer_key"
    OTHER = "other"


class PageClassification(BaseModel):
    page: int = Field(ge=1)
    unit: int | None = Field(default=None, ge=1)
    page_kind: PageKind
    exercise_letters: list[str] = Field(default_factory=list)

    @field_validator("exercise_letters")
    @classmethod
    def upper_letters(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        for item in value:
            letter = item.strip().upper()
            if not letter:
                continue
            if not re.fullmatch(r"[A-Z]", letter):
                raise ValueError(f"invalid exercise letter: {item!r}")
            cleaned.append(letter)
        return cleaned


class PagesIndex(BaseModel):
    book: str
    model: str
    created_at: str
    pages: list[PageClassification]


class ClassifyError(RuntimeError):
    pass


CLASSIFY_SYSTEM = """You classify scanned pages from A1 Portuguese textbooks.
Return ONLY valid JSON matching this schema:
{
  "unit": <positive int or null if unknown>,
  "page_kind": "exercises" | "grammar_ref" | "transcript" | "answer_key" | "other",
  "exercise_letters": ["A", "B", ...]  // letters of exercises on this page; empty if none
}
Rules:
- page_kind=exercises when the page has student exercises to complete.
- page_kind=answer_key for teacher's book solution pages.
- page_kind=transcript for audio transcript appendices.
- page_kind=grammar_ref for grammar tables/explanations without exercises.
- page_kind=other for covers, TOC, blank, ads, etc.
- exercise_letters are single Latin letters only, uppercase.
- unit is the textbook unit number if visible; otherwise null.
"""


def page_stem(page: int) -> str:
    return f"p-{page:03d}"


def thumb_path(raw_dir: Path, book: str, page: int) -> Path:
    return raw_dir / book / "thumbs" / f"{page_stem(page)}.png"


def list_available_thumbs(raw_dir: Path, book: str) -> list[int]:
    thumbs = raw_dir / book / "thumbs"
    if not thumbs.is_dir():
        return []
    pages: list[int] = []
    for path in thumbs.glob("p-*.png"):
        try:
            pages.append(int(path.stem.split("-")[-1]))
        except ValueError:
            continue
    return sorted(pages)


def parse_pages_arg(value: str | None, available: list[int]) -> list[int]:
    if not value:
        return available
    if "-" in value:
        left, right = value.split("-", 1)
        first, last = int(left), int(right)
        return [p for p in available if first <= p <= last]
    return [int(value)]


def append_failure(record: dict[str, Any], path: Path = FAILURES_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def extract_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def classify_image(
    *,
    client: Any,
    model: str,
    image_path: Path,
    page: int,
    book: str,
) -> PageClassification:
    image_b64 = base64.standard_b64encode(image_path.read_bytes()).decode("ascii")
    media_type = "image/png"

    def call(strict: bool) -> str:
        user_text = (
            f"Book key: {book}. Printed/scan page number hint: {page}. "
            "Classify this thumbnail."
        )
        if strict:
            user_text += (
                " Respond with a single JSON object only — no markdown, no commentary."
            )
        message = client.messages.create(
            model=model,
            max_tokens=400,
            system=CLASSIFY_SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": user_text},
                    ],
                }
            ],
        )
        parts = []
        for block in message.content:
            if getattr(block, "type", None) == "text":
                parts.append(block.text)
        return "\n".join(parts)

    raw_text = call(strict=False)
    try:
        data = extract_json_object(raw_text)
        data["page"] = page
        return PageClassification.model_validate(data)
    except (json.JSONDecodeError, ValidationError, TypeError, ValueError):
        raw_text = call(strict=True)
        data = extract_json_object(raw_text)
        data["page"] = page
        return PageClassification.model_validate(data)


def load_existing_pages(path: Path) -> dict[int, PageClassification]:
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    out: dict[int, PageClassification] = {}
    for row in data.get("pages") or []:
        try:
            item = PageClassification.model_validate(row)
            out[item.page] = item
        except ValidationError:
            continue
    return out


def classify_book(
    *,
    book: str,
    pages: list[int],
    raw_dir: Path = DEFAULT_RAW,
    out_dir: Path = DEFAULT_OUT,
    model: str = DEFAULT_MODEL,
    client: Any | None = None,
    sleep_s: float = 0.0,
    merge: bool = True,
    skip_existing: bool = True,
) -> Path:
    if book not in BOOKS:
        raise ClassifyError(f"Unknown book '{book}'. Expected one of {BOOKS}")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if client is None:
        if not api_key.startswith("sk-ant-"):
            raise ClassifyError("ANTHROPIC_API_KEY missing or invalid in .env")
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)

    dest_dir = out_dir / book
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / "pages.json"
    existing = load_existing_pages(dest) if merge else {}

    results_by_page: dict[int, PageClassification] = dict(existing)
    for page in pages:
        if skip_existing and page in existing:
            print(f"skip {book} p-{page:03d} (already classified)")
            continue
        path = thumb_path(raw_dir, book, page)
        if not path.is_file():
            append_failure(
                {
                    "stage": "classify",
                    "book": book,
                    "page": page,
                    "error": f"missing thumb: {path}",
                    "at": datetime.now(timezone.utc).isoformat(),
                }
            )
            continue
        try:
            result = classify_image(
                client=client,
                model=model,
                image_path=path,
                page=page,
                book=book,
            )
            results_by_page[page] = result
            print(f"ok  {book} p-{page:03d} → {result.page_kind.value} unit={result.unit}")
        except Exception as exc:  # noqa: BLE001 — log and continue per page
            append_failure(
                {
                    "stage": "classify",
                    "book": book,
                    "page": page,
                    "error": str(exc),
                    "at": datetime.now(timezone.utc).isoformat(),
                }
            )
            print(f"fail {book} p-{page:03d}: {exc}", file=sys.stderr)
        if sleep_s:
            time.sleep(sleep_s)

    pages_sorted = [results_by_page[p] for p in sorted(results_by_page)]
    index = PagesIndex(
        book=book,
        model=model,
        created_at=datetime.now(timezone.utc).isoformat(),
        pages=pages_sorted,
    )
    dest.write_text(index.model_dump_json(indent=2), encoding="utf-8")
    return dest


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Classify Passaporte page thumbnails")
    parser.add_argument("--book", required=True, choices=BOOKS)
    parser.add_argument("--pages", help="e.g. 10-40 or a single page", default=None)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.15,
        help="Seconds between API calls (rate limit cushion)",
    )
    parser.add_argument(
        "--no-merge",
        action="store_true",
        help="Replace pages.json instead of merging by page number",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-classify pages even if already present in pages.json",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    available = list_available_thumbs(DEFAULT_RAW, args.book)
    if not available:
        print(f"error: no thumbs for {args.book} under {DEFAULT_RAW}", file=sys.stderr)
        return 1
    pages = parse_pages_arg(args.pages, available)
    if not pages:
        print("error: no pages matched", file=sys.stderr)
        return 1
    try:
        dest = classify_book(
            book=args.book,
            pages=pages,
            model=args.model,
            sleep_s=args.sleep,
            merge=not args.no_merge,
            skip_existing=not args.force,
        )
    except ClassifyError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(f"Wrote {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
