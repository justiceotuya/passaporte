#!/usr/bin/env bash
# Full-book rasterize — all pages, all three PDFs.
# Requires poppler (`pdftoppm`). Output stays under raw/ (gitignored).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/pipeline"

for book in passaporte-aluno passaporte-professor valer; do
  echo "=== Rasterizing $book (all pages) ==="
  uv run python rasterize.py --book "$book"
done

echo "Done. Outputs under $ROOT/raw/<book>/ (+ thumbs/)."
