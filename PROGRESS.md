# Passaporte — Progress & Handover

**Last updated:** 2026-09-22  
**Owner:** Justice  
**Status:** Auth + Google wired · nav/session end-to-end · full-book extract running  
**Next:** Finish full-book join/hints/crop when extract completes · add Google Cloud OAuth client keys · gold cleanup

---

## Working agreements (non-negotiable)

1. **Tests at every gate.** Exit suite in `TESTING.md` must be green + logged here before the next phase.
2. Update this file at every finished milestone.
3. **Commit and push after every finished stage.**
4. Keep the handover prompt at the bottom accurate.
5. Full-book vision/PDF extract is **approved and in progress** (`scripts/full-book-extract.sh`).
6. Never commit `raw/`, `extracted/`, PDFs, page images, `*.db`, `.env*`.
7. Design: `../templates/passaporte/` · Spec: design doc · Kuji parent = reference.
8. **No Cursor attribution on commits.** Repo `.githooks` strips Cursor co-author trailers (`pnpm install` / `scripts/install-git-hooks.sh`). Also turn off Cursor Settings → Agent (or Git & PRs) → Attribution.

---

## Grill decisions (locked 2026-09-22)

Open signup · player-first · Zustand progress · Better Auth (Convex when URL set) · Google OAuth when keys set · MSW `2.7.x` · pnpm · uv · commit+push every stage.

**Git:** `cursor/passaporte-scaffold-player-slice` · https://github.com/justiceotuya/passaporte

---

## Done

| When | What |
| --- | --- |
| 2026-09-22 | Phases 0–7 · SRS · admin · ship gate · responsive · light/dark |
| 2026-09-22 | **Auth E2E** · email signup/signin · Google provider (env-gated) · sign-out · nav account · `?next=` callback · SSR token |
| 2026-09-22 | **Classify merge** · skip existing pages · `pnpm pipeline:full-book` script started |

---

## Remaining

- [ ] Wait for full-book classify + extract logs → re-join + hints + crop
- [ ] Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (local + Convex) to enable Google button
- [ ] Gold review · better bboxes
- [ ] Browser smoke Convex signup with `pnpm web:convex`

---

## How to run

```bash
cd passaporte && pnpm install
pnpm web:test
pnpm web          # app
pnpm web:convex   # Convex auth/progress
# Google: add GOOGLE_CLIENT_ID/SECRET to apps/web/.env.local + convex env set
# Redirect URI: http://localhost:3000/api/auth/callback/google

# Full-book PDF (long-running)
pnpm pipeline:full-book          # or: bash scripts/full-book-extract.sh
# Logs: extracted/logs/full-book-all.out
```

---

## Latest test run log

| Date | Phase | Command | Result |
| --- | --- | --- | --- |
| 2026-09-22 | failures + UI | pytest join/failures · web:test · web:e2e | PASS |
| 2026-09-22 | auth + classify merge | `pnpm web:test` · `pytest tests/test_classify.py` | PASS **69** web · **7** classify |

---

## Handover prompt

```
You are continuing Passaporte.

Read: PROGRESS.md, TESTING.md, apps/web/convex/README.md

Done: auth email + Google (env-gated), nav/session sign-in/out, classify merge/skip, full-book extract script.

Next: monitor extracted/logs/full-book-all.out; when classify+extract finish, join with new run ids, then hints+crop. Add Google OAuth client keys to enable the button.

Commands: pnpm web · pnpm web:convex · pnpm pipeline:full-book · pnpm web:test · pnpm web:e2e
```
