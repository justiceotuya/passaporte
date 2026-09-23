# Passaporte — Progress & Handover

**Last updated:** 2026-09-23  
**Owner:** Justice  
**Status:** Full-book pipeline through hints+crop **done** · 36 units / 363 items · 293 hints · 7 crops  
**Next:** Improve join matching (low match rate) · gold approve items · Google OAuth keys · Convex smoke

---

## Working agreements (non-negotiable)

1. **Tests at every gate.** Exit suite in `TESTING.md` must be green + logged here before the next phase.
2. Update this file at every finished milestone.
3. **Commit and push after every finished stage.**
4. Keep the handover prompt at the bottom accurate.
5. Full-book vision/PDF extract is **approved and in progress** (`scripts/full-book-extract.sh` / `scripts/resume-full-book.sh`).
6. Never commit `raw/`, `extracted/`, PDFs, page images, `*.db`, `.env*`.
7. Design: `../templates/passaporte/` · Spec: design doc · Kuji parent = reference.

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
| 2026-09-23 | **Full-book classify** · aluno **258/258** · professor **207/207** · p-222 letter sanitize |
| 2026-09-23 | **Resume harden** · `set -euo pipefail` · extract completeness check before ALL DONE · extract resumed with `--run-id` |
| 2026-09-23 | **Extract gap resume** · allow numbered exercise labels · coerce bad bbox/skill · screen `passaporte-extract` filling 7 aluno + 12 professor misses |
| 2026-09-23 | **Extract complete** · aluno `20260923T002149Z-d2ef0ba5` (219) · professor `20260923T014601Z-db7b1051` (176) · dense-page letter chunking + 16k max_tokens |
| 2026-09-23 | **Join full-book** · 36 units · 363 items · defaults updated to new run ids · hints+crop queued |
| 2026-09-23 | **Hints + crop** · 293 hints updated · 70 pending (69 open + 1 match) · 7 stimulus crops |

---

## Remaining

- [ ] Improve join matching (27 matched / 653 exercise_only — student_page alignment)
- [ ] Gold review / approve closed items (ship-gate fails until approved) · better bboxes
- [ ] Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (local + Convex) to enable Google button
- [ ] Browser smoke Convex signup with `pnpm web:convex`

---

## Full-book pipeline status (2026-09-23)

| Stage | Status | Notes |
| --- | --- | --- |
| Classify aluno | **done** | 258/258 |
| Classify professor | **done** | 207/207 |
| Extract aluno | **done** | `20260923T002149Z-d2ef0ba5` · 219/219 |
| Extract_key professor | **done** | `20260923T014601Z-db7b1051` · 176/176 |
| Join | **done** | 36 units · 363 items · report `extracted/join_report.md` |
| Hints | **done** | 293 updated · open items skip hints by design |
| Crop | **done** | 7 `needs_image` crops |

```bash
cd pipeline && uv run python join.py  # defaults → full-book run ids
pnpm pipeline:hints && pnpm pipeline:crop
```

---

## How to run

```bash
cd passaporte && pnpm install
pnpm web:test
pnpm web          # app
pnpm web:convex   # Convex auth/progress
pnpm pipeline:join && pnpm pipeline:hints && pnpm pipeline:crop
```

---

## Latest test run log

| Date | Phase | Command | Result |
| --- | --- | --- | --- |
| 2026-09-22 | failures + UI | pytest join/failures · web:test · web:e2e | PASS |
| 2026-09-22 | auth + classify merge | `pnpm web:test` · `pytest tests/test_classify.py` | PASS **69** web · **7** classify |
| 2026-09-23 | classify letter sanitize | `uv run pytest tests/test_classify.py` | PASS **7** |
| 2026-09-23 | join + content | `join.py` full-book · `pnpm content:validate` | PASS **36** units (ship-gate fails until gold approve) |

---

## Handover prompt

```
You are continuing Passaporte.

Read: PROGRESS.md, TESTING.md, extracted/join_report.md

Done: full-book classify+extract+join+hints+crop. Content in content/passaporte (36 units, 363 items).

Next: improve join matching (student_page), gold-approve items for ship-gate, Google OAuth keys, Convex smoke.

Commands: pnpm web · pnpm web:convex · pnpm content:validate · pnpm pipeline:join
```
