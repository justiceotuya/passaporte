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
  convex/       Convex schema + progress + Better Auth scaffold
pipeline/       Python extraction (uv)
schema/         Shared item.schema.json
content/        Unit JSON (git-tracked)
gold/           Calibration gold
raw/pdf/        Symlink to textbooks (gitignored)
```

## Setup

```bash
# Node (also installs local git hooks that strip Cursor commit attribution)
pnpm install
# or: bash scripts/install-git-hooks.sh

# Python pipeline
cd pipeline && uv sync && cd ..

# PDFs (if raw/pdf missing)
mkdir -p raw && ln -sfn ../../raw/pdf raw/pdf

# Convex — must run from apps/web (or use root script). Not from monorepo root.
pnpm web:convex
# first time: cd apps/web && pnpm exec convex login && pnpm exec convex dev
# See apps/web/convex/README.md for env vars
```

## Tests

```bash
pnpm test:phase0    # scaffold smoke
pnpm test:phase1    # schema validation (TS + Python)
pnpm pipeline:test  # all pipeline pytest
pnpm pipeline:instructions-en  # translate book instructions → instruction_en (needs ANTHROPIC_API_KEY)
pnpm web:test       # Vitest in apps/web (includes convex-test)
pnpm web:convex     # convex dev watcher
```

## Agreements (grill 2026-09-22)

- Own git root under `passaporte/`; commit + push every stage
- Open signup (template UI); Google stubbed until OAuth creds
- Better Auth + local SQLite active; Convex schema + progress bridge staged; full adapter after `convex login`
- Progress: Zustand optimistic UI + `/api/progress` → Convex when configured
- MSW in **tests only** (auth + progress HTTP); pin `msw@2.7.x`
- Player-first on invented `content/passaporte/u01.json`
- Pipeline: no live vision until Anthropic key in `.env`
- `uv` for Python; pnpm workspaces for JS
- No Cursor co-author on commits: repo hooks strip `Co-authored-by: Cursor` / `Made with Cursor`. Also disable in Cursor Settings → **Agent → Attribution** (or **Git & PRs → Attribution** on 3.11+): turn off commit + PR attribution. CLI: `~/.cursor/cli-config.json` → `attribution.attributeCommitsToAgent` / `attributePRsToAgent` = `false`.
