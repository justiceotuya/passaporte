"""Rasterize textbook PDFs to PNG pages (Phase 2).

Uses poppler's ``pdftoppm``. No vision API calls.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF_DIR = ROOT / "raw" / "pdf"
DEFAULT_OUT_DIR = ROOT / "raw"


BOOK_FILES = {
    "passaporte-aluno": "passaporte-aluno.pdf",
    "passaporte-professor": "passaporte-professor.pdf",
    "valer": "portugues-a-valer-1.pdf",
}


class RasterizeError(RuntimeError):
    pass


def require_pdftoppm() -> str:
    path = shutil.which("pdftoppm")
    if not path:
        raise RasterizeError(
            "pdftoppm not found. Install poppler (e.g. `brew install poppler`)."
        )
    return path


def page_filename(page: int) -> str:
    return f"p-{page:03d}.png"


def rasterize_book(
    *,
    book: str,
    pdf_dir: Path = DEFAULT_PDF_DIR,
    out_dir: Path = DEFAULT_OUT_DIR,
    dpi: int = 150,
    thumb_dpi: int = 60,
    first_page: int | None = None,
    last_page: int | None = None,
    pdftoppm_bin: str | None = None,
) -> dict[str, Path]:
    """Rasterize a book PDF into ``raw/<book>/`` and ``raw/<book>/thumbs/``."""
    if book not in BOOK_FILES:
        raise RasterizeError(f"Unknown book '{book}'. Expected one of {sorted(BOOK_FILES)}")

    pdf_path = pdf_dir / BOOK_FILES[book]
    if not pdf_path.is_file():
        raise RasterizeError(f"PDF not found: {pdf_path}")

    bin_path = pdftoppm_bin or require_pdftoppm()
    pages_dir = out_dir / book
    thumbs_dir = pages_dir / "thumbs"
    pages_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    def run(dpi_value: int, dest: Path) -> None:
        prefix = dest / "p"
        cmd = [bin_path, "-png", "-r", str(dpi_value)]
        if first_page is not None:
            cmd += ["-f", str(first_page)]
        if last_page is not None:
            cmd += ["-l", str(last_page)]
        cmd += [str(pdf_path), str(prefix)]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RasterizeError(
                f"pdftoppm failed ({result.returncode}): {result.stderr.strip()}"
            )

        # pdftoppm writes p-1.png or p-01.png depending on version; normalise to p-NNN.png
        for path in dest.glob("p*.png"):
            stem = path.stem
            num = int(stem.split("-")[-1])
            target = dest / page_filename(num)
            if path != target:
                path.replace(target)

    run(dpi, pages_dir)
    run(thumb_dpi, thumbs_dir)

    return {"pages": pages_dir, "thumbs": thumbs_dir}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Rasterize Passaporte PDFs")
    parser.add_argument(
        "--book",
        required=True,
        choices=sorted(BOOK_FILES),
        help="Book key",
    )
    parser.add_argument("--pages", help="Inclusive range, e.g. 10-40", default=None)
    parser.add_argument("--dpi", type=int, default=150)
    parser.add_argument("--thumb-dpi", type=int, default=60)
    return parser


def parse_pages(value: str | None) -> tuple[int | None, int | None]:
    if not value:
        return None, None
    if "-" not in value:
        page = int(value)
        return page, page
    left, right = value.split("-", 1)
    return int(left), int(right)


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    first, last = parse_pages(args.pages)
    try:
        result = rasterize_book(
            book=args.book,
            dpi=args.dpi,
            thumb_dpi=args.thumb_dpi,
            first_page=first,
            last_page=last,
        )
    except RasterizeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(f"Wrote pages → {result['pages']}")
    print(f"Wrote thumbs → {result['thumbs']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
