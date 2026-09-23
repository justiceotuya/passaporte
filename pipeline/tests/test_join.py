"""Join alignment edge-case tests."""

from __future__ import annotations

import json
from pathlib import Path

from join import (
    AlunoExerciseIndex,
    align_key_items,
    build_aluno_exercise_index,
    index_keys,
    join_runs,
    make_item_id,
    resolve_student_page,
)


def _write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


def test_make_item_id() -> None:
    assert make_item_id(3, 42, "H", 1) == "pass-u03-p042-H-1"


def test_index_keys_by_student_page_and_letter() -> None:
    pages = [
        {
            "page": 34,
            "unit": 1,
            "exercises": [
                {
                    "letter": "A",
                    "student_page": 10,
                    "items": [{"item_index": 1, "answer": "bom dia"}],
                }
            ],
        }
    ]
    index = index_keys(pages)
    assert (10, "A") in index
    assert index[(10, "A")]["items"][0]["answer"] == "bom dia"


def test_resolve_student_page_prefers_printed_offset() -> None:
    aluno_index = AlunoExerciseIndex(
        letters_by_page={8: {"A", "B"}, 10: {"D", "E"}},
        item_counts={(8, "A"): 1, (8, "B"): 4, (10, "D"): 4, (10, "E"): 1},
    )
    # Teacher cites printed p.10 for A/B which live on PDF p.8
    assert resolve_student_page(10, "A", 1, aluno_index) == 8
    assert resolve_student_page(10, "B", 4, aluno_index) == 8
    # Count fit beats bare offset when both pages expose the letter
    both = AlunoExerciseIndex(
        letters_by_page={8: {"C"}, 10: {"C"}},
        item_counts={(8, "C"): 1, (10, "C"): 5},
    )
    assert resolve_student_page(10, "C", 5, both) == 10


def test_index_keys_remaps_claimed_page_onto_aluno() -> None:
    aluno_index = build_aluno_exercise_index(
        [
            {
                "page": 8,
                "unit": 1,
                "exercises": [
                    {"letter": "A", "items": [{"item_index": 1}]},
                    {
                        "letter": "B",
                        "items": [
                            {"item_index": 1},
                            {"item_index": 2},
                            {"item_index": 3},
                            {"item_index": 4},
                        ],
                    },
                ],
            }
        ]
    )
    key_pages = [
        {
            "page": 17,
            "unit": 1,
            "exercises": [
                {
                    "letter": "A",
                    "student_page": 10,
                    "items": [{"item_index": 1, "answer": "Informal"}],
                },
                {
                    "letter": "B",
                    "student_page": 10,
                    "items": [
                        {"item_index": 1, "answer": "A4"},
                        {"item_index": 2, "answer": "B2"},
                        {"item_index": 3, "answer": "C1"},
                        {"item_index": 4, "answer": "D3"},
                    ],
                },
            ],
        }
    ]
    index = index_keys(key_pages, aluno_index)
    assert (8, "A") in index
    assert (8, "B") in index
    assert (10, "A") not in index
    assert index[(8, "A")]["_claimed_student_page"] == 10


def test_align_key_items_shifts_when_exact_coverage_poor() -> None:
    # Key numbering starts at 1 but aluno items are labeled 3..5 (no overlap).
    ex_items = [{"item_index": 3}, {"item_index": 4}, {"item_index": 5}]
    key_items = [
        {"item_index": 1, "answer": "a"},
        {"item_index": 2, "answer": "b"},
        {"item_index": 3, "answer": "c"},
    ]
    aligned = align_key_items(ex_items, key_items)
    assert aligned[3]["answer"] == "a"
    assert aligned[4]["answer"] == "b"
    assert aligned[5]["answer"] == "c"


def test_align_key_items_keeps_exact_when_mostly_overlapping() -> None:
    ex_items = [{"item_index": i} for i in range(1, 7)]
    key_items = [{"item_index": i, "answer": f"a{i}"} for i in range(2, 7)]
    aligned = align_key_items(ex_items, key_items)
    assert 1 not in aligned
    assert aligned[2]["answer"] == "a2"
    assert aligned[6]["answer"] == "a6"


def test_align_key_items_positional_when_same_length() -> None:
    ex_items = [{"item_index": 1}, {"item_index": 2}]
    key_items = [
        {"item_index": 10, "answer": "first"},
        {"item_index": 20, "answer": "second"},
    ]
    aligned = align_key_items(ex_items, key_items)
    assert aligned[1]["answer"] == "first"
    assert aligned[2]["answer"] == "second"


