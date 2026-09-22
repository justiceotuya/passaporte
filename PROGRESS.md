# Passaporte — Progress & Handover

**Last updated:** 2026-09-22  
**Owner:** Justice  
**Status:** Home unit map + unit detail live · all closed types playable · Convex auth ready  
**Next:** Review queue page · stats · gold review / unit-map content cleanup

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

Open signup · player-first · Zustand progress · Better Auth (Convex when URL set) · MSW `2.7.x` · pnpm · uv · commit+push every stage.

**Git:** `cursor/passaporte-scaffold-player-slice` · https://github.com/justiceotuya/passaporte

---

## Done

| When | What |
| --- | --- |
| 2026-09-22 | Pipeline calibration · hints/crop · Convex · all closed item types |
| 2026-09-22 | **Home unit map** (`/`) · **unit detail** (`/units/[n]`) · play `?unit=` · 60% unlock / 80% complete |

---

## Remaining

- [ ] Dedicated Review queue page (map chip already links `/play?review=1`)
- [ ] Stats · hearts · admin · PostHog
- [ ] Gold review · content unit-map cleanup · better bboxes
- [ ] Browser smoke Convex signup (with `pnpm web:convex` running)

---

## How to run

```bash
cd passaporte && pnpm install
pnpm web:test
pnpm web:convex
pnpm web   # map at / · unit at /units/1 · play at /play?unit=1
```

---

## Latest test run log

| Date | Phase | Command | Result |
| --- | --- | --- | --- |
| 2026-09-22 | 5c types | vitest | PASS 46 |
| 2026-09-22 | Home map | vitest + next build | PASS **50** · routes `/`, `/units/[unit]`, `/play` |

---

## Handover prompt

```
You are continuing Passaporte.

Read: PROGRESS.md, TESTING.md, apps/web/convex/README.md

Done: unit map + detail; all closed item types; Convex Better Auth when URL set.

Next: review queue page; stats; gold content cleanup.

Commands: pnpm web:test · pnpm web · pnpm web:convex
```
