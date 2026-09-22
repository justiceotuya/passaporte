"""Failure log must record soft-fails without inventing answers."""

from __future__ import annotations

import json
from pathlib import Path

from failures import append_failure
from join import join_runs


def _write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


def test_append_failure_writes_jsonl(tmp_path: Path) -> None:
    target = tmp_path / "failures.jsonl"
    append_failure({"stage": "extract", "page": 23, "error": "boom"}, path=target)
    append_failure({"stage": "join", "page": 10, "error": "missing"}, path=target)
    rows = [json.loads(line) for line in target.read_text().splitlines()]
    assert len(rows) == 2
    assert rows[0]["stage"] == "extract"
    assert "at" in rows[0]


def test_join_exercise_only_does_not_invent_answers(tmp_path: Path) -> None:
    aluno = tmp_path / "aluno"
    prof = tmp_path / "prof"
    failures = tmp_path / "failures.jsonl"
    _write(
        aluno / "p-010.json",
        {
            "page": 10,
            "unit": 1,
            "exercises": [
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
                }
            ],
        },
    )
    _write(
        prof / "p-001.json",
        {
            "page": 1,
            "unit": 1,
            "exercises": [],
        },
    )

    buckets, written = join_runs(
        aluno_dir=aluno,
        professor_dir=prof,
        content_dir=tmp_path / "content",
        report_path=tmp_path / "report.md",
        failures_path=failures,
    )

    assert "p010-B" in buckets.exercise_only
    assert written == []
    assert not (tmp_path / "content" / "u01.json").exists()

    rows = [json.loads(line) for line in failures.read_text().splitlines()]
    assert any(row["stage"] == "join" and "not invented" in row["error"] for row in rows)
