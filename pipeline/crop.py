"""Crop stimulus images for items marked needs_image.

Reads bbox from the aluno extract run when present; otherwise falls back to the
full page. Writes WebP files under apps/web/public/crops/ and updates
stimulus_image on matching content items.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from PIL import Image

from models import PassaporteUnit

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

DEFAULT_RAW = ROOT / "raw"
DEFAULT_EXTRACTED = ROOT / "extracted"
DEFAULT_CONTENT = ROOT / "content" / "local" / "passaporte"
DEFAULT_CROPS = ROOT / "apps" / "web" / "public" / "crops"
FAILURES_PATH = ROOT / "failures.jsonl"
ALUNO_RUN = "20260923T002149Z-d2ef0ba5"
BOOK = "passaporte-aluno"

ID_RE = re.compile(
    r"^[a-z0-9]+-u(?P<unit>\d{2})-p(?P<page>\d{3})-(?P<letter>[A-Z])-(?P<index>\d+)$"
)


class CropError(RuntimeError):
    pass


def append_failure(record: dict[str, Any], path: Path = FAILURES_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def parse_item_id(item_id: str) -> tuple[int, str, int] | None:
    match = ID_RE.match(item_id)
    if not match:
        return None
    return int(match.group("page")), match.group("letter"), int(match.group("index"))


def load_extract_index(extract_dir: Path) -> dict[tuple[int, str, int], dict[str, Any]]:
    index: dict[tuple[int, str, int], dict[str, Any]] = {}
    for path in sorted(extract_dir.glob("p-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        page = int(data["page"])
        for ex in data.get("exercises", []):
            letter = str(ex.get("letter", "")).strip().upper()
            for item in ex.get("items", []):
                idx = int(item.get("item_index") or 0)
                if letter and idx:
                    index[(page, letter, idx)] = item
    return index


def bbox_to_pixels(
    bbox: list[float] | None,
    width: int,
    height: int,
) -> tuple[int, int, int, int]:
    """Return (left, top, right, bottom) crop box.

    Supports normalized [x, y, w, h] or [x1, y1, x2, y2] when all values ≤ 1,
    otherwise treats values as pixels. Falls back to the full page.
    """
    if not bbox or len(bbox) != 4:
        return 0, 0, width, height

    a, b, c, d = (float(v) for v in bbox)
    normalized = max(a, b, c, d) <= 1.0

    if normalized:
        # Prefer x,y,w,h when c,d look like sizes; else x1,y1,x2,y2.
        if c <= 1.0 and d <= 1.0 and (a + c) <= 1.05 and (b + d) <= 1.05:
            left = a * width
            top = b * height
            right = (a + c) * width
            bottom = (b + d) * height
        else:
            left = a * width
            top = b * height
            right = c * width
            bottom = d * height
    else:
        # Pixel x,y,w,h vs x1,y1,x2,y2
        if c > a and d > b and c <= width * 1.05 and d <= height * 1.05:
            # Could be either; if c-a and d-b are large relative to a,b treat as x2,y2
            if c > width * 0.2 or d > height * 0.2:
                left, top, right, bottom = a, b, c, d
            else:
                left, top, right, bottom = a, b, a + c, b + d
        else:
            left, top, right, bottom = a, b, a + c, b + d

    left_i = max(0, min(width - 1, int(round(left))))
    top_i = max(0, min(height - 1, int(round(top))))
    right_i = max(left_i + 1, min(width, int(round(right))))
    bottom_i = max(top_i + 1, min(height, int(round(bottom))))
    return left_i, top_i, right_i, bottom_i


def crop_to_webp(
    *,
    page_image: Path,
    bbox: list[float] | None,
    dest: Path,
    quality: int = 80,
) -> None:
    with Image.open(page_image) as image:
        image = image.convert("RGB")
        box = bbox_to_pixels(bbox, image.width, image.height)
        cropped = image.crop(box)
        dest.parent.mkdir(parents=True, exist_ok=True)
        cropped.save(dest, format="WEBP", quality=quality, method=4)


def run_crop(
    *,
    content_dir: Path = DEFAULT_CONTENT,
    extract_dir: Path | None = None,
    raw_dir: Path = DEFAULT_RAW,
    crops_dir: Path = DEFAULT_CROPS,
    book: str = BOOK,
    units: list[int] | None = None,
    limit: int | None = None,
) -> dict[str, int]:
    extract_dir = extract_dir or (DEFAULT_EXTRACTED / book / ALUNO_RUN)
    if not extract_dir.is_dir():
        raise CropError(f"Missing extract dir: {extract_dir}")

    index = load_extract_index(extract_dir)
    stats = {"candidates": 0, "cropped": 0, "skipped": 0, "failed": 0}

    unit_paths = sorted(content_dir.glob("u*.json"))
    cropped_count = 0

    for path in unit_paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        unit_num = int(data.get("unit") or 0)
        if units is not None and unit_num not in units:
            continue

        changed = False
        for item in data.get("items", []):
            parsed = parse_item_id(item["id"])
            if parsed is None:
                continue
            page, letter, idx = parsed
            extract_item = index.get((page, letter, idx))
            if extract_item is None:
                continue
            if not extract_item.get("needs_image"):
                continue

            stats["candidates"] += 1
            if limit is not None and cropped_count >= limit:
                stats["skipped"] += 1
                continue

            if item.get("stimulus_image"):
                crop_path = crops_dir / Path(item["stimulus_image"]).name
                if crop_path.is_file():
                    stats["skipped"] += 1
                    continue

            page_image = raw_dir / book / f"p-{page:03d}.png"
            if not page_image.is_file():
                append_failure(
                    {
                        "stage": "crop",
                        "id": item["id"],
                        "error": f"missing page image {page_image}",
                        "at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                stats["failed"] += 1
                continue

            rel = f"crops/{item['id']}.webp"
            dest = crops_dir / f"{item['id']}.webp"
            try:
                crop_to_webp(
                    page_image=page_image,
                    bbox=extract_item.get("bbox"),
                    dest=dest,
                )
            except Exception as exc:  # noqa: BLE001
                append_failure(
                    {
                        "stage": "crop",
                        "id": item["id"],
                        "error": str(exc),
                        "at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                stats["failed"] += 1
                continue

            item["stimulus_image"] = rel
            changed = True
            stats["cropped"] += 1
            cropped_count += 1

        if changed:
            unit = PassaporteUnit.model_validate(data)
            path.write_text(
                unit.model_dump_json(indent=2, exclude_none=True),
                encoding="utf-8",
            )

    return stats


def parse_units(value: str | None) -> list[int] | None:
    if not value:
        return None
    return [int(part.strip()) for part in value.split(",") if part.strip()]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Crop stimulus images for needs_image items")
    parser.add_argument("--content-dir", default=str(DEFAULT_CONTENT))
    parser.add_argument(
        "--extract-dir",
        default=str(DEFAULT_EXTRACTED / BOOK / ALUNO_RUN),
    )
    parser.add_argument("--raw-dir", default=str(DEFAULT_RAW))
    parser.add_argument("--crops-dir", default=str(DEFAULT_CROPS))
    parser.add_argument("--units", default=None)
    parser.add_argument("--limit", type=int, default=None)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        stats = run_crop(
            content_dir=Path(args.content_dir),
            extract_dir=Path(args.extract_dir),
            raw_dir=Path(args.raw_dir),
            crops_dir=Path(args.crops_dir),
            units=parse_units(args.units),
            limit=args.limit,
        )
    except CropError as exc:
        print(f"error: {exc}")
        return 1
    print(
        f"candidates={stats['candidates']} cropped={stats['cropped']} "
        f"skipped={stats['skipped']} failed={stats['failed']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
