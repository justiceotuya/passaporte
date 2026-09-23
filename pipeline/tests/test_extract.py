"""Tests for extract helpers (API mocked)."""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from extract import (
    ExtractError,
    ExtractedPage,
    _merge_extracted_exercises,
    extract_book,
    extract_json_object,
    load_exercise_pages,
    parse_pages_arg,
)


def test_extract_json_object() -> None:
    data = extract_json_object('{"unit": 1, "exercises": []}')
    assert data["unit"] == 1


def test_parse_pages_arg() -> None:
    assert parse_pages_arg("10-12") == [10, 11, 12]
    assert parse_pages_arg(None) is None


def test_load_exercise_pages(tmp_path: Path) -> None:
    pages = {
        "book": "passaporte-aluno",
        "pages": [
            {"page": 10, "page_kind": "exercises", "unit": 1, "exercise_letters": ["A"]},
            {"page": 11, "page_kind": "grammar_ref", "unit": 1, "exercise_letters": []},
            {"page": 12, "page_kind": "exercises", "unit": 2, "exercise_letters": ["B"]},
        ],
    }
    path = tmp_path / "pages.json"
    path.write_text(json.dumps(pages), encoding="utf-8")
    selected = load_exercise_pages(path, [10, 11, 12])
    assert [p["page"] for p in selected] == [10, 12]


def test_extracted_page_validates() -> None:
    page = ExtractedPage.model_validate(
        {
            "book": "passaporte-aluno",
            "page": 10,
            "unit": 1,
            "exercises": [
                {
                    "letter": "a",
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
                }
            ],
        }
    )
    assert page.exercises[0].letter == "A"


def test_extracted_page_accepts_numbered_letters_and_coerces_bbox_skill() -> None:
    page = ExtractedPage.model_validate(
        {
            "book": "passaporte-aluno",
            "page": 222,
            "unit": 12,
            "exercises": [
                {
                    "letter": "5",
                    "items": [
                        {
                            "item_index": 1,
                            "type": "fill_blank",
                            "skill": "writing",
                            "topic": "verbs",
                            "instruction": "Complete.",
                            "prompt": "Eu ___",
                            "bbox": 1,
                        }
                    ],
                }
            ],
        }
    )
    assert page.exercises[0].letter == "5"
    assert page.exercises[0].items[0].skill == "other"
    assert page.exercises[0].items[0].bbox is None


def test_merge_extracted_exercises_dedupes_letters() -> None:
    item = {
        "item_index": 1,
        "type": "open",
        "skill": "other",
        "topic": "t",
        "instruction": "i",
        "prompt": "p",
    }
    first = ExtractedPage.model_validate(
        {
            "book": "passaporte-aluno",
            "page": 116,
            "unit": 17,
            "exercises": [{"letter": "A", "items": [item]}],
        }
    )
    second = ExtractedPage.model_validate(
        {
            "book": "passaporte-aluno",
            "page": 116,
            "unit": 17,
            "exercises": [
                {"letter": "A", "items": [{**item, "prompt": "newer"}]},
                {"letter": "B", "items": [item]},
            ],
        }
    )
    merged = _merge_extracted_exercises(
        [first, second], book="passaporte-aluno", page=116, unit_hint=17
    )
    assert [ex.letter for ex in merged.exercises] == ["A", "B"]
    assert merged.exercises[0].items[0].prompt == "newer"


def test_extract_book_writes_run(tmp_path: Path) -> None:
    extracted = tmp_path / "extracted" / "passaporte-aluno"
    extracted.mkdir(parents=True)
    (extracted / "pages.json").write_text(
        json.dumps(
            {
                "book": "passaporte-aluno",
                "pages": [
                    {
                        "page": 10,
                        "page_kind": "exercises",
                        "unit": 1,
                        "exercise_letters": ["A"],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    raw = tmp_path / "raw" / "passaporte-aluno"
    raw.mkdir(parents=True)
    (raw / "p-010.png").write_bytes(b"png")

    class FakeClient:
        def __init__(self) -> None:
            self.messages = self

        def create(self, **kwargs):  # noqa: ANN003
            payload = {
                "unit": 1,
                "exercises": [
                    {
                        "letter": "A",
                        "items": [
                            {
                                "item_index": 1,
                                "type": "choice",
                                "skill": "vocabulary",
                                "topic": "test",
                                "instruction": "Escolha.",
                                "prompt": "X ___",
                                "options": ["a", "b"],
                                "needs_image": False,
                            }
                        ],
                    }
                ],
            }
            return SimpleNamespace(
                content=[SimpleNamespace(type="text", text=json.dumps(payload))]
            )

    out = extract_book(
        book="passaporte-aluno",
        pages=[10],
        raw_dir=tmp_path / "raw",
        extracted_dir=tmp_path / "extracted",
        client=FakeClient(),
        model="test-model",
        run_id="testrun",
        sleep_s=0,
    )
    assert (out / "p-010.json").is_file()
    assert (out / "run.json").is_file()
    data = json.loads((out / "p-010.json").read_text())
    assert data["exercises"][0]["letter"] == "A"


def test_extract_book_requires_pages_json(tmp_path: Path) -> None:
    with pytest.raises(ExtractError, match="Missing"):
        extract_book(
            book="passaporte-aluno",
            pages=[10],
            raw_dir=tmp_path,
            extracted_dir=tmp_path / "extracted",
            client=object(),
        )


def test_extract_never_overwrites(tmp_path: Path) -> None:
    extracted = tmp_path / "extracted" / "passaporte-aluno"
    extracted.mkdir(parents=True)
    (extracted / "pages.json").write_text(
        json.dumps(
            {
                "pages": [
                    {
                        "page": 10,
                        "page_kind": "exercises",
                        "unit": 1,
                        "exercise_letters": ["A"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    run_dir = extracted / "testrun"
    run_dir.mkdir()
    existing = {"book": "passaporte-aluno", "page": 10, "exercises": []}
    (run_dir / "p-010.json").write_text(json.dumps(existing), encoding="utf-8")
    raw = tmp_path / "raw" / "passaporte-aluno"
    raw.mkdir(parents=True)
    (raw / "p-010.png").write_bytes(b"png")

    class Boom:
        def __init__(self) -> None:
            self.messages = self

        def create(self, **kwargs):  # noqa: ANN003
            raise AssertionError("should not call API when file exists")

    out = extract_book(
        book="passaporte-aluno",
        pages=[10],
        raw_dir=tmp_path / "raw",
        extracted_dir=tmp_path / "extracted",
        client=Boom(),
        run_id="testrun",
        sleep_s=0,
    )
    assert json.loads((out / "p-010.json").read_text()) == existing
