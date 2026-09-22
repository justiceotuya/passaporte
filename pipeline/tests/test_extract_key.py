"""Tests for extract_key helpers (API mocked)."""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from extract_key import (
    ExtractKeyError,
    KeyPage,
    extract_keys,
    load_answer_key_pages,
    parse_pages_arg,
)


def test_parse_pages_arg() -> None:
    assert parse_pages_arg("10-12") == [10, 11, 12]


def test_load_answer_key_pages(tmp_path: Path) -> None:
    path = tmp_path / "pages.json"
    path.write_text(
        json.dumps(
            {
                "pages": [
                    {"page": 10, "page_kind": "answer_key", "unit": 1},
                    {"page": 11, "page_kind": "exercises", "unit": 1},
                    {"page": 12, "page_kind": "answer_key", "unit": 2},
                ]
            }
        ),
        encoding="utf-8",
    )
    selected = load_answer_key_pages(path, [10, 11, 12])
    assert [p["page"] for p in selected] == [10, 12]


def test_key_page_validates() -> None:
    page = KeyPage.model_validate(
        {
            "book": "passaporte-professor",
            "page": 34,
            "unit": 1,
            "exercises": [
                {
                    "letter": "h",
                    "skill": "grammar",
                    "student_page": 42,
                    "solution_text": "1. não gosta",
                    "items": [{"item_index": 1, "answer": "não gosta"}],
                }
            ],
        }
    )
    assert page.exercises[0].letter == "H"


def test_extract_keys_writes(tmp_path: Path) -> None:
    extracted = tmp_path / "extracted" / "passaporte-professor"
    extracted.mkdir(parents=True)
    (extracted / "pages.json").write_text(
        json.dumps(
            {
                "pages": [
                    {"page": 34, "page_kind": "answer_key", "unit": 1, "exercise_letters": []}
                ]
            }
        ),
        encoding="utf-8",
    )
    raw = tmp_path / "raw" / "passaporte-professor"
    raw.mkdir(parents=True)
    (raw / "p-034.png").write_bytes(b"png")

    class FakeClient:
        def __init__(self) -> None:
            self.messages = self

        def create(self, **kwargs):  # noqa: ANN003
            payload = {
                "unit": 1,
                "exercises": [
                    {
                        "letter": "A",
                        "skill": "grammar",
                        "student_page": 10,
                        "solution_text": "1. bom dia",
                        "items": [{"item_index": 1, "answer": "bom dia", "accepted": []}],
                    }
                ],
            }
            return SimpleNamespace(
                content=[SimpleNamespace(type="text", text=json.dumps(payload))]
            )

    out = extract_keys(
        book="passaporte-professor",
        pages=[34],
        raw_dir=tmp_path / "raw",
        extracted_dir=tmp_path / "extracted",
        client=FakeClient(),
        model="test-model",
        run_id="keyrun",
        sleep_s=0,
    )
    data = json.loads((out / "p-034.json").read_text())
    assert data["exercises"][0]["items"][0]["answer"] == "bom dia"


def test_extract_keys_requires_pages_json(tmp_path: Path) -> None:
    with pytest.raises(ExtractKeyError, match="Missing"):
        extract_keys(
            book="passaporte-professor",
            pages=[10],
            raw_dir=tmp_path,
            extracted_dir=tmp_path / "extracted",
            client=object(),
        )
