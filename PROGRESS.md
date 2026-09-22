# Passaporte — Progress & Handover

**Last updated:** 2026-09-22  
**Owner:** Justice  
**Status:** All closed item types playable · Convex auth cutover live  
**Next:** Gold review / unit-map · browser smoke Convex signup · review queue / stats

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

Open signup · player-first · Zustand progress · Better Auth (Convex when URL set; SQLite fallback) · MSW `2.7.x` · pnpm · uv · commit+push every stage.

**Git:** `cursor/passaporte-scaffold-player-slice` · https://github.com/justiceotuya/passaporte  
**Convex:** `opulent-gull-941`

---

## Done

| When | What |
| --- | --- |
| 2026-09-22 | Scaffold → pipeline calibration → hints/crop → Convex bridge → auth cutover |
| 2026-09-22 | Player: choice · true_false · fill_blank · match · stimulus |
| 2026-09-22 | **Player 5c:** `order` · `transform` · `listen_choice` (transcript collapsible) |

---

## Remaining

- [ ] Browser smoke: Convex signup/signin
- [ ] Gold review · unit-map cleanup · raise teacher_book · better bboxes
- [ ] Review queue · stats · hearts · admin · PostHog

---

## How to run

```bash
cd passaporte && pnpm install && cd pipeline && uv sync && cd ..
pnpm web:test
pnpm web:convex
pnpm web
```

---

## Latest test run log

| Date | Phase | Command | Result |
| --- | --- | --- | --- |
| 2026-09-22 | Auth cutover | vitest + next build | PASS 43 · build green |
| 2026-09-22 | 5c types | `vitest run` | PASS **46** — order · transform · listen_choice |

---

## Handover prompt

```
You are continuing Passaporte.

Read: PROGRESS.md, TESTING.md, apps/web/convex/README.md

Done: all closed item types in SessionPlayer; Convex Better Auth when URL set.

Next: gold review / unit-map; Convex signup smoke; review queue / stats.

Commands: pnpm web:test · pnpm web:convex · pnpm web
```
