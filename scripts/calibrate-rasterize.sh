#!/usr/bin/env bash
# Live calibration rasterize — Passaporte pages 10–40 (aluno + professor).
# Requires poppler (`pdftoppm`). Output stays under raw/ (gitignored).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/pipeline"

uv run python rasterize.py --book passaporte-aluno --pages 10-40
uv run python rasterize.py --book passaporte-professor --pages 10-40

echo "Calibration rasters ready:"
echo "  $ROOT/raw/passaporte-aluno/p-010.png … p-040.png"
echo "  $ROOT/raw/passaporte-professor/p-010.png … p-040.png"
