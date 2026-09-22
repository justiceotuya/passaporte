"""Join alignment edge-case tests."""

from __future__ import annotations

import json
from pathlib import Path

from join import index_keys, join_runs, make_item_id


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


def test_missing_item_alignment_uses_generated(tmp_path: Path) -> None:
    aluno = tmp_path / "aluno"
    prof = tmp_path / "prof"
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
    )
    assert buckets.count_mismatch
    unit = json.loads((tmp_path / "content" / "u02.json").read_text())
    by_id = {i["id"]: i for i in unit["items"]}
    assert by_id["pass-u02-p012-A-1"]["answer_source"] == "teacher_book"
    assert by_id["pass-u02-p012-A-2"]["answer_source"] == "generated"
