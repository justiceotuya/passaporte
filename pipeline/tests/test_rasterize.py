"""Tests for rasterize helpers (no PDF required for unit tests)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from rasterize import (
    BOOK_FILES,
    RasterizeError,
    page_filename,
    parse_pages,
    rasterize_book,
    require_pdftoppm,
)


def test_page_filename_zero_pads() -> None:
    assert page_filename(1) == "p-001.png"
    assert page_filename(40) == "p-040.png"


def test_parse_pages_range() -> None:
    assert parse_pages("10-40") == (10, 40)
    assert parse_pages("12") == (12, 12)
    assert parse_pages(None) == (None, None)


def test_unknown_book_raises(tmp_path: Path) -> None:
    with pytest.raises(RasterizeError, match="Unknown book"):
        rasterize_book(book="nope", pdf_dir=tmp_path, out_dir=tmp_path)


def test_missing_pdf_raises(tmp_path: Path) -> None:
    with pytest.raises(RasterizeError, match="PDF not found"):
        rasterize_book(book="passaporte-aluno", pdf_dir=tmp_path, out_dir=tmp_path)


def test_require_pdftoppm_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("rasterize.shutil.which", lambda _: None)
    with pytest.raises(RasterizeError, match="pdftoppm not found"):
        require_pdftoppm()


def test_rasterize_invokes_pdftoppm(tmp_path: Path) -> None:
    pdf_dir = tmp_path / "pdf"
    pdf_dir.mkdir()
    pdf_path = pdf_dir / BOOK_FILES["passaporte-aluno"]
    pdf_path.write_bytes(b"%PDF-1.4")

    def fake_run(cmd: list[str], capture_output: bool, text: bool) -> MagicMock:
        # last arg is prefix path without extension
        prefix = Path(cmd[-1])
        dest = prefix.parent
        dest.mkdir(parents=True, exist_ok=True)
        (dest / "p-10.png").write_bytes(b"png")
        (dest / "p-11.png").write_bytes(b"png")
        result = MagicMock()
        result.returncode = 0
        result.stderr = ""
        return result

    with patch("rasterize.subprocess.run", side_effect=fake_run):
        with patch("rasterize.require_pdftoppm", return_value="/usr/bin/pdftoppm"):
            out = rasterize_book(
                book="passaporte-aluno",
                pdf_dir=pdf_dir,
                out_dir=tmp_path / "raw",
                first_page=10,
                last_page=11,
            )

    assert (out["pages"] / "p-010.png").is_file()
    assert (out["thumbs"] / "p-010.png").is_file()
