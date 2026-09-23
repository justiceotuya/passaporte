# Passaporte — Progress & Handover

**Last updated:** 2026-09-23  
**Owner:** Justice  
**Status:** Gold-approved 37 shipped units · ship-gate green  
**Next:** Google OAuth keys · Convex smoke · better bboxes
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
| 2026-09-23 | **Join full-book (v1)** · 36 units · 363 items · poor match (printed vs PDF page drift) |
| 2026-09-23 | **Hints + crop (v1)** · 293 hints · 7 crops |
| 2026-09-23 | **Join matching fix** · remap claimed `student_page` (printed→PDF, default −2) · item-index shift/positional align · stale unit cleanup · crop run id updated |
| 2026-09-23 | **Gold approve** · 37 units in `shipped-units.json` · closed items `review.status=approved` · ship-gate PASS |

---

## Remaining

- [ ] Better bboxes / deeper gold QA on joined answers
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
| Join | **done (improved)** | 38 units · 919 items · see match stats below |
| Hints | **done** | 768 updated · 151 still pending (open / skipped) |
| Crop | **done** | 134 `needs_image` crops |

### Join match stats (before → after)

| Bucket | Before | After |
| --- | --- | --- |
| matched | 27 | **163** |
| count_mismatch | 141 | 155 |
| empty_key | 66 | 140 |
| exercise_only | 653 | **429** |
| key_only | 596 | **157** |
| skipped validation | 2096 | 1535 |
| items (teacher_book) | 363 | **919** |

Root cause: teacher keys cite Livro do Aluno *printed* pages; aluno extracts use PDF page indices (typically printed − 2). Blind `(student_page, letter)` lookup missed most exercises.

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
| 2026-09-23 | join match fix | `uv run pytest tests/test_join.py` · `join.py` · hints · crop · `pnpm content:validate` | PASS **10** join · **38** units / **919** items · ship-gate still fails (pending gold) |
| 2026-09-23 | gold approve | `approve-unit` ×37 · `pnpm content:validate` · `pnpm content:ship-gate` | PASS **38** units validated · ship-gate **37** |

---

## Handover prompt

```
You are continuing Passaporte.

Read: PROGRESS.md, TESTING.md, extracted/join_report.md

Done: full-book classify+extract+join (page remap)+hints+crop. Content in content/passaporte (38 units, 919 items, teacher_book answers).

Next: Google OAuth keys, Convex smoke, deeper gold QA / bboxes.

Commands: pnpm web · pnpm web:convex · pnpm content:validate · pnpm pipeline:join
```
