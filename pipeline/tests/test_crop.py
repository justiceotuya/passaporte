"""Crop bbox math and WebP output."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

from crop import bbox_to_pixels, crop_to_webp, parse_item_id, run_crop


def test_parse_item_id() -> None:
    assert parse_item_id("pass-u01-p042-H-1") == (42, "H", 1)
    assert parse_item_id("bad") is None


def test_bbox_normalized_xywh() -> None:
    box = bbox_to_pixels([0.1, 0.2, 0.5, 0.25], 1000, 800)
    assert box == (100, 160, 600, 360)


def test_bbox_missing_uses_full_page() -> None:
    assert bbox_to_pixels(None, 640, 480) == (0, 0, 640, 480)


def test_crop_to_webp(tmp_path: Path) -> None:
    page = tmp_path / "page.png"
    Image.new("RGB", (200, 100), color=(20, 40, 60)).save(page)
    dest = tmp_path / "out.webp"
    crop_to_webp(page_image=page, bbox=[0, 0, 0.5, 1.0], dest=dest)
    assert dest.is_file()
    with Image.open(dest) as image:
        assert image.format == "WEBP"
        assert image.size == (100, 100)


def test_run_crop_updates_content(tmp_path: Path) -> None:
    raw = tmp_path / "raw" / "passaporte-aluno"
    raw.mkdir(parents=True)
    Image.new("RGB", (300, 200), color=(90, 10, 10)).save(raw / "p-010.png")

    extract = tmp_path / "extract"
    extract.mkdir()
    (extract / "p-010.json").write_text(
        json.dumps(
            {
                "page": 10,
                "exercises": [
                    {
                        "letter": "A",
                        "items": [
                            {
                                "item_index": 1,
                                "needs_image": True,
                                "bbox": [0.0, 0.0, 0.4, 0.5],
                            }
                        ],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    content = tmp_path / "content"
    content.mkdir()
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
                "topic": "x",
                "instruction": "Escolha.",
                "prompt": "?",
                "options": ["a", "b"],
                "answer": "a",
                "accepted": [],
                "hint_en": "Pending hint generation.",
                "answer_source": "generated",
                "review": {"status": "pending"},
            }
        ],
    }
    (content / "u01.json").write_text(json.dumps(unit), encoding="utf-8")
    crops = tmp_path / "crops"

    stats = run_crop(
        content_dir=content,
        extract_dir=extract,
        raw_dir=tmp_path / "raw",
        crops_dir=crops,
        book="passaporte-aluno",
    )
    assert stats["cropped"] == 1
    assert (crops / "pass-u01-p010-A-1.webp").is_file()
    updated = json.loads((content / "u01.json").read_text())
    assert updated["items"][0]["stimulus_image"] == "crops/pass-u01-p010-A-1.webp"
