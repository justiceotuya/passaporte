# Passaporte — Progress & Handover

**Last updated:** 2026-09-22  
**Owner:** Justice  
**Status:** Convex live · Better Auth cut over when `NEXT_PUBLIC_CONVEX_URL` is set  
**Next:** Gold review / unit-map · remaining item types · verify signup against Convex in browser

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

Open signup · player-first · Zustand progress · Better Auth (Convex adapter when configured; SQLite fallback) · MSW tests-only (`msw@2.7.x`) · pnpm · uv · commit+push every stage.

**Git:** branch `cursor/passaporte-scaffold-player-slice` · `origin` = https://github.com/justiceotuya/passaporte

**Convex deployment:** `opulent-gull-941` (dev) — `SITE_URL` set on deployment.

---

## Done

| When | What |
| --- | --- |
| 2026-09-22 | Scaffold → schema → player → pipeline calibration → hints/crop |
| 2026-09-22 | Player: stimulus · fill_blank · match |
| 2026-09-22 | Convex schema + progress bridge |
| 2026-09-22 | **Auth cutover:** Convex Better Auth handler + `ConvexBetterAuthProvider` when URL set; SQLite fallback otherwise |

---

## Remaining

- [ ] Smoke: sign-up / sign-in against Convex in browser (`pnpm web`)
- [ ] Gold review · unit-map cleanup · raise teacher_book rate · better extract bboxes
- [ ] Player: `order`, `transform`, `listen_choice`
- [ ] Review queue · stats · hearts · admin · PostHog

---

## How to run

```bash
cd passaporte && pnpm install && cd pipeline && uv sync && cd ..
pnpm web:test
pnpm pipeline:test
pnpm web:convex   # keep running while developing
pnpm web
```

---

## Latest test run log

| Date | Phase | Command | Result |
| --- | --- | --- | --- |
| 2026-09-22 | Convex MVP | `pnpm web:test` | PASS **43** |
| 2026-09-22 | Auth cutover | `vitest run` + `next build` | PASS **43** · build green |

---

## Handover prompt (paste to next model)

```
You are continuing **Passaporte**.

## Read first
1. passaporte/PROGRESS.md
2. passaporte/TESTING.md
3. apps/web/convex/README.md

## Locked
- Convex deployment configured; Better Auth uses Convex when NEXT_PUBLIC_CONVEX_URL is set
- SQLite auth remains the fallback without Convex URL
- Progress: Zustand + /api/progress bridgeUserId → Convex

## Current focus
1. Browser smoke of Convex signup/signin
2. Gold review / unit-map
3. Remaining item types

## Commands
- pnpm web:convex · pnpm web · pnpm web:test
```
