# Passaporte — Progress & Handover

**Last updated:** 2026-09-22  
**Owner:** Justice  
**Status:** Pipeline calibration through hints + crop · draft units ready for gold review  
**Next:** Gold review / unit-map cleanup · Convex + Better Auth adapter · remaining item types in player

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

See earlier table: open signup · player-first · Zustand progress · Better Auth+SQLite now · MSW tests-only · Convex after Playwright · pnpm · uv · no live vision until key · invent fixtures · Google stub · **commit+push every stage**.

**MSW pin:** use `msw@2.7.x` (2.15 broke relative/path matching in our Node tests).

**Git:** branch `cursor/passaporte-scaffold-player-slice` · remote `origin` = https://github.com/justiceotuya/passaporte

---

## Done

| When | What |
| --- | --- |
| 2026-09-22 | Phase 0–1 scaffold + schema · Next.js player · Better Auth · progress · Playwright |
| 2026-09-22 | Rasterize (cal + full) · classify · extract · extract_key · join |
| 2026-09-22 | **hints.py** — 228 closed items, batch 20, answer-leak reject + retry |
| 2026-09-22 | **crop.py** — 68 `needs_image` → `apps/web/public/crops/*.webp` (no bboxes → full-page fallback) |

---

## Remaining

### Immediate next

- [x] Pipeline: rasterize → classify → extract → extract_key → join → hints → crop (calibration 10–40)
- [ ] Gold review · fix unit map noise · raise teacher_book match rate · improve extract bboxes
- [ ] Convex swap (app track)
- [ ] Player: more item types beyond choice/true_false · render `stimulus_image`

### Still later

- Review queue · stats · hearts · admin review · PostHog · full-book vision only when asked

---

## How to run

```bash
cd passaporte
pnpm install
cd pipeline && uv sync && cd ..

pnpm test:phase0
pnpm test:phase1
pnpm web:test
pnpm pipeline:test
pnpm pipeline:join
pnpm pipeline:crop
pnpm pipeline:hints

pnpm web
```

---

## Latest test run log

| Date | Phase | Command | Result |
| --- | --- | --- | --- |
| 2026-09-22 | 2 join | `pytest` + `join.py` + vitest schema | PASS — draft u01–u07 |
| 2026-09-22 | 2 crop | `pytest tests/test_crop.py` + `crop.py` | PASS — **5** tests; **68** webp crops |
| 2026-09-22 | 2 hints | `pytest tests/test_hints.py` + `hints.py` | PASS — **5** tests; **228**/228 hints; **0** hint failures |
| 2026-09-22 | 2 suite | `uv run pytest -q` | PASS **49** |
| 2026-09-22 | 1 | vitest schema | PASS **10** |

---

## Handover prompt (paste to next model)

```
You are continuing **Passaporte** (gamified A1 Portuguese app).

## Read first
1. `passaporte/PROGRESS.md` (this file)
2. `passaporte/TESTING.md`
3. `passaporte/HANDOVER.md`
4. `uploads/Passaporte - Gamified A1 Portuguese Design Doc.md`
5. `templates/passaporte/`

## Locked architecture
- Monorepo `passaporte/` · commit + push every stage
- Next.js 15 · Better Auth + SQLite · Zustand progress · MSW tests-only (msw@2.7.x)
- Pipeline calibration 10–40 done: rasterize → classify → extract → extract_key → join → hints → crop
- Content: `content/passaporte/u01–u07.json` + crops in `apps/web/public/crops/`
- Extract runs (gitignored): aluno `…0b8f810b` · professor `…833219b4`

## Current focus
1. Gold review / unit-map cleanup (teacher_book hit rate still low; page→unit map noisy)
2. Player: show `stimulus_image`; more item types
3. Convex + Better Auth adapter

## Commands
- `pnpm pipeline:test` · `pnpm pipeline:crop` · `pnpm pipeline:hints`
- After each stage: commit + `git push`

## Definition of done for your session
Update PROGRESS.md + test log; rewrite Current focus in this handover block.
```
