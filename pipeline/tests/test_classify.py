"""Tests for classify helpers (API client mocked)."""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from classify import (
    ClassifyError,
    PageClassification,
    PageKind,
    classify_book,
    extract_json_object,
    parse_pages_arg,
)


def test_extract_json_object_plain() -> None:
    data = extract_json_object('{"unit": 1, "page_kind": "exercises", "exercise_letters": ["A"]}')
    assert data["unit"] == 1


def test_extract_json_object_fenced() -> None:
    data = extract_json_object(
        '```json\n{"unit": 2, "page_kind": "other", "exercise_letters": []}\n```'
    )
    assert data["page_kind"] == "other"


def test_page_classification_validates_letters() -> None:
    item = PageClassification(
        page=10,
        unit=1,
        page_kind=PageKind.EXERCISES,
        exercise_letters=["a", "B"],
    )
    assert item.exercise_letters == ["A", "B"]


def test_page_classification_drops_non_letter_tokens() -> None:
    item = PageClassification(
        page=10,
        unit=1,
        page_kind=PageKind.EXERCISES,
        exercise_letters=["AB", "5", "6", "C", ""],
    )
    assert item.exercise_letters == ["C"]


def test_parse_pages_arg_range() -> None:
    assert parse_pages_arg("10-12", [9, 10, 11, 12, 13]) == [10, 11, 12]


def test_classify_book_writes_pages_json(tmp_path: Path) -> None:
    raw = tmp_path / "raw"
    thumbs = raw / "passaporte-aluno" / "thumbs"
    thumbs.mkdir(parents=True)
    (thumbs / "p-010.png").write_bytes(b"fake-png")
    (thumbs / "p-011.png").write_bytes(b"fake-png")

    class FakeClient:
        def __init__(self) -> None:
            self.messages = self

        def create(self, **kwargs):  # noqa: ANN003
            page_hint = "10" if "10" in kwargs["messages"][0]["content"][1]["text"] else "11"
            payload = {
                "unit": 1,
                "page_kind": "exercises",
                "exercise_letters": ["A"] if page_hint == "10" else ["B"],
            }
            return SimpleNamespace(
                content=[SimpleNamespace(type="text", text=json.dumps(payload))]
            )

    out = tmp_path / "extracted"
    dest = classify_book(
        book="passaporte-aluno",
        pages=[10, 11],
        raw_dir=raw,
        out_dir=out,
        client=FakeClient(),
        model="test-model",
        sleep_s=0,
    )
    assert dest.is_file()
    data = json.loads(dest.read_text())
    assert data["book"] == "passaporte-aluno"
    assert len(data["pages"]) == 2
    assert data["pages"][0]["exercise_letters"] == ["A"]


def test_classify_book_unknown_raises() -> None:
    with pytest.raises(ClassifyError):
        classify_book(book="nope", pages=[1], client=object())
