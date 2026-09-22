Python 3.12+ via `uv`.

```bash
uv sync
uv run pytest -q

# Rasterize
uv run python rasterize.py --book passaporte-aluno --pages 10-40
bash ../scripts/rasterize-all.sh

# Classify (needs ANTHROPIC_API_KEY in ../.env)
uv run python classify.py --book passaporte-aluno --pages 10-40
```

Requires Poppler (`pdftoppm`) for rasterize. `extracted/` and `raw/` stay gitignored.
