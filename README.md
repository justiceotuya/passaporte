# Passaporte monorepo

Private gamified A1 Portuguese trainer. Spec: `../uploads/Passaporte - Gamified A1 Portuguese Design Doc.md`. Design: `../templates/passaporte/`.

## Docs

| File | Purpose |
| --- | --- |
| [PROGRESS.md](./PROGRESS.md) | Done / remaining / handover prompt |
| [TESTING.md](./TESTING.md) | Exit tests per phase |
| [HANDOVER.md](./HANDOVER.md) | How to hand off |

## Layout

```
apps/web/       Next.js app (learner + admin later)
pipeline/       Python extraction (uv)
schema/         Shared item.schema.json
content/        Unit JSON (git-tracked)
gold/           Calibration gold
raw/pdf/        Symlink to textbooks (gitignored)
```

## Setup

```bash
# Node
pnpm install

# Python pipeline
cd pipeline && uv sync && cd ..

# PDFs (if raw/pdf missing)
mkdir -p raw && ln -sfn ../../raw/pdf raw/pdf
```

## Tests

```bash
pnpm test:phase0    # scaffold smoke
pnpm test:phase1    # schema validation (TS + Python)
pnpm pipeline:test  # all pipeline pytest
pnpm web:test       # Vitest in apps/web
```

## Agreements (grill 2026-09-22)

- Own git root under `passaporte/`; local only until you ask to push
- Open signup (template UI); Google stubbed until OAuth creds
- Better Auth + local SQLite now → Convex adapter after core Playwright loop
- Progress: Zustand + localStorage until Convex
- MSW in **tests only** (auth + progress HTTP)
- Player-first on invented `content/passaporte/u01.json`
- Pipeline: no live vision until Anthropic key in `.env`
- `uv` for Python; pnpm workspaces for JS
