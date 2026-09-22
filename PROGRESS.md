# Passaporte — Progress & Handover

**Last updated:** 2026-09-22  
**Owner:** Justice  
**Status:** Join calibration done · draft units u01–u07 + gold/join_report.md  
**Next:** `hints.py` / crop · gold review of teacher_book items · Convex after Playwright

---

## Working agreements (non-negotiable)

1. **Tests at every gate.** Exit suite in `TESTING.md` must be green + logged here before the next phase.
2. Update this file at every finished milestone.
3. **Commit and push after every finished stage** (once `origin` exists). Do not leave completed work only local.
4. Keep the handover prompt at the bottom accurate.
5. **Calibration only** for vision/PDF until Justice approves full-book run.
6. Never commit `raw/`, `extracted/`, PDFs, page images, `*.db`, `.env*`.
7. Design: `../templates/passaporte/` · Spec: design doc · Kuji parent = reference.

---

## Grill decisions (locked 2026-09-22)

See earlier table: open signup · player-first · Zustand progress · Better Auth+SQLite now · MSW tests-only · Convex after Playwright · pnpm · uv · no live vision until key · invent fixtures · Google stub · **commit+push every stage** (was local-only; Justice changed 2026-09-22).

**MSW pin:** use `msw@2.7.x` (2.15 broke relative/path matching in our Node tests).

**Git:** branch `cursor/passaporte-scaffold-player-slice` · remote `origin` = https://github.com/justiceotuya/passaporte

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
| 2026-09-22 | **join.py** — match (student_page, letter) + item_index; draft `content/passaporte/u01–u07.json`; report `gold/join_report.md` |

---

## Remaining

### Immediate next

- [x] Playwright: short fixture session + account create
- [x] Live `rasterize.py` pages 10–40 (aluno + professor)
- [x] Full rasterize all pages — aluno (258), professor (207), valer (245)
- [x] `classify.py` + calibration run aluno pages 10–40 → `extracted/passaporte-aluno/pages.json`
- [x] Classify professor pages 10–40 → `extracted/passaporte-professor/pages.json`
- [x] `extract.py` aluno pages 10–40 → `extracted/passaporte-aluno/20260922T163925Z-0b8f810b/` (29 pages, 301 items)
- [x] `extract_key.py` professor pages 10–40 → `extracted/passaporte-professor/20260922T164242Z-833219b4/` (22 pages, 298 answers)
- [x] `join.py` → draft unit JSON + join report (calibration)
- [ ] Gold review · fix unit map noise · raise teacher_book match rate
- [ ] `hints.py` / crop
- [ ] Convex swap (app track)

### Still later

- Remaining item types · review queue · stats · hearts · admin review · PostHog · full-book vision only when asked

---

## How to run

```bash
cd passaporte
pnpm install
cd pipeline && uv sync && cd ..

pnpm test:phase0
pnpm test:phase1
pnpm web:test          # vitest
pnpm pipeline:test     # pytest
pnpm pipeline:join     # join calibration extracts → content/ + report

pnpm web               # http://localhost:3000 → sign-in or /play
# First time auth tables: cd apps/web && pnpm auth:migrate
```

Rasterize (when poppler installed):

```bash
cd pipeline
uv run python rasterize.py --book passaporte-aluno --pages 10-40
```

Join (uses default calibration run ids in `join.py`):

```bash
cd pipeline
uv run python join.py --report ../extracted/join_report.md
# tracked summary: gold/join_report.md
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
| 2026-09-22 | 2 classify | `uv run pytest tests/test_classify.py` | PASS |
| 2026-09-22 | 2 classify live | `classify.py --book passaporte-aluno --pages 10-40` | PASS — 31/31 → `extracted/passaporte-aluno/pages.json` |
| 2026-09-22 | 2 classify live | `classify.py --book passaporte-professor --pages 10-40` | PASS — 31/31 → `extracted/passaporte-professor/pages.json` |
| 2026-09-22 | 2 extract | `pytest tests/test_extract.py` + `extract.py --pages 10-12` | PASS — 14 tests; 3 pages / 20 items extracted |
| 2026-09-22 | 2 extract | `extract.py --pages 10-40 --run-id …0b8f810b` | PASS — 29 exercise pages / ~301 items |
| 2026-09-22 | 2 extract_key | `extract_key.py --pages 10-40` | PASS — 22 key pages / 298 answers; 5 unit tests |
| 2026-09-22 | 2 raster full | `scripts/rasterize-all.sh` (aluno, professor, valer, all pages) | PASS — 258+207+245 pages + thumbs; ~1.3 GB gitignored |
| 2026-09-22 | 2 join | `pytest tests/test_join.py` + `join.py` + vitest schema | PASS — **4** join tests; pytest **39**; schema **10**; draft u01–u07; matched=2 mismatch=18 empty_key=8 exercise_only=97 key_only=53; teacher_book≈32 |

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
- Content: draft units from join in `content/passaporte/u01–u07.json` (many `generated` answers; see `gold/join_report.md`)
- Pipeline: rasterize → classify → extract → extract_key → **join** done for pages 10–40
- Open signup; English chrome; Portuguese in Source Serif 4 (book voice)
- **Git:** commit + push after every stage (`origin` = https://github.com/justiceotuya/passaporte)

## Current focus
1. Gold review / unit-map cleanup to raise teacher_book hit rate; then `hints.py` + crop
2. App track: Convex + Better Auth adapter (still open)
3. Extract runs (gitignored):
   - aluno `extracted/passaporte-aluno/20260922T163925Z-0b8f810b/`
   - professor keys `extracted/passaporte-professor/20260922T164242Z-833219b4/`

## Commands
- `pnpm pipeline:join`
- `cd pipeline && uv run python join.py --aluno-run … --professor-run …`
- After each stage: commit + `git push`

## Definition of done for your session
Update PROGRESS.md + test log; rewrite Current focus / Next actions in this handover block.
```
