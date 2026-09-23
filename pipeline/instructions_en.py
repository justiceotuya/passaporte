"""Generate English instruction translations for Passaporte items.

Batches Portuguese `instruction` strings into short A1-friendly English
and writes `instruction_en` back into unit JSON. Skips items that already
have a non-empty `instruction_en`.
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

from models import PassaporteUnit

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

DEFAULT_CONTENT = ROOT / "content" / "passaporte"
FAILURES_PATH = ROOT / "failures.jsonl"
DEFAULT_MODEL = os.environ.get(
    "ANTHROPIC_INSTRUCTIONS_EN_MODEL",
    "claude-haiku-4-5-20251001",
)
BATCH_SIZE = 30


class InstructionsEnError(RuntimeError):
    pass


class InstructionRow(BaseModel):
    id: str = Field(min_length=1)
    instruction_en: str = Field(min_length=1)


class InstructionBatch(BaseModel):
    translations: list[InstructionRow]


SYSTEM = """You translate Portuguese exercise instructions into clear English for A1 learners.
Return ONLY valid JSON:
{"translations":[{"id":"...","instruction_en":"..."}]}

Rules:
- Keep meaning faithful to the Portuguese instruction.
- Short and clear; one sentence when possible.
- Use simple vocabulary suitable for absolute beginners.
- Do not translate prompts, options, or answers — only the instruction field provided.
- Do not add extra teaching commentary.
"""


def append_failure(record: dict[str, Any], path: Path = FAILURES_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def needs_instruction_en(item: dict[str, Any]) -> bool:
    instruction = (item.get("instruction") or "").strip()
    if not instruction:
        return False
    existing = (item.get("instruction_en") or "").strip()
    return not existing


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


def request_translations(
    *,
    client: Any,
    model: str,
    items: list[dict[str, Any]],
) -> dict[str, str]:
    payload = [
        {"id": item["id"], "instruction": item.get("instruction")}
        for item in items
    ]
    user = (
        "Translate these Portuguese instructions to English. Return JSON only.\n"
        + json.dumps(payload, ensure_ascii=False)
    )
    message = client.messages.create(
        model=model,
        max_tokens=4096,
        system=SYSTEM,
        messages=[{"role": "user", "content": user}],
    )
    parts = [
        block.text
        for block in message.content
        if getattr(block, "type", None) == "text"
    ]
    data = extract_json_object("\n".join(parts))
    batch = InstructionBatch.model_validate(data)
    return {row.id: row.instruction_en.strip() for row in batch.translations}


def apply_batch_translations(
    items: list[dict[str, Any]],
    translations: dict[str, str],
) -> tuple[dict[str, str], list[str]]:
    """Accept non-empty translations for known ids; return (accepted, missing_ids)."""
    accepted: dict[str, str] = {}
    by_id = {item["id"]: item for item in items}
    for item_id, text in translations.items():
        if item_id not in by_id:
            continue
        cleaned = text.strip()
        if len(cleaned) < 2:
            continue
        accepted[item_id] = cleaned
    missing = [item["id"] for item in items if item["id"] not in accepted]
    return accepted, missing


def generate_translations_for_items(
    *,
    client: Any,
    model: str,
    items: list[dict[str, Any]],
) -> dict[str, str]:
    raw = request_translations(client=client, model=model, items=items)
    accepted, missing = apply_batch_translations(items, raw)

    if missing:
        retry_items = [item for item in items if item["id"] in missing]
        try:
            raw_retry = request_translations(
                client=client, model=model, items=retry_items
            )
            more, still_missing = apply_batch_translations(retry_items, raw_retry)
            accepted.update(more)
            for item_id in still_missing:
                append_failure(
                    {
                        "stage": "instructions_en",
                        "id": item_id,
                        "error": "translation missing after retry",
                        "at": datetime.now(timezone.utc).isoformat(),
                    }
                )
        except (json.JSONDecodeError, ValidationError, TypeError, ValueError) as exc:
            for item_id in missing:
                append_failure(
                    {
                        "stage": "instructions_en",
                        "id": item_id,
                        "error": f"retry failed: {exc}",
                        "at": datetime.now(timezone.utc).isoformat(),
                    }
                )

    return accepted


def load_units(
    content_dir: Path, units: list[int] | None
) -> list[tuple[Path, dict[str, Any]]]:
    loaded: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(content_dir.glob("u*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        unit = int(data.get("unit") or 0)
        if units is not None and unit not in units:
            continue
        PassaporteUnit.model_validate(data)
        loaded.append((path, data))
    return loaded


def run_instructions_en(
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
            raise InstructionsEnError("ANTHROPIC_API_KEY missing or invalid in .env")
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)

    loaded = load_units(content_dir, units)
    pending: list[tuple[Path, dict[str, Any], dict[str, Any]]] = []
    for path, data in loaded:
        for item in data.get("items", []):
            if needs_instruction_en(item):
                pending.append((path, data, item))
    if limit is not None:
        pending = pending[:limit]

    stats = {"pending": len(pending), "updated": 0, "batches": 0, "skipped": 0}
    total_items = sum(len(data.get("items", [])) for _, data in loaded)
    stats["skipped"] = total_items - len(pending)

    if dry_run:
        return stats

    updates: dict[str, str] = {}
    for start in range(0, len(pending), BATCH_SIZE):
        chunk = pending[start : start + BATCH_SIZE]
        items = [row[2] for row in chunk]
        stats["batches"] += 1
        try:
            batch = generate_translations_for_items(
                client=client, model=model, items=items
            )
        except Exception as exc:  # noqa: BLE001
            for item in items:
                append_failure(
                    {
                        "stage": "instructions_en",
                        "id": item["id"],
                        "error": str(exc),
                        "at": datetime.now(timezone.utc).isoformat(),
                    }
                )
            continue
        updates.update(batch)

    by_path: dict[Path, dict[str, Any]] = {path: data for path, data in loaded}
    for path, data in by_path.items():
        changed = False
        for item in data.get("items", []):
            text = updates.get(item["id"])
            if text:
                item["instruction_en"] = text
                stats["updated"] += 1
                changed = True
        if changed:
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
    parser = argparse.ArgumentParser(
        description="Generate instruction_en translations for items"
    )
    parser.add_argument("--content-dir", default=str(DEFAULT_CONTENT))
    parser.add_argument("--units", default=None, help="Comma list, e.g. 1,2")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--dry-run", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        stats = run_instructions_en(
            content_dir=Path(args.content_dir),
            units=parse_units(args.units),
            limit=args.limit,
            model=args.model,
            dry_run=args.dry_run,
        )
    except InstructionsEnError as exc:
        print(f"error: {exc}")
        return 1
    print(
        "pending={pending} updated={updated} batches={batches} skipped={skipped}".format(
            **stats
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
