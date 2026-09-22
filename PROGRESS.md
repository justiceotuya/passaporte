# Passaporte — Progress & Handover

**Last updated:** 2026-09-22  
**Owner:** Justice  
**Status:** Phases 0–7 complete · light/dark + desktop rail · full settings · failures.jsonl gate  
**Next:** Gold content cleanup · better bboxes · full-book pipeline when approved · Convex signup smoke with `pnpm web:convex`

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
| 2026-09-22 | **Home unit map** · **unit detail** · play `?unit=` · 60% unlock / 80% complete |
| 2026-09-22 | **5d** SM-2 + hearts + analytics · **5e** /review /stats /settings + e2e |
| 2026-09-22 | **6** `/admin/review` keyboard a/e/r/→ · gated API |
| 2026-09-22 | **7** `content:validate` · ship gate · CI · shipped **u07** smoke |
| 2026-09-22 | **Phase 2 leftover** join omits missing keys → `failures.jsonl` (no invented answers) |
| 2026-09-22 | **Responsive shell** · desktop 240px rail · laptop wider column · light default + dark toggle |
| 2026-09-22 | **Settings complete** · appearance, accents, typed mode, session length, reset, sign-in |

---

## Remaining

- [ ] Gold review · content unit-map cleanup · better bboxes
- [ ] Browser smoke Convex signup (with `pnpm web:convex` running)
- [ ] Full-book pipeline run (needs Justice approval)

---

## How to run

```bash
cd passaporte && pnpm install
pnpm web:test
pnpm content:validate && pnpm content:ship-gate
pnpm web:convex
pnpm web   # map / review / stats / settings / play
# Admin: PASSAPORTE_ADMIN_EMAILS=you@example.com  (or PASSAPORTE_ADMIN_BYPASS=1 in non-prod)
```

---

## Latest test run log

| Date | Phase | Command | Result |
| --- | --- | --- | --- |
| 2026-09-22 | 5c types | vitest | PASS 46 |
| 2026-09-22 | Home map | vitest + next build | PASS **50** · routes `/`, `/units/[unit]`, `/play` |
| 2026-09-22 | 5d SRS/hearts | `pnpm web:test` | PASS **58** |
| 2026-09-22 | 5e pages+e2e | `pnpm web:test` · `pnpm web:e2e` | PASS **59** unit · **4/4** e2e |
| 2026-09-22 | 6 admin | vitest + admin e2e | PASS **68** · admin API gated |
| 2026-09-22 | 7 ship | `pnpm content:validate` · `ship-gate` | PASS 7 units · u07 shipped |
| 2026-09-22 | failures + UI shell | `uv run pytest tests/test_failures.py tests/test_join.py` · `pnpm web:test` · `pnpm web:e2e` | PASS **6** pipeline · **68** web · **8/8** e2e |

---

## Handover prompt

```
You are continuing Passaporte.

Read: PROGRESS.md, TESTING.md, apps/web/convex/README.md

Done through Phase 7 + failures.jsonl gate + light/dark appearance + desktop rail nav + complete settings.

Next: gold content cleanup; better bboxes; full-book pipeline when approved; Convex signup smoke with web:convex running.

Commands: pnpm web:test · pnpm content:validate · pnpm content:ship-gate · pnpm web · pnpm web:e2e · pnpm web:convex
```
