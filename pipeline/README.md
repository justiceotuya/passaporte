Python 3.12+ via `uv`.

```bash
uv sync
uv run pytest -q

# Rasterize
uv run python rasterize.py --book passaporte-aluno --pages 10-40
bash ../scripts/rasterize-all.sh

# Classify (needs ANTHROPIC_API_KEY in ../.env)
uv run python classify.py --book passaporte-aluno --pages 10-40
uv run python classify.py --book passaporte-professor --pages 10-40

# Extract exercises from classified pages (150 DPI images)
uv run python extract.py --book passaporte-aluno --pages 10-12
```

Outputs:
- Classify → `extracted/<book>/pages.json`
- Extract → `extracted/<book>/<run_id>/p-NNN.json` (never overwrites)

`extracted/`, `raw/`, and `failures.jsonl` stay gitignored.
