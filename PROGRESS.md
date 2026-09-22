# Passaporte — Progress & Handover

**Last updated:** 2026-09-22  
**Owner:** Justice  
**Status:** Convex schema + progress bridge wired; Better Auth still on SQLite until `convex login`  
**Next:** `npx convex login` + adapter cutover · gold review · remaining item types

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

Open signup · player-first · Zustand progress · Better Auth+SQLite (Convex adapter staged) · MSW tests-only (`msw@2.7.x`) · Convex after Playwright · pnpm · uv · commit+push every stage.

**Git:** branch `cursor/passaporte-scaffold-player-slice` · `origin` = https://github.com/justiceotuya/passaporte

---

## Done

| When | What |
| --- | --- |
| 2026-09-22 | Scaffold → schema → player core → auth → pipeline calibration through hints/crop |
| 2026-09-22 | **Player:** `StimulusImage` · `fill_blank` (tiles + typed/diacritics) · `match` pair-tap (≤8 pairs) |
| 2026-09-22 | **Convex:** schema (profiles/attempts/itemState/sessions/itemReports) · progress mutations/queries · `ConvexClientProvider` · SQLite↔Convex progress bridge via `/api/progress` · `@convex-dev/better-auth` scaffold (needs `npx convex login`) |

---

## Remaining

- [ ] Run `npx convex login` + `npx convex dev`; cut Better Auth routes to Convex adapter
- [ ] Gold review · unit-map cleanup · raise teacher_book rate · better extract bboxes
- [ ] Player: `order`, `transform`, `listen_choice`
- [ ] Review queue · stats · hearts · admin · PostHog

---

## How to run

```bash
cd passaporte && pnpm install && cd pipeline && uv sync && cd ..
pnpm web:test
pnpm pipeline:test
pnpm web

# Convex (first time — interactive login required)
cd apps/web && npx convex login && npx convex dev
# then fill NEXT_PUBLIC_CONVEX_* from .env.local — see apps/web/convex/README.md
```

---

## Latest test run log

| Date | Phase | Command | Result |
| --- | --- | --- | --- |
| 2026-09-22 | 2 hints/crop | pytest + live runs | PASS — 228 hints · 68 crops · pytest 49 |
| 2026-09-22 | 5c player | `vitest run` | PASS **38** — stimulus, fill_blank, match |
| 2026-09-22 | Convex MVP | `pnpm web:test` | PASS **43** — +convex-env · convex-progress (convex-test) |

---

## Handover prompt (paste to next model)

```
You are continuing **Passaporte** (gamified A1 Portuguese app).

## Read first
1. `passaporte/PROGRESS.md`
2. `passaporte/TESTING.md`
3. `passaporte/HANDOVER.md`
4. Design doc + `templates/passaporte/`
5. `apps/web/convex/README.md`

## Locked architecture
- Monorepo `passaporte/` · commit + push every stage
- Next.js 15 · Better Auth + SQLite (active) · Convex schema + progress bridge staged
- `@convex-dev/better-auth` files ready; cutover after `npx convex login`
- Zustand optimistic UI · MSW 2.7.x · better-auth pinned ~1.6.x for Convex peer
- Player: choice, true_false, fill_blank, match + stimulus_image

## Current focus
1. `npx convex login` + `npx convex dev` → switch auth routes to Convex adapter
2. Gold review / unit-map cleanup
3. Remaining types: order, transform, listen_choice

## Commands
- `pnpm web:test` · `pnpm web` · `pnpm web:convex` · `pnpm pipeline:test`
- After each stage: commit + `git push`
```
