# Passaporte — Progress & Handover

**Last updated:** 2026-09-23  
**Owner:** Justice  
**Status:** Full-book **extract complete** (aluno 219/219 · professor 176/176) · p-116 = A–D only (classify over-listed E–J)  
**Next:** Join runs → `pnpm pipeline:hints` · `pnpm pipeline:crop` · Google OAuth keys · gold cleanup

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

---

## Remaining

- [ ] Join aluno `20260923T002149Z-d2ef0ba5` + professor `20260923T014601Z-db7b1051` → hints → crop
- [ ] Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (local + Convex) to enable Google button
- [ ] Gold review · better bboxes
- [ ] Browser smoke Convex signup with `pnpm web:convex`

---

## Full-book pipeline status (2026-09-23)

| Stage | Status | Notes |
| --- | --- | --- |
| Classify aluno | **done** | 258/258 |
| Classify professor | **done** | 207/207 |
| Extract aluno | **running** | `20260923T002149Z-d2ef0ba5` · resumed from 16/219 (skips existing) |
| Extract_key professor | pending | starts after aluno extract finishes (new run; ignore empty `20260923T002644Z-49c87a47`) |
| Join / hints / crop | pending | after real EXTRACT ALL DONE |

**Process:** `screen -r passaporte-classify` (pid session `passaporte-classify`)  
**Logs:** `extracted/logs/extract-aluno.log` · `extracted/logs/extract-professor.log` · `extracted/logs/full-book-resume.out`

### Monitor

```bash
screen -ls
pgrep -af 'extract.py|extract_key'
tail -f extracted/logs/extract-aluno.log
ls extracted/passaporte-aluno/20260923T002149Z-d2ef0ba5/p-*.json | wc -l   # expect ~219
```

### When extract finishes (both books)

```bash
grep 'EXTRACT ALL DONE\|ALL DONE' extracted/logs/extract-aluno.log extracted/logs/extract-professor.log extracted/logs/full-book-resume.out | tail -5
# note new professor run under extracted/passaporte-professor/ (non-empty)

cd pipeline && uv run python join.py \
  --aluno-run ../extracted/passaporte-aluno/20260923T002149Z-d2ef0ba5 \
  --professor-run ../extracted/passaporte-professor/<PROF_RUN> \
  --report ../extracted/join_report.md

pnpm pipeline:hints && pnpm pipeline:crop
```

If the screen dies mid-extract:

```bash
cd "/Users/justiceotuya/Downloads/Kuji Design System/passaporte"
screen -dmS passaporte-classify bash -lc '
  set -a; source .env; set +a
  export PYTHONUNBUFFERED=1
  set -euo pipefail
  cd pipeline
  uv run python extract.py --book passaporte-aluno --run-id 20260923T002149Z-d2ef0ba5 2>&1 | tee -a ../extracted/logs/extract-aluno.log
  uv run python extract_key.py --book passaporte-professor 2>&1 | tee -a ../extracted/logs/extract-professor.log
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] EXTRACT ALL DONE"
'
# Or: EXTRACT_ALUNO_RUN=20260923T002149Z-d2ef0ba5 bash scripts/resume-full-book.sh
```

---

## How to run

```bash
cd passaporte && pnpm install
pnpm web:test
pnpm web          # app
pnpm web:convex   # Convex auth/progress

# Full-book PDF (long-running)
EXTRACT_ALUNO_RUN=20260923T002149Z-d2ef0ba5 bash scripts/resume-full-book.sh
# Attach: screen -r passaporte-classify
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

Done: auth, classify 258/207, resume script harden (no false ALL DONE), extract resumed with --run-id 20260923T002149Z-d2ef0ba5.

Next: monitor extract-aluno.log until ~219 JSON + professor extract_key; then join + hints + crop. Google OAuth keys still pending.

Commands: screen -r passaporte-classify · tail -f extracted/logs/extract-aluno.log · pnpm web:test
```
