"""Generate English hints for closed items without restating the answer.

Batches up to 20 items per Anthropic text call. Rejects any hint that contains
the answer (or accepted variants) and retries once.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError

from models import CLOSED_TYPES, ItemType, PassaporteUnit

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

DEFAULT_CONTENT = ROOT / "content" / "local" / "passaporte"
FAILURES_PATH = ROOT / "failures.jsonl"
DEFAULT_MODEL = os.environ.get(
    "ANTHROPIC_HINTS_MODEL",
    "claude-haiku-4-5-20251001",
)
BATCH_SIZE = 20
PENDING_PREFIX = "Pending hint generation."


class HintsError(RuntimeError):
    pass


class HintRow(BaseModel):
    id: str = Field(min_length=1)
    hint_en: str = Field(min_length=1)


class HintBatch(BaseModel):
    hints: list[HintRow]


HINT_SYSTEM = """You write short English study hints for A1 Portuguese exercises.
Return ONLY valid JSON:
{"hints":[{"id":"...","hint_en":"..."}]}

Rules:
- One sentence per item, under 140 characters.
- Explain the grammar point or vocabulary cue.
- NEVER state, spell, or paraphrase the correct answer.
- Never include option letters like "A)" as the answer.
- Write for an English-speaking learner.
"""


def append_failure(record: dict[str, Any], path: Path = FAILURES_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def answer_strings(item: dict[str, Any]) -> list[str]:
    values: list[str] = []
    answer = item.get("answer")
    if isinstance(answer, str) and answer.strip():
        values.append(answer.strip())
    elif isinstance(answer, list):
        for entry in answer:
            if isinstance(entry, str) and entry.strip():
                values.append(entry.strip())
            elif isinstance(entry, dict):
                for key in ("left", "right"):
                    text = str(entry.get(key) or "").strip()
                    if text:
                        values.append(text)
    for accepted in item.get("accepted") or []:
        text = str(accepted).strip()
        if text:
            values.append(text)
    return values


def hint_contains_answer(hint: str, answers: list[str]) -> bool:
    """True when any answer token appears as a whole word/phrase in the hint."""
    hay = _fold(hint)
    for answer in answers:
        needle = _fold(answer)
        if len(needle) < 2:
            continue
        if " " in needle or "-" in needle:
            if needle in hay:
                return True
            continue
        if re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", hay):
            return True
    return False


def _fold(text: str) -> str:
    return (
        text.casefold()
        .replace("á", "a")
        .replace("à", "a")
        .replace("â", "a")
        .replace("ã", "a")
        .replace("é", "e")
        .replace("ê", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ô", "o")
        .replace("õ", "o")
        .replace("ú", "u")
        .replace("ç", "c")
    )


def needs_hint(item: dict[str, Any]) -> bool:
    try:
        item_type = ItemType(item.get("type"))
    except ValueError:
        return False
    if item_type not in CLOSED_TYPES:
        return False
    hint = (item.get("hint_en") or "").strip()
    return (not hint) or hint.startswith(PENDING_PREFIX)


def item_payload_for_model(item: dict[str, Any]) -> dict[str, Any]:
    """Omit the answer so the model cannot simply echo it."""
    payload: dict[str, Any] = {
        "id": item["id"],
        "type": item.get("type"),
        "skill": item.get("skill"),
        "topic": item.get("topic"),
        "instruction": item.get("instruction"),
        "prompt": item.get("prompt"),
    }
    if item.get("options"):
        payload["options"] = item["options"]
    if item.get("pairs"):
        # Show lefts only — rights are often the answers.
        payload["pair_lefts"] = [p.get("left") for p in item["pairs"] if isinstance(p, dict)]
    if item.get("sequence"):
        payload["sequence_shuffled_hint"] = "order the given elements"
    return payload


def extract_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("no JSON object in model response")
    return json.loads(text[start : end + 1])


def request_hints(
    *,
    client: Any,
    model: str,
    items: list[dict[str, Any]],
    strict: bool = False,
) -> dict[str, str]:
    payload = [item_payload_for_model(item) for item in items]
    user = (
        "Write hints for these items. Return JSON only.\n"
        + json.dumps(payload, ensure_ascii=False)
    )
    if strict:
        user += (
            "\nIMPORTANT: Do not include any answer words. "
            "One sentence of grammar/vocab guidance only."
        )
    message = client.messages.create(
        model=model,
        max_tokens=2048,
        system=HINT_SYSTEM,
        messages=[{"role": "user", "content": user}],
    )
    parts = [
        block.text
        for block in message.content
        if getattr(block, "type", None) == "text"
    ]
    data = extract_json_object("\n".join(parts))
    batch = HintBatch.model_validate(data)
    return {row.id: row.hint_en.strip() for row in batch.hints}


def apply_batch_hints(
    items: list[dict[str, Any]],
    hints: dict[str, str],
) -> tuple[dict[str, str], list[str]]:
    """Validate hints; return (accepted_by_id, rejected_ids)."""
    accepted: dict[str, str] = {}
    rejected: list[str] = []
    by_id = {item["id"]: item for item in items}
    for item_id, hint in hints.items():
        item = by_id.get(item_id)
        if item is None:
            continue
        if hint_contains_answer(hint, answer_strings(item)):
            rejected.append(item_id)
            continue
        if len(hint) < 8:
            rejected.append(item_id)
            continue
        accepted[item_id] = hint
    for item in items:
        if item["id"] not in accepted and item["id"] not in rejected:
            rejected.append(item["id"])
    return accepted, rejected


def generate_hints_for_items(
    *,
    client: Any,
    model: str,
    items: list[dict[str, Any]],
) -> dict[str, str]:
    raw = request_hints(client=client, model=model, items=items, strict=False)
    accepted, rejected_ids = apply_batch_hints(items, raw)

    if rejected_ids:
        retry_items = [item for item in items if item["id"] in rejected_ids]
        try:
            raw_retry = request_hints(
                client=client, model=model, items=retry_items, strict=True
            )
            more, still_bad = apply_batch_hints(retry_items, raw_retry)
            accepted.update(more)
            for item_id in still_bad:
                append_failure(
                    {
                        "stage": "hints",
                        "id": item_id,
                        "error": "hint rejected (contains answer or missing)",
                        "at": datetime.now(timezone.utc).isoformat(),
                    }
                )
        except (json.JSONDecodeError, ValidationError, TypeError, ValueError) as exc:
            for item_id in rejected_ids:
                append_failure(
                    {
                        "stage": "hints",
                        "id": item_id,
                        "error": f"retry failed: {exc}",
                        "at": datetime.now(timezone.utc).isoformat(),
                    }
                )

    return accepted


def load_units(content_dir: Path, units: list[int] | None) -> list[tuple[Path, dict[str, Any]]]:
    loaded: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(content_dir.glob("u*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        unit = int(data.get("unit") or 0)
        if units is not None and unit not in units:
            continue
        # Validate shape early
        PassaporteUnit.model_validate(data)
        loaded.append((path, data))
    return loaded


def run_hints(
    *,
    content_dir: Path = DEFAULT_CONTENT,
    units: list[int] | None = None,
    limit: int | None = None,
    model: str = DEFAULT_MODEL,
    client: Any | None = None,
    dry_run: bool = False,
) -> dict[str, int]:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if client is None and not dry_run:
        if not api_key.startswith("sk-ant-"):
            raise HintsError("ANTHROPIC_API_KEY missing or invalid in .env")
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)

    loaded = load_units(content_dir, units)
    pending: list[tuple[Path, dict[str, Any], dict[str, Any]]] = []
    for path, data in loaded:
        for item in data.get("items", []):
            if needs_hint(item):
                pending.append((path, data, item))
    if limit is not None:
        pending = pending[:limit]

    stats = {"pending": len(pending), "updated": 0, "batches": 0}
    if dry_run:
        return stats

    # Group by file so we rewrite once per unit after all batches.
    updates: dict[str, str] = {}
    for start in range(0, len(pending), BATCH_SIZE):
        chunk = pending[start : start + BATCH_SIZE]
        items = [row[2] for row in chunk]
        stats["batches"] += 1
        try:
            batch_hints = generate_hints_for_items(client=client, model=model, items=items)
        except Exception as exc:  # noqa: BLE001
            for item in items:
                append_failure(
                    {
                        "stage": "hints",
                        "id": item["id"],
                        "error": str(exc),
                        "at": datetime.now(timezone.utc).isoformat(),
                    }
                )
            continue
        updates.update(batch_hints)

    # Apply to unit files
    by_path: dict[Path, dict[str, Any]] = {path: data for path, data in loaded}
    for path, data in by_path.items():
        changed = False
        for item in data.get("items", []):
            hint = updates.get(item["id"])
            if hint:
                item["hint_en"] = hint
                stats["updated"] += 1
                changed = True
        if changed:
            # Re-validate then write without nulls
            unit = PassaporteUnit.model_validate(data)
            path.write_text(
                unit.model_dump_json(indent=2, exclude_none=True),
                encoding="utf-8",
            )

    return stats


def parse_units(value: str | None) -> list[int] | None:
    if not value:
        return None
    return [int(part.strip()) for part in value.split(",") if part.strip()]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate hint_en for closed items")
    parser.add_argument("--content-dir", default=str(DEFAULT_CONTENT))
    parser.add_argument("--units", default=None, help="Comma list, e.g. 1,2")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--dry-run", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        stats = run_hints(
            content_dir=Path(args.content_dir),
            units=parse_units(args.units),
            limit=args.limit,
            model=args.model,
            dry_run=args.dry_run,
        )
    except HintsError as exc:
        print(f"error: {exc}")
        return 1
    print(
        f"pending={stats['pending']} updated={stats['updated']} batches={stats['batches']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