def test_join_matched_and_buckets(tmp_path: Path) -> None:
    aluno = tmp_path / "aluno"
    prof = tmp_path / "prof"
    content = tmp_path / "content"

    _write(
        aluno / "p-010.json",
        {
            "book": "passaporte-aluno",
            "page": 10,
            "unit": 1,
            "exercises": [
                {
                    "letter": "A",
                    "items": [
                        {
                            "item_index": 1,
                            "type": "choice",
                            "skill": "vocabulary",
                            "topic": "saudações",
                            "instruction": "Escolha.",
                            "prompt": "Bom ___",
                            "options": ["dia", "noite"],
                        }
                    ],
                },
                {
                    "letter": "B",
                    "items": [
                        {
                            "item_index": 1,
                            "type": "true_false",
                            "skill": "grammar",
                            "topic": "ser",
                            "instruction": "V/F",
                            "prompt": "Eu sou.",
                        }
                    ],
                },
                {
                    "letter": "C",
                    "items": [
                        {
                            "item_index": 1,
                            "type": "choice",
                            "skill": "vocabulary",
                            "topic": "x",
                            "instruction": "Escolha.",
                            "prompt": "?",
                            "options": ["a", "b"],
                        },
                        {
                            "item_index": 2,
                            "type": "choice",
                            "skill": "vocabulary",
                            "topic": "x",
                            "instruction": "Escolha.",
                            "prompt": "??",
                            "options": ["c", "d"],
                        },
                    ],
                },
            ],
        },
    )

    _write(
        prof / "p-034.json",
        {
            "book": "passaporte-professor",
            "page": 34,
            "unit": 1,
            "exercises": [
                {
                    "letter": "A",
                    "student_page": 10,
                    "skill": "vocabulary",
                    "items": [{"item_index": 1, "answer": "dia"}],
                },
                {
                    "letter": "C",
                    "student_page": 10,
                    "skill": "vocabulary",
                    "items": [{"item_index": 1, "answer": "a"}],  # count mismatch vs 2 items
                },
                {
                    "letter": "Z",
                    "student_page": 99,
                    "skill": "grammar",
                    "items": [{"item_index": 1, "answer": "solo"}],
                },
            ],
        },
    )

    buckets, written = join_runs(
        aluno_dir=aluno,
        professor_dir=prof,
        content_dir=content,
        report_path=tmp_path / "join_report.md",
    )

    assert "p010-A" in buckets.matched
    assert "p010-B" in buckets.exercise_only
    assert any(row.startswith("p010-C") for row in buckets.count_mismatch)
    assert any(row.startswith("p099-Z") for row in buckets.key_only)
    assert written
    unit = json.loads((content / "u01.json").read_text())
    assert unit["unit"] == 1
    ids = {item["id"] for item in unit["items"]}
    assert "pass-u01-p010-A-1" in ids
    a_item = next(i for i in unit["items"] if i["id"] == "pass-u01-p010-A-1")
    assert a_item["answer"] == "dia"
    assert a_item["answer_source"] == "teacher_book"


def test_join_remaps_printed_page_and_writes_items(tmp_path: Path) -> None:
    aluno = tmp_path / "aluno"
    prof = tmp_path / "prof"
    _write(
        aluno / "p-008.json",
        {
            "page": 8,
            "unit": 1,
            "exercises": [
                {
                    "letter": "B",
                    "items": [
                        {
                            "item_index": 1,
                            "type": "match",
                            "skill": "vocabulary",
                            "topic": "diálogos",
                            "instruction": "Relacione.",
                            "prompt": "A",
                            "pairs": [{"left": "A", "right": "4"}],
                        },
                        {
                            "item_index": 2,
                            "type": "match",
                            "skill": "vocabulary",
                            "topic": "diálogos",
                            "instruction": "Relacione.",
                            "prompt": "B",
                            "pairs": [{"left": "B", "right": "2"}],
                        },
                    ],
                }
            ],
        },
    )
    _write(
        prof / "p-017.json",
        {
            "page": 17,
            "unit": 1,
            "exercises": [
                {
                    "letter": "B",
                    "student_page": 10,  # printed page; PDF is 8
                    "items": [
                        {"item_index": 1, "answer": "A4"},
                        {"item_index": 2, "answer": "B2"},
                    ],
                }
            ],
        },
    )
    buckets, _ = join_runs(
        aluno_dir=aluno,
        professor_dir=prof,
        content_dir=tmp_path / "content",
        report_path=tmp_path / "report.md",
    )
    assert "p008-B" in buckets.matched
    unit = json.loads((tmp_path / "content" / "u01.json").read_text())
    assert {i["id"] for i in unit["items"]} == {
        "pass-u01-p008-B-1",
        "pass-u01-p008-B-2",
    }


def test_missing_item_alignment_omits_and_logs_failure(tmp_path: Path) -> None:
    aluno = tmp_path / "aluno"
    prof = tmp_path / "prof"
    failures = tmp_path / "failures.jsonl"
    _write(
        aluno / "p-012.json",
        {
            "page": 12,
            "unit": 2,
            "exercises": [
                {
                    "letter": "A",
                    "items": [
                        {
                            "item_index": 1,
                            "type": "choice",
                            "skill": "grammar",
                            "topic": "t",
                            "instruction": "x",
                            "prompt": "y",
                            "options": ["one", "two"],
                        },
                        {
                            "item_index": 2,
                            "type": "choice",
                            "skill": "grammar",
                            "topic": "t",
                            "instruction": "x",
                            "prompt": "z",
                            "options": ["three", "four"],
                        },
                    ],
                }
            ],
        },
    )
    _write(
        prof / "p-001.json",
        {
            "page": 1,
            "unit": 2,
            "exercises": [
                {
                    "letter": "A",
                    "student_page": 12,
                    "items": [{"item_index": 1, "answer": "one"}],
                }
            ],
        },
    )
    buckets, _ = join_runs(
        aluno_dir=aluno,
        professor_dir=prof,
        content_dir=tmp_path / "content",
        report_path=tmp_path / "report.md",
        failures_path=failures,
    )
    assert buckets.count_mismatch
    unit = json.loads((tmp_path / "content" / "u02.json").read_text())
    by_id = {i["id"]: i for i in unit["items"]}
    assert by_id["pass-u02-p012-A-1"]["answer_source"] == "teacher_book"
    assert "pass-u02-p012-A-2" not in by_id
    lines = [json.loads(line) for line in failures.read_text().splitlines() if line.strip()]
    assert any(
        row["stage"] == "join"
        and row["item_index"] == 2
        and "not invented" in row["error"]
        for row in lines
    )
