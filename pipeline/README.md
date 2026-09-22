# Passaporte pipeline

Python 3.12+ via `uv`.

```bash
uv sync
uv run pytest -q
uv run python rasterize.py --book passaporte-aluno --pages 10-40
```

Requires Poppler (`pdftoppm`) for live rasterize. Unit tests mock subprocess.

No vision/Anthropic calls until `ANTHROPIC_API_KEY` is set and Justice approves calibration run.
