# Passaporte — Testing plan

**Rule:** A phase is not done until its **Exit suite** is written, run, and logged in `PROGRESS.md` → “Latest test run log”. Prefer failing tests first when adding behavior (TDD-friendly).

---

## Conventions

| Area | Tooling (target) |
| --- | --- |
| Schema / content JSON | AJV or similar in CI; pytest + jsonschema in pipeline |
| Pipeline (Python) | pytest |
| Web unit / component | Vitest + Testing Library |
| Grader / session builder | Vitest (pure functions, no UI) |
| E2E | Playwright |
| Convex | convex-test or unit-test wrappers around mutations/queries where practical |

Run commands will be filled in as packages are scaffolded. Until then, use the **Exit suite** checklist as the contract.

---

## Phase 0 — Scaffold

**Exit suite**

- [x] `passaporte/` contains expected dirs: `apps/web`, `pipeline`, `schema`, `content`, `gold`
- [x] `.gitignore` excludes `raw/`, `extracted/`, `.env*`, `node_modules/`, `.venv/`, `__pycache__/`
- [x] `raw/pdf/` resolves to the three named PDFs (symlink or copy)
- [x] Smoke: `test -f raw/pdf/passaporte-aluno.pdf` (and professor + valer) succeeds

**Run:** `pnpm test:phase0` → `bash scripts/smoke-scaffold.sh`

---

## Phase 1 — Schema

**Exit suite**

- [x] Valid fixture item(s) validate against `schema/item.schema.json`
- [x] Invalid fixtures fail for: missing `id`, bad `type` enum, missing `answer` on closed types, empty `prompt`
- [x] `hint_en` required for closed types (JSON Schema `allOf` + Pydantic)
- [x] Generated TS types and Pydantic models accept the same valid fixture

**Run:** `pnpm test:phase1`  
(or `pnpm --filter @passaporte/web exec vitest run schema` + `cd pipeline && uv run pytest tests/test_schema.py -q`)

---

## Phase 2 — Pipeline

**Exit suite (must stay green before any full-book run)**

- [x] **Classify (calibration):** aluno + professor pages 10–40 → `pages.json`
- [x] **Extract (calibration):** aluno 10–40 (29 pages / ~301 items)
- [x] **extract_key (calibration):** professor 10–40 (22 pages / 298 answers)
- [x] **join (calibration):** draft `content/passaporte/u01–u07.json` + `gold/join_report.md`
- [x] **hints (calibration):** closed items `hint_en` generated; answer-leak check + retry
- [x] **crop (calibration):** `needs_image` → `apps/web/public/crops/*.webp` (bbox or full-page fallback)
- [ ] Failed pages append to `failures.jsonl` and do not invent answers

**Run (example):** `make calibrate` + `pytest pipeline/tests/` + `pnpm pipeline:join` + `pnpm pipeline:crop` + `pnpm pipeline:hints`

---

## Phase 3 — Tokens / UI primitives

**Exit suite**

- [x] Token map test: required CSS/Tailwind keys exist (primary, success, error, warning, book-ink, radii, spacing scale)
- [x] Book-voice class uses serif family; chrome components do not
- [x] Light-mode success/error hexes are the AA pair from templates (`#0A7A48`, `#C02D30`), not dark-mode candy greens/corals on cream

**Run:** `pnpm --filter @passaporte/web exec vitest run tokens`

---

## Phase 4 — App skeleton (auth + progress mock)

**Exit suite**

- [x] Better Auth email+password wired; Google stubbed in UI
- [x] SQLite auth DB under `apps/web/data/` (gitignored)
- [x] MSW mocks auth + progress HTTP in Vitest (`msw@2.7.x` — pin; 2.15 path matching broke tests)
- [x] Zustand + localStorage progress store
- [x] Convex schema + progress mutations/queries + provider (SQLite auth kept until `convex login`)
- [x] `/api/progress` bridges to Convex when `NEXT_PUBLIC_CONVEX_URL` is set
- [x] `convex-test` covers recordAttempt / finishSession / unauthenticated reject

**Run:** `pnpm --filter @passaporte/web exec vitest run` (+ `pnpm web:convex` after login)

**Blocker:** full Better Auth → Convex adapter cutover needs interactive `npx convex login` on the machine.

---

## Phase 5a–5b — Grader + early player

**Exit suite**

- [x] Grader: normalise, accent rules, XP 10/5/0
- [x] Session builder: 12–15, ~30% due
- [x] Choice / true_false components + hint + inline feedback
- [x] Playwright: short fixture session + sign-up smoke
- [x] `stimulus_image` render (max 240px)
- [x] `fill_blank` tiles + typed (diacritics row)
- [x] `match` pair-tap (≤8 pairs)

**Run:** `pnpm --filter @passaporte/web exec vitest run` · `pnpm web:e2e`

---

## Phase 2 (partial) — Rasterize

**Exit suite (partial)**

- [x] `rasterize.py` CLI + unit tests (mocked pdftoppm)
- [x] Live calibration raster of pages 10–40 (aluno + professor)
- [x] Full rasterize all pages for aluno (258), professor (207), valer (245) + thumbs

**Run:** `bash scripts/rasterize-all.sh` · `cd pipeline && uv run pytest tests/test_rasterize.py -q`

Note: outputs live under `raw/` and must stay **gitignored**.

### 5c Remaining item types

- [x] `fill_blank` tiles + typed + diacritics row
- [x] `match` pair-tap
- [ ] `order`, `transform`, `listen_choice` transcript

### 5d Session end / SRS / stats

- [ ] `sessions.finish` updates streak + SM-2 fields as specified
- [ ] Hearts: off = no early end; on = 0 hearts ends session

### 5e Full E2E

- [ ] Playwright: sign in (or test user) → start unit → answer through fixture `u01` session → see summary
- [ ] PostHog events fired in test mode or asserted via mock

**Run (example):** `pnpm --filter web test && pnpm --filter web test:e2e`

---

## Phase 6 — Admin review

**Exit suite**

- [ ] Approve / edit / reject update review status on item
- [ ] Keyboard shortcuts documented and tested (`a`, `e`, `r`, next)
- [ ] Non-admin cannot access route (or route disabled in prod)

**Run (example):** `pnpm --filter web test -- review` + Playwright admin path

---

## Phase 7 — Content ship

**Exit suite**

- [ ] Every shipped `content/**/*.json` validates against schema in CI
- [ ] Unit ships only if 100% closed items `review.status === approved`
- [ ] Smoke play one session per newly shipped unit (manual OK if logged; prefer Playwright against fixtures)

---

## CI (when repo exists)

Minimum PR checks:

1. Schema validate all `content/**`
2. `pytest` pipeline
3. `vitest` web
4. Playwright smoke (can be nightly if too slow for every PR — still required before calling Phase 5 done)

---

## Logging template (paste into PROGRESS.md)

```
| YYYY-MM-DD | Phase N | `<command>` | PASS / FAIL — notes |
```
