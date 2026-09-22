# Passaporte — Progress & Handover

**Last updated:** 2026-09-22  
**Owner:** Justice  
**Status:** Full-book rasterize complete (all 3 PDFs, all pages) · app player + e2e green  
**Next:** Convex + Better Auth adapter; pipeline `classify.py` only after Anthropic key

---

## Working agreements (non-negotiable)

1. **Tests at every gate.** Exit suite in `TESTING.md` must be green + logged here before the next phase.
2. Update this file at every finished milestone.
3. **Commit and push after every finished stage** (once `origin` exists). Do not leave completed work only local.
4. Keep the handover prompt at the bottom accurate.
4. **Calibration only** for vision/PDF until Justice approves full-book run.
5. Never commit `raw/`, `extracted/`, PDFs, page images, `*.db`, `.env*`.
6. Design: `../templates/passaporte/` · Spec: design doc · Kuji parent = reference.

---

## Grill decisions (locked 2026-09-22)

See earlier table: open signup · player-first · Zustand progress · Better Auth+SQLite now · MSW tests-only · Convex after Playwright · pnpm · uv · no live vision until key · invent fixtures · Google stub · **commit+push every stage** (was local-only; Justice changed 2026-09-22).

**MSW pin:** use `msw@2.7.x` (2.15 broke relative/path matching in our Node tests).

**Git:** branch `cursor/passaporte-scaffold-player-slice` @ `98ce55c` — **push blocked** until GitHub auth (`gh auth login` or add `origin`).

---

## Done

| When | What |
| --- | --- |
| 2026-09-22 | Phase 0 scaffold + Phase 1 schema/fixture + exit tests |
| 2026-09-22 | Next.js 15 app · Tailwind Passaporte tokens · `next/font` |
| 2026-09-22 | Better Auth + SQLite (`apps/web/data/auth.db`) · email/password · Google stub · migrate applied |
| 2026-09-22 | Zustand/localStorage progress · `/api/progress` · MSW handlers (tests only) |
| 2026-09-22 | Grader + session builder · SessionPlayer (`choice`/`true_false`) · `/play` · `/sign-in` |
| 2026-09-22 | `pipeline/rasterize.py` + pytest (mocked pdftoppm) |
| 2026-09-22 | Vitest **31** · pytest **16** · `next build` **green** |
| 2026-09-22 | Playwright e2e: short `/play?size=3` session + sign-up → `/play` (**2** passed) |
| 2026-09-22 | Live rasterize calibration: aluno + professor pages **10–40** (31 pages × 150 DPI + thumbs each; ~123 MB under `raw/`, gitignored) |
| 2026-09-22 | **Full rasterize all books/pages:** aluno 258 · professor 207 · valer 245 (each + thumbs; ~1.35 GB under `raw/`, gitignored) |
| 2026-09-22 | **Full rasterize all books:** aluno 258 · professor 207 · valer 245 (pages + thumbs; ~1.3 GB under `raw/`, gitignored) |

---

## Remaining

### Immediate next

- [x] Playwright: short fixture session + account create
- [x] Live `rasterize.py` pages 10–40 (aluno + professor)
- [x] Full rasterize all pages — aluno (258), professor (207), valer (245)
- [ ] Convex + Better Auth Convex adapter; remove SQLite auth + localStorage progress
- [ ] `classify.py` / extract (needs Anthropic key — do not run vision until key present)

### Still later

- Remaining item types · unit map · review queue · stats · hearts · admin review · PostHog · real content extraction (vision when Anthropic key present)

---

## How to run

```bash
cd passaporte
pnpm install
cd pipeline && uv sync && cd ..

pnpm test:phase0
pnpm test:phase1
pnpm web:test          # 31 vitest
pnpm pipeline:test     # pytest

pnpm web               # http://localhost:3000 → sign-in or /play
# First time auth tables: cd apps/web && pnpm auth:migrate
```

Rasterize (when poppler installed):

```bash
cd pipeline
uv run python rasterize.py --book passaporte-aluno --pages 10-40
```

---

## Latest test run log

| Date | Phase | Command | Result |
| --- | --- | --- | --- |
| 2026-09-22 | 0 | `pnpm test:phase0` | PASS |
| 2026-09-22 | 1 | vitest schema + pytest schema | PASS 10+10 |
| 2026-09-22 | 3–5b | `pnpm --filter @passaporte/web exec vitest run` | PASS **32** |
| 2026-09-22 | 2 partial | `uv run pytest -q` | PASS **16** |
| 2026-09-22 | 4 | `next build` | PASS |
| 2026-09-22 | 5e | `pnpm web:e2e` | PASS **2** |
| 2026-09-22 | 2 raster | `uv run python rasterize.py --book passaporte-aluno|professor --pages 10-40` | PASS — 31+31 pages + thumbs; gitignored |
| 2026-09-22 | 2 raster full | `bash scripts/rasterize-all.sh` (all pages × 3 books) | PASS — 258+207+245 pages + thumbs; ~1.35 GB gitignored |
| 2026-09-22 | 2 raster full | `scripts/rasterize-all.sh` (aluno, professor, valer, all pages) | PASS — 258+207+245 pages + thumbs; ~1.3 GB gitignored |

---

## Handover prompt (paste to next model)

```
You are continuing **Passaporte** (gamified A1 Portuguese app).

## Read first
1. `passaporte/PROGRESS.md` (this file) — status, decisions, test log
2. `passaporte/TESTING.md`
3. `passaporte/HANDOVER.md`
4. `uploads/Passaporte - Gamified A1 Portuguese Design Doc.md`
5. `templates/passaporte/` — visual source of truth

## Locked architecture
- Monorepo `passaporte/` own git root; **commit and push after every stage**
- Next.js 15 · Better Auth + SQLite (`apps/web/data/auth.db`) · email/password · Google stubbed
- Progress: Zustand + localStorage; thin `/api/progress`; MSW **tests only** (pin msw@2.7.x)
- Convex deferred until Playwright proves one full fixture session
- Content fixture: `content/passaporte/u01.json`
- Pipeline: `rasterize.py` done; no Anthropic/vision until user adds key to `.env`
- Open signup; English chrome; Portuguese in Source Serif 4 (book voice)
- **Git:** commit + push after every stage (`origin` = https://github.com/justiceotuya/passaporte)

## Current focus
1. Introduce Convex + Better Auth Convex adapter; migrate progress off localStorage/Zustand persist
2. Pipeline: `classify.py` next — **do not call Anthropic** until user puts key in `.env`
3. Full page rasters on disk: `raw/passaporte-aluno/` (258), `raw/passaporte-professor/` (207), `raw/valer/` (245) + thumbs

## Commands
- `pnpm web:test` · `pnpm web:e2e` · `pnpm pipeline:test` · `pnpm web`
- `bash scripts/calibrate-rasterize.sh` · `bash scripts/rasterize-all.sh`
- After each stage: commit + `git push -u origin HEAD`

## Definition of done for your session
Update PROGRESS.md + test log; rewrite Current focus / Next actions in this handover block.
```
