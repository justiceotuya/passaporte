"""Hint generation helpers and answer-leak checks."""

from __future__ import annotations

import json
from pathlib import Path

from hints import (
    apply_batch_hints,
    hint_contains_answer,
    needs_hint,
    run_hints,
)


def test_hint_contains_answer_blocks_exact_and_accents() -> None:
    assert hint_contains_answer("Use bom dia in the morning.", ["Bom dia"])
    assert hint_contains_answer("Remember: café.", ["cafe"])
    assert not hint_contains_answer(
        "Morning greetings use a daytime form.", ["Bom dia"]
    )


def test_hint_contains_answer_ignores_tiny_tokens() -> None:
    assert not hint_contains_answer("Pick the formal option.", ["a"])


def test_apply_batch_rejects_answer_leak() -> None:
    items = [
        {
            "id": "pass-u01-p010-A-1",
            "answer": "Bom dia",
            "accepted": [],
            "type": "choice",
        }
    ]
    accepted, rejected = apply_batch_hints(
        items,
        {"pass-u01-p010-A-1": "Say Bom dia before noon."},
    )
    assert accepted == {}
    assert rejected == ["pass-u01-p010-A-1"]

    accepted, rejected = apply_batch_hints(
        items,
        {"pass-u01-p010-A-1": "Use the daytime greeting before midday."},
    )
    assert "pass-u01-p010-A-1" in accepted
    assert rejected == []


def test_needs_hint_only_closed_pending(tmp_path: Path) -> None:
    assert needs_hint(
        {
            "type": "choice",
            "hint_en": "Pending hint generation.",
        }
    )
    assert not needs_hint({"type": "open", "hint_en": "Pending hint generation."})
    assert not needs_hint(
        {"type": "choice", "hint_en": "Use the daytime greeting before midday."}
    )


def test_run_hints_dry_run_counts(tmp_path: Path) -> None:
    unit = {
        "book": "passaporte",
        "unit": 1,
        "title": "Test",
        "topics": ["t"],
        "items": [
            {
                "id": "pass-u01-p010-A-1",
                "book": "passaporte",
                "unit": 1,
                "page": 10,
                "exercise": "A",
                "type": "choice",
                "skill": "vocabulary",
                "topic": "saudações",
                "instruction": "Escolha.",
                "prompt": "Manhã:",
                "options": ["Bom dia", "Boa noite"],
                "answer": "Bom dia",
                "accepted": [],
                "hint_en": "Pending hint generation.",
                "answer_source": "generated",
                "review": {"status": "pending"},
            }
        ],
    }
    path = tmp_path / "u01.json"
    path.write_text(json.dumps(unit), encoding="utf-8")
    stats = run_hints(content_dir=tmp_path, dry_run=True)
    assert stats["pending"] == 1
    assert stats["updated"] == 0
