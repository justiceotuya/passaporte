"""English instruction translation helpers."""

from __future__ import annotations

import json
from pathlib import Path

from instructions_en import (
    apply_batch_translations,
    extract_json_object,
    needs_instruction_en,
    run_instructions_en,
)


def test_needs_instruction_en_skips_existing() -> None:
    assert needs_instruction_en({"instruction": "Escolha a opção correta."})
    assert not needs_instruction_en(
        {
            "instruction": "Escolha a opção correta.",
            "instruction_en": "Choose the correct option.",
        }
    )
    assert not needs_instruction_en({"instruction": "", "instruction_en": ""})
    assert not needs_instruction_en(
        {"instruction": "  ", "instruction_en": "Choose."}
    )


def test_extract_json_object_strips_fences() -> None:
    data = extract_json_object(
        '```json\n{"translations":[{"id":"a","instruction_en":"Hi"}]}\n```'
    )
    assert data["translations"][0]["id"] == "a"


def test_apply_batch_translations_accepts_and_reports_missing() -> None:
    items = [
        {"id": "pass-u01-p010-A-1", "instruction": "Escolha."},
        {"id": "pass-u01-p010-A-2", "instruction": "Complete."},
    ]
    accepted, missing = apply_batch_translations(
        items,
        {"pass-u01-p010-A-1": "Choose.", "unknown": "x"},
    )
    assert accepted == {"pass-u01-p010-A-1": "Choose."}
    assert missing == ["pass-u01-p010-A-2"]


def test_run_instructions_en_dry_run_skips_existing(tmp_path: Path) -> None:
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
                "hint_en": "Use the daytime greeting.",
                "answer_source": "generated",
                "review": {"status": "pending"},
            },
            {
                "id": "pass-u01-p010-A-2",
                "book": "passaporte",
                "unit": 1,
                "page": 10,
                "exercise": "A",
                "type": "choice",
                "skill": "vocabulary",
                "topic": "saudações",
                "instruction": "Escolha.",
                "instruction_en": "Choose.",
                "prompt": "Noite:",
                "options": ["Bom dia", "Boa noite"],
                "answer": "Boa noite",
                "accepted": [],
                "hint_en": "Use the evening greeting.",
                "answer_source": "generated",
                "review": {"status": "pending"},
            },
        ],
    }
    path = tmp_path / "u01.json"
    path.write_text(json.dumps(unit), encoding="utf-8")
    stats = run_instructions_en(content_dir=tmp_path, dry_run=True)
    assert stats["pending"] == 1
    assert stats["skipped"] == 1
    assert stats["updated"] == 0
