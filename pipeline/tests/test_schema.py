"""Phase 1 — schema validation exit suite."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

import jsonschema
import pytest
from pydantic import ValidationError

from models import PassaporteItem, PassaporteUnit

ROOT = Path(__file__).resolve().parents[2]
ITEM_SCHEMA_PATH = ROOT / "schema" / "item.schema.json"
UNIT_SCHEMA_PATH = ROOT / "schema" / "unit.schema.json"
FIXTURE_PATH = ROOT / "content" / "passaporte" / "u01.json"

ITEM_SCHEMA = json.loads(ITEM_SCHEMA_PATH.read_text())
UNIT_SCHEMA = json.loads(UNIT_SCHEMA_PATH.read_text())
STORE = jsonschema.Draft202012Validator.META_SCHEMA  # unused; keep registry simple


def _registry() -> jsonschema.Validator:
    """Resolver that can load item.schema.json from unit $ref."""
    from referencing import Registry, Resource

    item_resource = Resource.from_contents(ITEM_SCHEMA)
    unit_resource = Resource.from_contents(UNIT_SCHEMA)
    registry = Registry().with_resources(
        [
            ("https://passaporte.local/schema/item.schema.json", item_resource),
            ("item.schema.json", item_resource),
            ("https://passaporte.local/schema/unit.schema.json", unit_resource),
        ]
    )
    return jsonschema.Draft202012Validator(UNIT_SCHEMA, registry=registry)


@pytest.fixture(scope="module")
def fixture_unit() -> dict:
    return json.loads(FIXTURE_PATH.read_text())


@pytest.fixture(scope="module")
def unit_validator() -> jsonschema.Validator:
    return _registry()


@pytest.fixture(scope="module")
def item_validator() -> jsonschema.Draft202012Validator:
    return jsonschema.Draft202012Validator(ITEM_SCHEMA)


def test_fixture_file_exists() -> None:
    assert FIXTURE_PATH.is_file()


def test_fixture_validates_against_json_schema(
    fixture_unit: dict, unit_validator: jsonschema.Validator
) -> None:
    unit_validator.validate(fixture_unit)


def test_fixture_validates_with_pydantic(fixture_unit: dict) -> None:
    unit = PassaporteUnit.model_validate(fixture_unit)
    assert unit.unit == 1
    assert len(unit.items) >= 15


def test_each_fixture_item_valid(
    fixture_unit: dict, item_validator: jsonschema.Draft202012Validator
) -> None:
    for item in fixture_unit["items"]:
        item_validator.validate(item)
        PassaporteItem.model_validate(item)


def test_missing_id_fails(fixture_unit: dict, item_validator: jsonschema.Draft202012Validator) -> None:
    item = deepcopy(fixture_unit["items"][0])
    del item["id"]
    with pytest.raises(jsonschema.ValidationError):
        item_validator.validate(item)
    with pytest.raises(ValidationError):
        PassaporteItem.model_validate(item)


def test_bad_type_enum_fails(
    fixture_unit: dict, item_validator: jsonschema.Draft202012Validator
) -> None:
    item = deepcopy(fixture_unit["items"][0])
    item["type"] = "essay"
    with pytest.raises(jsonschema.ValidationError):
        item_validator.validate(item)
    with pytest.raises(ValidationError):
        PassaporteItem.model_validate(item)


def test_empty_prompt_fails(
    fixture_unit: dict, item_validator: jsonschema.Draft202012Validator
) -> None:
    item = deepcopy(fixture_unit["items"][0])
    item["prompt"] = ""
    with pytest.raises(jsonschema.ValidationError):
        item_validator.validate(item)
    with pytest.raises(ValidationError):
        PassaporteItem.model_validate(item)


def test_closed_item_missing_hint_fails(
    fixture_unit: dict, item_validator: jsonschema.Draft202012Validator
) -> None:
    item = deepcopy(fixture_unit["items"][0])
    del item["hint_en"]
    with pytest.raises(jsonschema.ValidationError):
        item_validator.validate(item)
    with pytest.raises(ValidationError):
        PassaporteItem.model_validate(item)


def test_choice_without_options_fails(
    fixture_unit: dict, item_validator: jsonschema.Draft202012Validator
) -> None:
    item = deepcopy(next(i for i in fixture_unit["items"] if i["type"] == "choice"))
    del item["options"]
    with pytest.raises(jsonschema.ValidationError):
        item_validator.validate(item)
    with pytest.raises(ValidationError):
        PassaporteItem.model_validate(item)


def test_true_false_bad_answer_fails(
    item_validator: jsonschema.Draft202012Validator,
) -> None:
    # Synthesize — live u01 may not include true_false after full-book join.
    item = {
        "id": "pass-u01-p001-A-1",
        "book": "passaporte",
        "unit": 1,
        "page": 1,
        "exercise": "A",
        "type": "true_false",
        "skill": "grammar",
        "topic": "schema-test",
        "instruction": "Verdadeiro ou falso?",
        "prompt": "Example statement.",
        "answer": "true",
        "accepted": [],
        "hint_en": "Decide from the statement alone.",
        "answer_source": "teacher_book",
        "review": {"status": "pending", "by": "test", "at": "2026-09-23T00:00:00Z"},
    }
    item_validator.validate(item)
    PassaporteItem.model_validate(item)

    bad = deepcopy(item)
    bad["answer"] = "yes"
    with pytest.raises(jsonschema.ValidationError):
        item_validator.validate(bad)
    with pytest.raises(ValidationError):
        PassaporteItem.model_validate(bad)
