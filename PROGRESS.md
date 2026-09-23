# Passaporte — Progress & Handover

**Last updated:** 2026-09-23  
**Owner:** Justice  
**Status:** Full-book **classify complete** (aluno 258 + professor 207) · **extract aluno running** in `screen`  
**Next:** Wait for extract aluno + extract_key professor → join with new run IDs → `pnpm pipeline:hints` · `pnpm pipeline:crop` · Google OAuth keys · gold cleanup

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
| 2026-09-23 | **Full-book classify** · aluno **258/258** · professor **207/207** · fixed p-222 letter sanitize (numbered exercises no longer block save) · resume script coverage/stall detection |

---

## Remaining

- [ ] Full-book **extract** (aluno ~219 exercise pages + professor ~176 answer_key) running in `screen -S passaporte-classify` → then join + hints + crop
- [ ] Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (local + Convex) to enable Google button
- [ ] Gold review · better bboxes
- [ ] Browser smoke Convex signup with `pnpm web:convex`

---

## Full-book pipeline status (2026-09-23)

| Stage | Status | Notes |
| --- | --- | --- |
| Classify aluno | **done** | 258/258 · gap was p-222 (`exercise_letters` `["5","6"]` failed validation; now sanitized) |
| Classify professor | **done** | 207/207 |
| Extract aluno | **running** | run dir `extracted/passaporte-aluno/20260923T002149Z-d2ef0ba5` · ~219 exercise pages |
| Extract_key professor | pending | starts automatically after aluno extract in resume script |
| Join / hints / crop | pending | use new run IDs from logs when extract finishes |

**Process:** `screen -r passaporte-classify` (detached) · `scripts/resume-full-book.sh`  
**Logs:** `extracted/logs/full-book-resume.out` · `extracted/logs/extract-aluno.log` · (later) `extract-professor.log`

### Monitor

```bash
screen -ls
pgrep -af 'resume-full-book|extract.py|extract_key|classify.py'
python3 -c "import json; print('aluno',len(json.load(open('extracted/passaporte-aluno/pages.json'))['pages']),'prof',len(json.load(open('extracted/passaporte-professor/pages.json'))['pages']))"
tail -f extracted/logs/full-book-resume.out
# Extract progress: count files under the new run dir
ls extracted/passaporte-aluno/20260923T002149Z-d2ef0ba5 | wc -l
```

### When extract finishes (both books)

```bash
# Confirm ALL DONE in log, note professor run id under extracted/passaporte-professor/
grep -E 'ALL DONE|run|Wrote|extract' extracted/logs/full-book-resume.out | tail -40

cd pipeline && uv run python join.py \
  --aluno-run ../extracted/passaporte-aluno/20260923T002149Z-d2ef0ba5 \
  --professor-run ../extracted/passaporte-professor/<PROF_RUN> \
  --report ../extracted/join_report.md

pnpm pipeline:hints && pnpm pipeline:crop
```

If the screen dies mid-extract:

```bash
bash scripts/resume-full-book.sh
# or: screen -dmS passaporte-classify bash scripts/resume-full-book.sh
# Classify will no-op (already complete); extract may need a fresh start — check extract logs.
```

---

## How to run

```bash
cd passaporte && pnpm install
pnpm web:test
pnpm web          # app
pnpm web:convex   # Convex auth/progress
# Google: add GOOGLE_CLIENT_ID/SECRET to apps/web/.env.local + convex env set
# Redirect URI: http://localhost:3000/api/auth/callback/google

# Full-book PDF (long-running; prefers detached screen)
bash scripts/resume-full-book.sh          # or: screen -dmS passaporte-classify bash scripts/resume-full-book.sh
# Attach: screen -r passaporte-classify · Logs: extracted/logs/full-book-resume.out
# Alt: pnpm pipeline:full-book
```

---

## Latest test run log

| Date | Phase | Command | Result |
| --- | --- | --- | --- |
| 2026-09-22 | failures + UI | pytest join/failures · web:test · web:e2e | PASS |
| 2026-09-22 | auth + classify merge | `pnpm web:test` · `pytest tests/test_classify.py` | PASS **69** web · **7** classify |
| 2026-09-23 | classify letter sanitize | `uv run pytest tests/test_classify.py` | PASS **7** |

---

## Handover prompt

```
You are continuing Passaporte.

Read: PROGRESS.md, TESTING.md, apps/web/convex/README.md

Done: auth email + Google (env-gated), classify merge/skip, full-book classify (aluno 258 + professor 207), p-222 letter sanitize.

Next: monitor extract in screen passaporte-classify / extracted/logs/full-book-resume.out; when extract aluno + extract_key professor finish, join with run ids (aluno 20260923T002149Z-d2ef0ba5 + new professor run), then pnpm pipeline:hints && pnpm pipeline:crop. Add Google OAuth client keys to enable the button.

Commands: pnpm web · pnpm web:convex · bash scripts/resume-full-book.sh · pnpm web:test · pnpm web:e2e
```
