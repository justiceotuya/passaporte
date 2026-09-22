"""Pydantic models generated to match schema/item.schema.json."""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class BookId(str, Enum):
    PASSAPORTE = "passaporte"
    VALER = "valer"


class ItemType(str, Enum):
    CHOICE = "choice"
    FILL_BLANK = "fill_blank"
    MATCH = "match"
    ORDER = "order"
    TRUE_FALSE = "true_false"
    TRANSFORM = "transform"
    LISTEN_CHOICE = "listen_choice"
    OPEN = "open"


class Skill(str, Enum):
    GRAMMAR = "grammar"
    VOCABULARY = "vocabulary"
    READING = "reading"
    LISTENING = "listening"
    OTHER = "other"


class AnswerSource(str, Enum):
    TEACHER_BOOK = "teacher_book"
    STUDENT_BOOK_KEY = "student_book_key"
    GENERATED = "generated"


class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


CLOSED_TYPES = {
    ItemType.CHOICE,
    ItemType.FILL_BLANK,
    ItemType.MATCH,
    ItemType.ORDER,
    ItemType.TRUE_FALSE,
    ItemType.TRANSFORM,
    ItemType.LISTEN_CHOICE,
}


class MatchPair(BaseModel):
    left: str = Field(min_length=1)
    right: str = Field(min_length=1)


class Review(BaseModel):
    status: ReviewStatus
    by: str | None = None
    at: str | None = None
    notes: str | None = None


class PassaporteItem(BaseModel):
    id: str = Field(min_length=1, pattern=r"^[a-z0-9]+-u[0-9]{2}-p[0-9]{3}-[A-Z]-[0-9]+$")
    book: BookId
    unit: int = Field(ge=1)
    page: int = Field(ge=1)
    exercise: str = Field(min_length=1)
    type: ItemType
    skill: Skill
    topic: str = Field(min_length=1)
    instruction: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    options: list[str] | None = None
    pairs: list[MatchPair] | None = None
    sequence: list[str] | None = None
    answer: str | list[str] | list[MatchPair]
    accepted: list[str] = Field(default_factory=list)
    hint_en: str | None = None
    stimulus_image: str | None = None
    transcript: str | None = None
    answer_source: AnswerSource
    review: Review

    @field_validator("options", "sequence")
    @classmethod
    def non_empty_strings(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        if any(not s for s in value):
            raise ValueError("list entries must be non-empty strings")
        return value

    @model_validator(mode="after")
    def enforce_type_rules(self) -> PassaporteItem:
        if self.type in CLOSED_TYPES and (not self.hint_en or not self.hint_en.strip()):
            raise ValueError("hint_en is required for closed item types")

        if self.type == ItemType.CHOICE:
            if not self.options or len(self.options) < 2:
                raise ValueError("choice items require options with at least 2 entries")

        if self.type == ItemType.LISTEN_CHOICE:
            if not self.options or len(self.options) < 2:
                raise ValueError("listen_choice items require options with at least 2 entries")
            if not self.transcript:
                raise ValueError("listen_choice items require transcript")

        if self.type == ItemType.TRUE_FALSE:
            if self.answer not in ("true", "false"):
                raise ValueError("true_false answer must be 'true' or 'false'")

        return self


class PassaporteUnit(BaseModel):
    book: BookId
    unit: int = Field(ge=1)
    title: str = Field(min_length=1)
    topics: list[str] = Field(default_factory=list)
    items: list[PassaporteItem] = Field(min_length=1)
