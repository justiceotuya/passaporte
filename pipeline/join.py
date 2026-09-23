"""Join student extracts with teacher keys into draft unit JSON + report.

Match key: (student_page, exercise letter), then align items by item_index.

Teacher keys often cite Livro do Aluno *printed* page numbers, while aluno
extracts use PDF page indices (typically printed − 2). Join remaps claimed
student_page onto aluno pages using letter presence + item-count fit.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from failures import FAILURES_PATH, append_failure
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

ALUNO_RUN = "20260923T002149Z-d2ef0ba5"
PROF_RUN = "20260923T014601Z-db7b1051"

# Printed aluno page → PDF extract page is usually −2; search nearby as well.
DEFAULT_PAGE_OFFSET = -2
PAGE_SEARCH_RADIUS = 5


class JoinError(RuntimeError):
    pass


@dataclass
class JoinBuckets:
    matched: list[str] = field(default_factory=list)
    key_only: list[str] = field(default_factory=list)
    exercise_only: list[str] = field(default_factory=list)
    count_mismatch: list[str] = field(default_factory=list)
    empty_key: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class AlunoExerciseIndex:
    """Aluno letter presence and item counts for student_page remapping."""

    letters_by_page: dict[int, set[str]]
    item_counts: dict[tuple[int, str], int]

    def has(self, page: int, letter: str) -> bool:
        return letter in self.letters_by_page.get(page, set())


def load_page_jsons(folder: Path) -> list[dict[str, Any]]:
    pages = []
    for path in sorted(folder.glob("p-*.json")):
        pages.append(json.loads(path.read_text(encoding="utf-8")))
    return pages


def normalise_letter(value: Any) -> str:
    """Uppercase letter labels; keep numbered exercise ids (e.g. '12')."""
    return str(value or "").strip().upper()


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


def build_aluno_exercise_index(aluno_pages: list[dict[str, Any]]) -> AlunoExerciseIndex:
    letters_by_page: dict[int, set[str]] = defaultdict(set)
    item_counts: dict[tuple[int, str], int] = {}
    for page_doc in aluno_pages:
        page = int(page_doc["page"])
        for ex in page_doc.get("exercises", []):
            letter = normalise_letter(ex.get("letter"))
            if not letter:
                continue
            letters_by_page[page].add(letter)
            item_counts[(page, letter)] = len(ex.get("items") or [])
    return AlunoExerciseIndex(
        letters_by_page=dict(letters_by_page),
        item_counts=item_counts,
    )


def load_classify_letter_pages(pages_json: Path | None) -> dict[int, set[str]]:
    """Optional classify/pages.json → page → exercise letters (reinforces remap)."""
    if pages_json is None or not pages_json.is_file():
        return {}
    try:
        data = json.loads(pages_json.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    out: dict[int, set[str]] = {}
    for row in data.get("pages") or []:
        page = row.get("page")
        letters = row.get("exercise_letters") or []
        if page is None:
            continue
        cleaned = {normalise_letter(letter) for letter in letters if normalise_letter(letter)}
        if cleaned:
            out[int(page)] = cleaned
    return out


def merge_classify_into_index(
    index: AlunoExerciseIndex,
    classify_letters: dict[int, set[str]],
) -> AlunoExerciseIndex:
    """Union classify letters onto pages that already exist in the extract index."""
    if not classify_letters:
        return index
    letters_by_page = {page: set(letters) for page, letters in index.letters_by_page.items()}
    for page, letters in classify_letters.items():
        if page in letters_by_page:
            letters_by_page[page].update(letters)
    return AlunoExerciseIndex(
        letters_by_page=letters_by_page,
        item_counts=dict(index.item_counts),
    )


def resolve_student_page(
    claimed: int,
    letter: str,
    key_item_count: int,
    aluno_index: AlunoExerciseIndex,
    *,
    default_offset: int = DEFAULT_PAGE_OFFSET,
    radius: int = PAGE_SEARCH_RADIUS,
) -> int | None:
    """Map a claimed (printed) student_page onto an aluno PDF page for ``letter``.

    Prefers exact item-count matches, then the printed→PDF default offset, then
    proximity to the offset prior / claimed page.
    """
    letter = normalise_letter(letter)
    if not letter:
        return None

    prior = claimed + default_offset
    candidates: list[tuple[tuple[int, int, int], int]] = []
    for page in range(claimed - radius, claimed + radius + 1):
        if page < 1 or not aluno_index.has(page, letter):
            continue
        aluno_count = aluno_index.item_counts.get((page, letter))
        if aluno_count is None:
            count_mismatch = 1  # letter known but no extract count
        elif aluno_count == key_item_count:
            count_mismatch = 0
        else:
            count_mismatch = 2
        rank = (
            count_mismatch,
            abs(page - prior),
            abs(page - claimed),
        )
        candidates.append((rank, page))

    if not candidates:
        return None
    candidates.sort()
    return candidates[0][1]


def _key_answer_count(ex: dict[str, Any]) -> int:
    return sum(1 for item in (ex.get("items") or []) if item.get("answer"))


def align_key_items(
    ex_items: list[dict[str, Any]],
    key_items: list[dict[str, Any]],
) -> dict[int, dict[str, Any]]:
    """Map aluno ``item_index`` → key item that has an answer.

    Order of attempts:
    1. Exact ``item_index`` match
    2. Constant index shift when exact coverage is poor (keys often start at 2)
    3. Positional zip when lengths match and coverage is still poor
    4. Best available exact/shifted hits
    """
    keyed = [
        item
        for item in key_items
        if item.get("answer") and item.get("item_index") is not None
    ]
    by_idx = {int(item["item_index"]): item for item in keyed}
    ex_indices = [int(item.get("item_index") or 1) for item in ex_items]
    if not ex_indices:
        return {}

    exact = {idx: by_idx[idx] for idx in ex_indices if idx in by_idx}
    exact_hits = len(exact)
    if exact_hits == len(ex_indices):
        return exact

    best = exact
    best_hits = exact_hits
    # Only shift when exact coverage is weak — otherwise a partial overlap
    # (aluno 1..6 vs key 2..6) is safer left on exact indices.
    needy = exact_hits < max(1, (len(ex_indices) + 1) // 2)

    if needy and by_idx:
        for delta in range(-5, 6):
            if delta == 0:
                continue
            shifted = {
                idx: by_idx[idx + delta]
                for idx in ex_indices
                if (idx + delta) in by_idx
            }
            hits = len(shifted)
            if hits > best_hits:
                best = shifted
                best_hits = hits
            if hits == len(ex_indices):
                return shifted

    if needy and len(ex_items) == len(keyed) and len(keyed) > best_hits:
        positional: dict[int, dict[str, Any]] = {}
        for ex_item, key_item in zip(
            sorted(ex_items, key=lambda row: int(row.get("item_index") or 1)),
            sorted(keyed, key=lambda row: int(row["item_index"])),
        ):
            positional[int(ex_item.get("item_index") or 1)] = key_item
        return positional

    return best


def index_keys(
    key_pages: list[dict[str, Any]],
    aluno_index: AlunoExerciseIndex | None = None,
    *,
    default_offset: int = DEFAULT_PAGE_OFFSET,
) -> dict[tuple[int, str], dict[str, Any]]:
    """Map (resolved_student_page, letter) → exercise key payload (+ meta).

    When ``aluno_index`` is provided, remaps claimed ``student_page`` onto aluno
    PDF pages. Colliding keys keep the better count/answer fit.
    """
    index: dict[tuple[int, str], dict[str, Any]] = {}
    ranks: dict[tuple[int, str], tuple[int, int, int, int]] = {}

    for page in key_pages:
        page_claimed_pages: list[int] = []
        for ex in page.get("exercises", []):
            raw_sp = ex.get("student_page")
            if raw_sp:
                page_claimed_pages.append(int(raw_sp))

        # Fallback for keys missing student_page: reuse sibling claims on the
        # same answer-key page (median), then remap.
        sibling_claim: int | None = None
        if page_claimed_pages:
            ordered = sorted(page_claimed_pages)
            sibling_claim = ordered[len(ordered) // 2]

        for ex in page.get("exercises", []):
            letter = normalise_letter(ex.get("letter"))
            if not letter:
                continue
            claimed_raw = ex.get("student_page")
            claimed = int(claimed_raw) if claimed_raw else sibling_claim
            if claimed is None:
                continue

            key_count = len(ex.get("items") or [])
            answer_count = _key_answer_count(ex)

            if aluno_index is not None:
                resolved = resolve_student_page(
                    claimed,
                    letter,
                    key_count,
                    aluno_index,
                    default_offset=default_offset,
                )
                if resolved is None:
                    # Keep claimed page so key_only reporting still surfaces orphans.
                    resolved = claimed
            else:
                resolved = claimed

            payload = {
                **ex,
                "letter": letter,
                "student_page": resolved,
                "_claimed_student_page": claimed,
                "_key_book_page": page.get("page"),
                "_key_unit": page.get("unit") or ex.get("unit"),
            }

            aluno_count = (
                aluno_index.item_counts.get((resolved, letter))
                if aluno_index is not None
                else None
            )
            if aluno_count is None:
                count_mismatch = 1
            elif aluno_count == key_count:
                count_mismatch = 0
            else:
                count_mismatch = 2
            prior = claimed + default_offset
            rank = (
                count_mismatch,
                -answer_count,
                abs(resolved - prior),
                abs(resolved - claimed),
            )
            key = (resolved, letter)
            prev = ranks.get(key)
            if prev is not None and prev <= rank:
                continue
            ranks[key] = rank
            index[key] = payload

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
) -> PassaporteItem | None:
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

    # Never invent answers — omit the item when the teacher key is missing.
    if not (key_item and key_item.get("answer")):
        return None

    answer = normalise_answer(str(key_item["answer"]), item_type)
    accepted = [str(a) for a in (key_item.get("accepted") or []) if str(a).strip()]
    answer_source = AnswerSource.TEACHER_BOOK

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
    failures_path: Path | None = None,
    classify_pages_json: Path | None = None,
) -> tuple[JoinBuckets, list[Path]]:
    if not aluno_dir.is_dir():
        raise JoinError(f"Missing aluno extract dir: {aluno_dir}")
    if not professor_dir.is_dir():
        raise JoinError(f"Missing professor extract dir: {professor_dir}")

    fail_log = failures_path or FAILURES_PATH
    aluno_pages = load_page_jsons(aluno_dir)
    key_pages = load_page_jsons(professor_dir)

    aluno_index = build_aluno_exercise_index(aluno_pages)
    classify_path = classify_pages_json
    if classify_path is None:
        # Prefer book-level classify map beside the run folder.
        candidate = aluno_dir.parent / "pages.json"
        if candidate.is_file():
            classify_path = candidate
    aluno_index = merge_classify_into_index(
        aluno_index,
        load_classify_letter_pages(classify_path),
    )

    key_index = index_keys(key_pages, aluno_index)
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
            letter = normalise_letter(ex.get("letter"))
            if not letter:
                continue
            key = key_index.get((page, letter))
            ex_items = list(ex.get("items") or [])
            key_items = list((key or {}).get("items") or [])
            key_by_index = align_key_items(ex_items, key_items)

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
                    append_failure(
                        {
                            "stage": "join",
                            "page": page,
                            "letter": letter,
                            "item_index": idx,
                            "error": "unassigned unit",
                        },
                        path=fail_log,
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
                    append_failure(
                        {
                            "stage": "join",
                            "page": page,
                            "letter": letter,
                            "item_index": idx,
                            "error": str(exc),
                        },
                        path=fail_log,
                    )
                    continue
                if content_item is None:
                    skipped.append(f"{ref}-{idx}: missing teacher answer")
                    append_failure(
                        {
                            "stage": "join",
                            "page": page,
                            "letter": letter,
                            "item_index": idx,
                            "error": "missing teacher key — answer not invented",
                        },
                        path=fail_log,
                    )
                    continue
                items_by_unit[unit].append(content_item)

    for (student_page, letter), meta in key_index.items():
        if (student_page, letter) not in used_keys:
            claimed = meta.get("_claimed_student_page")
            claimed_note = (
                f", claimed p{int(claimed):03d}" if claimed and int(claimed) != student_page else ""
            )
            buckets.key_only.append(
                f"p{student_page:03d}-{letter} (key page {meta.get('_key_book_page')}{claimed_note})"
            )

    content_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    written_names: set[str] = set()
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
        written_names.add(path.name)

    # Drop stale unit files from a prior join that are no longer produced.
    for stale in content_dir.glob("u*.json"):
        if stale.name not in written_names:
            stale.unlink()

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
