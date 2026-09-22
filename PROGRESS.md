# Passaporte — Progress & Handover

**Last updated:** 2026-09-22  
**Owner:** Justice  
**Status:** Player plays choice / true_false / fill_blank / match + stimulus images  
**Next:** Gold review / unit-map · order/transform/listen_choice · Convex adapter

---

## Working agreements (non-negotiable)

1. **Tests at every gate.** Exit suite in `TESTING.md` must be green + logged here before the next phase.
2. Update this file at every finished milestone.
3. **Commit and push after every finished stage.**
4. Keep the handover prompt at the bottom accurate.
5. **Calibration only** for vision/PDF until Justice approves full-book run.
6. Never commit `raw/`, `extracted/`, PDFs, page images, `*.db`, `.env*`.
7. Design: `../templates/passaporte/` · Spec: design doc · Kuji parent = reference.

---

## Grill decisions (locked 2026-09-22)

Open signup · player-first · Zustand progress · Better Auth+SQLite · MSW tests-only (`msw@2.7.x`) · Convex after Playwright · pnpm · uv · commit+push every stage.

**Git:** branch `cursor/passaporte-scaffold-player-slice` · `origin` = https://github.com/justiceotuya/passaporte

---

## Done

| When | What |
| --- | --- |
| 2026-09-22 | Scaffold → schema → player core → auth → pipeline calibration through hints/crop |
| 2026-09-22 | **Player:** `StimulusImage` · `fill_blank` (tiles + typed/diacritics) · `match` pair-tap (≤8 pairs) |

---

## Remaining

- [ ] Gold review · unit-map cleanup · raise teacher_book rate · better extract bboxes
- [ ] Player: `order`, `transform`, `listen_choice`
- [ ] Convex + Better Auth adapter
- [ ] Review queue · stats · hearts · admin · PostHog

---

## How to run

```bash
cd passaporte && pnpm install && cd pipeline && uv sync && cd ..
pnpm web:test
pnpm pipeline:test
pnpm web
```

---

## Latest test run log

| Date | Phase | Command | Result |
| --- | --- | --- | --- |
| 2026-09-22 | 2 hints/crop | pytest + live runs | PASS — 228 hints · 68 crops · pytest 49 |
| 2026-09-22 | 5c player | `vitest run` | PASS **38** — stimulus, fill_blank, match |

---

## Handover prompt (paste to next model)

```
You are continuing **Passaporte** (gamified A1 Portuguese app).

## Read first
1. `passaporte/PROGRESS.md`
2. `passaporte/TESTING.md`
3. `passaporte/HANDOVER.md`
4. Design doc + `templates/passaporte/`

## Locked architecture
- Monorepo `passaporte/` · commit + push every stage
- Next.js 15 · Better Auth + SQLite · Zustand · MSW 2.7.x
- Pipeline calibration 10–40 done (join → hints → crop)
- Player: choice, true_false, fill_blank, match + stimulus_image

## Current focus
1. Gold review / unit-map cleanup
2. Remaining types: order, transform, listen_choice
3. Convex + Better Auth adapter

## Commands
- `pnpm web:test` · `pnpm web` · `pnpm pipeline:test`
- After each stage: commit + `git push`
```
