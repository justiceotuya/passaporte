"""Join student extracts with teacher keys into draft unit JSON + report.

Match key: (student_page, exercise letter), then align items by item_index.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from models import (
    AnswerSource,
    BookId,
    ItemType,
    PassaporteItem,
    PassaporteUnit,
    Review,
    ReviewStatus,
    Skill,
)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXTRACTED = ROOT / "extracted"
DEFAULT_CONTENT = ROOT / "content" / "passaporte"

ALUNO_RUN = "20260922T163925Z-0b8f810b"
PROF_RUN = "20260922T164242Z-833219b4"


class JoinError(RuntimeError):
    pass


@dataclass
class JoinBuckets:
    matched: list[str] = field(default_factory=list)
    key_only: list[str] = field(default_factory=list)
    exercise_only: list[str] = field(default_factory=list)
    count_mismatch: list[str] = field(default_factory=list)
    empty_key: list[str] = field(default_factory=list)


def load_page_jsons(folder: Path) -> list[dict[str, Any]]:
    pages = []
    for path in sorted(folder.glob("p-*.json")):
        pages.append(json.loads(path.read_text(encoding="utf-8")))
    return pages


def skill_from_str(value: str | None) -> Skill:
    raw = (value or "other").strip().lower()
    mapping = {
        "grammar": Skill.GRAMMAR,
        "gramática": Skill.GRAMMAR,
        "gramatica": Skill.GRAMMAR,
        "vocabulary": Skill.VOCABULARY,
        "vocabulário": Skill.VOCABULARY,
        "vocabulario": Skill.VOCABULARY,
        "reading": Skill.READING,
        "leitura": Skill.READING,
        "listening": Skill.LISTENING,
        "audição": Skill.LISTENING,
        "audicao": Skill.LISTENING,
        "other": Skill.OTHER,
    }
    return mapping.get(raw, Skill.OTHER)


def type_from_str(value: str | None) -> ItemType:
    raw = (value or "open").strip().lower()
    try:
        return ItemType(raw)
    except ValueError:
        return ItemType.OPEN


def normalise_answer(value: str, item_type: ItemType) -> str:
    text = value.strip()
    if item_type == ItemType.TRUE_FALSE:
        low = text.lower()
        if low in {"true", "verdadeiro", "v", "t", "yes", "sim"}:
            return "true"
        if low in {"false", "falso", "f", "no", "não", "nao"}:
            return "false"
    return text


def make_item_id(unit: int, page: int, letter: str, item_index: int) -> str:
    return f"pass-u{unit:02d}-p{page:03d}-{letter}-{item_index}"


def index_keys(
    key_pages: list[dict[str, Any]],
) -> dict[tuple[int, str], dict[str, Any]]:
    """Map (student_page, letter) → exercise key payload (+ meta)."""
    index: dict[tuple[int, str], dict[str, Any]] = {}
    for page in key_pages:
        for ex in page.get("exercises", []):
            student_page = ex.get("student_page")
            letter = str(ex.get("letter", "")).strip().upper()
            if not student_page or not letter:
                continue
            index[(int(student_page), letter)] = {
                **ex,
                "_key_book_page": page.get("page"),
                "_key_unit": page.get("unit") or ex.get("unit"),
            }
    return index


def build_page_unit_map(
    aluno_pages: list[dict[str, Any]],
    key_index: dict[tuple[int, str], dict[str, Any]],
) -> dict[int, int]:
    """Best-effort student_page → unit from keys, then aluno, then fill gaps."""
    page_units: dict[int, int] = {}

    for (student_page, _), meta in key_index.items():
        for candidate in (meta.get("_key_unit"), meta.get("unit")):
            if candidate:
                page_units.setdefault(int(student_page), int(candidate))
                break

    for page_doc in aluno_pages:
        page = int(page_doc["page"])
        if page_doc.get("unit") and page not in page_units:
            page_units[page] = int(page_doc["unit"])

    if not page_units:
        return page_units

    all_pages = sorted({int(p["page"]) for p in aluno_pages} | set(page_units))
    last: int | None = None
    forward: dict[int, int] = {}
    for page in all_pages:
        if page in page_units:
            last = page_units[page]
        if last is not None:
            forward[page] = last

    last = None
    for page in reversed(all_pages):
        if page in page_units:
            last = page_units[page]
        if page not in forward and last is not None:
            forward[page] = last
        elif page in page_units:
            forward[page] = page_units[page]
        elif last is not None and page not in forward:
            forward[page] = last

    # Prefer explicit map entries over fill.
    forward.update(page_units)
    return forward


def resolve_unit(
    page: int,
    exercise_page_unit: int | None,
    key_meta: dict[str, Any] | None,
    page_units: dict[int, int],
) -> int | None:
    # Key unit is usually more reliable than noisy page classification.
    if key_meta:
        for candidate in (key_meta.get("_key_unit"), key_meta.get("unit")):
            if candidate:
                return int(candidate)
    if exercise_page_unit:
        return int(exercise_page_unit)
    return page_units.get(page)


def _clean_str_list(value: Any) -> list[str] | None:
    if not isinstance(value, list):
        return None
    cleaned = [str(s).strip() for s in value if str(s).strip()]
    return cleaned or None


def _clean_pairs(value: Any) -> list[dict[str, str]] | None:
    if not isinstance(value, list):
        return None
    pairs: list[dict[str, str]] = []
    for row in value:
        if not isinstance(row, dict):
            continue
        left = str(row.get("left") or "").strip()
        right = str(row.get("right") or "").strip()
        if left and right:
            pairs.append({"left": left, "right": right})
    return pairs or None


def build_content_item(
    *,
    unit: int,
    page: int,
    letter: str,
    item: dict[str, Any],
    key_item: dict[str, Any] | None,
    key_meta: dict[str, Any] | None,
) -> PassaporteItem:
    item_type = type_from_str(item.get("type"))
    skill = skill_from_str(item.get("skill") or (key_meta or {}).get("skill"))
    topic = (item.get("topic") or "unknown").strip() or "unknown"
    item_index = int(item.get("item_index") or 1)
    options = _clean_str_list(item.get("options"))
    pairs = _clean_pairs(item.get("pairs"))
    sequence = _clean_str_list(item.get("sequence"))
    transcript = (item.get("transcript") or None) and str(item.get("transcript")).strip() or None

    # Downgrade invalid closed shapes so the unit file still validates.
    if item_type == ItemType.CHOICE and (not options or len(options) < 2):
        item_type = ItemType.OPEN
        options = None
    if item_type == ItemType.LISTEN_CHOICE and (
        not options or len(options) < 2 or not transcript
    ):
        item_type = ItemType.OPEN
        options = None
    if item_type == ItemType.MATCH and not pairs:
        item_type = ItemType.OPEN
    if item_type == ItemType.ORDER and (not sequence or len(sequence) < 2):
        item_type = ItemType.OPEN
        sequence = None

    if key_item and key_item.get("answer"):
        answer = normalise_answer(str(key_item["answer"]), item_type)
        accepted = [str(a) for a in (key_item.get("accepted") or []) if str(a).strip()]
        answer_source = AnswerSource.TEACHER_BOOK
    else:
        # Placeholder so closed items validate; hints/join review will fix.
        if options:
            answer = options[0]
        elif item_type == ItemType.TRUE_FALSE:
            answer = "true"
        elif pairs:
            answer = pairs
        elif sequence:
            answer = sequence
        else:
            answer = "PENDING"
        accepted = []
        answer_source = AnswerSource.GENERATED

    if item_type == ItemType.TRUE_FALSE and answer not in ("true", "false"):
        answer = normalise_answer(str(answer), ItemType.TRUE_FALSE)
        if answer not in ("true", "false"):
            item_type = ItemType.OPEN

    payload: dict[str, Any] = {
        "id": make_item_id(unit, page, letter, item_index),
        "book": BookId.PASSAPORTE,
        "unit": unit,
        "page": page,
        "exercise": letter,
        "type": item_type,
        "skill": skill,
        "topic": topic,
        "instruction": (item.get("instruction") or "—").strip() or "—",
        "prompt": (item.get("prompt") or "—").strip() or "—",
        "options": options,
        "pairs": pairs,
        "sequence": sequence,
        "transcript": transcript,
        "answer": answer,
        "accepted": accepted,
        "hint_en": "Pending hint generation.",
        "stimulus_image": None,
        "answer_source": answer_source,
        "review": Review(
            status=ReviewStatus.PENDING,
            by="join",
            at=datetime.now(timezone.utc).isoformat(),
        ),
    }
    return PassaporteItem.model_validate(payload)


def join_runs(
    *,
    aluno_dir: Path,
    professor_dir: Path,
    content_dir: Path = DEFAULT_CONTENT,
    report_path: Path | None = None,
) -> tuple[JoinBuckets, list[Path]]:
    if not aluno_dir.is_dir():
        raise JoinError(f"Missing aluno extract dir: {aluno_dir}")
    if not professor_dir.is_dir():
        raise JoinError(f"Missing professor extract dir: {professor_dir}")

    aluno_pages = load_page_jsons(aluno_dir)
    key_pages = load_page_jsons(professor_dir)
    key_index = index_keys(key_pages)
    page_units = build_page_unit_map(aluno_pages, key_index)
    buckets = JoinBuckets()

    # Track which key exercises were used
    used_keys: set[tuple[int, str]] = set()
    items_by_unit: dict[int, list[PassaporteItem]] = defaultdict(list)
    unassigned: list[dict[str, Any]] = []
    skipped: list[str] = []

    for page_doc in aluno_pages:
        page = int(page_doc["page"])
        page_unit = page_doc.get("unit")
        for ex in page_doc.get("exercises", []):
            letter = str(ex.get("letter", "")).strip().upper()
            if not letter:
                continue
            key = key_index.get((page, letter))
            ex_items = list(ex.get("items") or [])
            key_items = list((key or {}).get("items") or [])
            key_by_index = {
                int(i["item_index"]): i
                for i in key_items
                if i.get("item_index") is not None and i.get("answer")
            }

            unit = resolve_unit(page, page_unit, key, page_units)
            ref = f"p{page:03d}-{letter}"

            if key is None:
                buckets.exercise_only.append(ref)
            else:
                used_keys.add((page, letter))
                if not key_items:
                    buckets.empty_key.append(ref)
                elif len(ex_items) != len(key_items):
                    buckets.count_mismatch.append(
                        f"{ref} exercises={len(ex_items)} keys={len(key_items)}"
                    )
                else:
                    buckets.matched.append(ref)

            for item in ex_items:
                idx = int(item.get("item_index") or 1)
                key_item = key_by_index.get(idx)
                if unit is None:
                    unassigned.append(
                        {"ref": f"{ref}-{idx}", "page": page, "letter": letter, "item": item}
                    )
                    continue
                try:
                    content_item = build_content_item(
                        unit=unit,
                        page=page,
                        letter=letter,
                        item=item,
                        key_item=key_item,
                        key_meta=key,
                    )
                except Exception as exc:  # noqa: BLE001 — surface in report, keep joining
                    skipped.append(f"{ref}-{idx}: {exc}")
                    continue
                items_by_unit[unit].append(content_item)

    for (student_page, letter), meta in key_index.items():
        if (student_page, letter) not in used_keys:
            buckets.key_only.append(f"p{student_page:03d}-{letter} (key page {meta.get('_key_book_page')})")

    content_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for unit, items in sorted(items_by_unit.items()):
        # Dedupe by id (keep first)
        seen: set[str] = set()
        unique: list[PassaporteItem] = []
        for item in items:
            if item.id in seen:
                continue
            seen.add(item.id)
            unique.append(item)

        unit_doc = PassaporteUnit(
            book=BookId.PASSAPORTE,
            unit=unit,
            title=f"Unidade {unit} (draft join)",
            topics=sorted({i.topic for i in unique}),
            items=unique,
        )
        path = content_dir / f"u{unit:02d}.json"
        path.write_text(
            unit_doc.model_dump_json(indent=2, exclude_none=True),
            encoding="utf-8",
        )
        written.append(path)

    report_path = report_path or (aluno_dir.parent / "join_report.md")
    report_path.write_text(
        render_report(buckets, written, unassigned, items_by_unit, skipped, page_units),
        encoding="utf-8",
    )
    return buckets, written


def render_report(
    buckets: JoinBuckets,
    written: list[Path],
    unassigned: list[dict[str, Any]],
    items_by_unit: dict[int, list[PassaporteItem]],
    skipped: list[str],
    page_units: dict[int, int],
) -> str:
    lines = [
        "# Join report",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        "## Summary",
        "",
        f"- matched: **{len(buckets.matched)}**",
        f"- count_mismatch: **{len(buckets.count_mismatch)}**",
        f"- empty_key: **{len(buckets.empty_key)}**",
        f"- exercise_only: **{len(buckets.exercise_only)}**",
        f"- key_only: **{len(buckets.key_only)}**",
        f"- unassigned unit items: **{len(unassigned)}**",
        f"- skipped validation: **{len(skipped)}**",
        f"- unit files written: **{len(written)}**",
        "",
        "## Items per unit",
        "",
    ]
    for unit, items in sorted(items_by_unit.items()):
        teacher = sum(1 for i in items if i.answer_source == AnswerSource.TEACHER_BOOK)
        generated = sum(1 for i in items if i.answer_source == AnswerSource.GENERATED)
        lines.append(f"- u{unit:02d}: {len(items)} items (teacher_book={teacher}, generated={generated})")

    lines.extend(["", "## Page → unit map (resolved)", ""])
    for page in sorted(page_units):
        lines.append(f"- p{page:03d} → u{page_units[page]:02d}")

    def section(title: str, rows: list[str]) -> None:
        lines.extend(["", f"## {title}", ""])
        if not rows:
            lines.append("_none_")
            return
        for row in rows:
            lines.append(f"- `{row}`")

    section("matched", buckets.matched)
    section("count_mismatch", buckets.count_mismatch)
    section("empty_key", buckets.empty_key)
    section("exercise_only", buckets.exercise_only)
    section("key_only", buckets.key_only)
    section("unassigned (no unit)", [u["ref"] for u in unassigned])
    section("skipped validation", skipped)
    lines.append("")
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Join extracts with teacher keys")
    parser.add_argument(
        "--aluno-run",
        default=str(DEFAULT_EXTRACTED / "passaporte-aluno" / ALUNO_RUN),
    )
    parser.add_argument(
        "--professor-run",
        default=str(DEFAULT_EXTRACTED / "passaporte-professor" / PROF_RUN),
    )
    parser.add_argument(
        "--content-dir",
        default=str(DEFAULT_CONTENT),
    )
    parser.add_argument(
        "--report",
        default=None,
        help="Path for join_report.md",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    report = Path(args.report) if args.report else ROOT / "extracted" / "join_report.md"
    try:
        buckets, written = join_runs(
            aluno_dir=Path(args.aluno_run),
            professor_dir=Path(args.professor_run),
            content_dir=Path(args.content_dir),
            report_path=report,
        )
    except JoinError as exc:
        print(f"error: {exc}")
        return 1

    print(
        f"matched={len(buckets.matched)} mismatch={len(buckets.count_mismatch)} "
        f"empty_key={len(buckets.empty_key)} "
        f"exercise_only={len(buckets.exercise_only)} key_only={len(buckets.key_only)}"
    )
    for path in written:
        print(f"wrote {path}")
    print(f"report {report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
