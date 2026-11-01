# Passaporte

A gamified trainer for **A1 European Portuguese**. I built it for my own study: it turns textbook-style exercises into short, Duolingo-like practice sessions with spaced repetition, so the drills from class are something I actually do every day.

It has two parts:

- **The app**: a Next.js web app that plays units of exercises (multiple choice, fill-in-the-blank, matching, word order, rewrite/transform, true/false and listening), tracks progress with SM-2 spaced repetition, hearts and XP, and has an admin board for reviewing content.
- **The pipeline**: a Python CLI that turns scanned PDF pages of exercise books *you own* into structured, schema-validated exercise JSON (classify → extract → join with answer keys → hints → English instructions → image crops).

> **Content note:** no textbook content is in this repository. The repo ships three original demo units in `content/sample/`. If you run the pipeline on your own books, the output goes to `content/local/` and `apps/web/public/crops/`. Both are gitignored, and the app loads them automatically when they're present.

## Who it's for

Me and my study partner, working through A1 Portuguese, and anyone who wants to turn their own study material into daily practice. Sign-up is **invite-only** (see `PASSAPORTE_ALLOWED_EMAILS`) so the app doesn't collect other people's data.

## Built with

- **Web:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, Zustand, TanStack Query + Form, Sonner
- **Auth & data:** Better Auth (SQLite locally, Convex when configured), Convex for progress sync
- **Pipeline:** Python 3 + [uv](https://docs.astral.sh/uv/), Pydantic, JSON Schema, poppler (`pdftoppm`) + Pillow, Anthropic API for page vision
- **Quality:** JSON Schema contract (`schema/`), Vitest + MSW, Playwright, pytest, GitHub Actions CI, content ship gate

## Quick start (sample content, no keys needed)

```bash
pnpm install          # Node ≥ 20, pnpm 11
cp .env.example apps/web/.env.local
# set BETTER_AUTH_SECRET to any 32+ character string
pnpm web              # http://localhost:3000
```

This plays the demo units in `content/sample/`. Progress is stored locally; Convex is optional (see `apps/web/convex/README.md`).

## Using your own books (local only)

```bash
cd pipeline && uv sync && cd ..
mkdir -p raw/pdf             # put your own PDFs here (gitignored)
cp .env.example .env         # set ANTHROPIC_API_KEY for the vision steps
pnpm pipeline:full-book      # classify + extract
pnpm pipeline:join && pnpm pipeline:hints && pnpm pipeline:instructions-en && pnpm pipeline:crop
```

Output lands in `content/local/passaporte/` and `apps/web/public/crops/`, which the app prefers over the samples. To point the app somewhere else, set `PASSAPORTE_CONTENT_DIR`. See `pipeline/README.md` for each stage.

## Layout

```
apps/web/        Next.js app (learner + admin) and Convex functions
pipeline/        Python extraction pipeline (uv)
schema/          Shared item/unit JSON Schema (TS + Python validate against it)
content/sample/  Original demo units (committed)
content/local/   Your pipeline output (gitignored)
scripts/         Content validation, ship gate, pipeline runners
```

## Tests

```bash
pnpm content:validate   # every unit against the schema
pnpm content:ship-gate  # shipped units fully reviewed
pnpm web:test           # Vitest (components, grading, SRS, auth)
pnpm web:e2e            # Playwright (needs `next build`)
pnpm pipeline:test      # pytest
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Required. Session signing secret |
| `PASSAPORTE_ALLOWED_EMAILS` | Comma-separated emails allowed to sign up. Empty means open in dev and closed in production |
| `PASSAPORTE_ADMIN_EMAILS` | Who can use the content review board |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google sign-in |
| `NEXT_PUBLIC_CONVEX_URL` | Optional Convex deployment for auth + progress sync |
| `ANTHROPIC_API_KEY` | Pipeline vision steps only |

## Roadmap

Planned work is in [ROADMAP.md](./ROADMAP.md). Development notes are in [PROGRESS.md](./PROGRESS.md) and [TESTING.md](./TESTING.md).

## License

[MIT](./LICENSE) © Justice Otuya. Textbooks you process with the pipeline remain the property of their publishers and must not be committed.
