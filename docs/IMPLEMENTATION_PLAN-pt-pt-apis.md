# Implementation Plan: European Portuguese (`pt-PT`) API Integrations

This plan breaks [`PRD-pt-pt-apis.md`](./PRD-pt-pt-apis.md) into six incremental, shippable phases. Each phase leaves `pnpm test:schema`, `pnpm content:validate`, `pnpm web:test`, and `pnpm pipeline:test` green before moving to the next.

---

## Phase 0 — Shared Contract & Environment Setup (~1h)

Align the JSON Schema, TypeScript types, Pydantic models, `.gitignore`, and `.env.example` so every downstream phase builds on one contract.

### Changes
1. **[`schema/item.schema.json`](../schema/item.schema.json)**
   - Add optional property:
     ```json
     "audio": {
       "type": ["string", "null"],
       "description": "Path under apps/web/public/ (audio/local/ for pipeline output, audio/sample/ for demo content), or null"
     }
     ```
2. **[`apps/web/src/types/item.ts`](../apps/web/src/types/item.ts)**
   - Add `audio?: string | null;` to `PassaporteItem`.
3. **[`pipeline/models.py`](../pipeline/models.py)**
   - Add `audio: str | None = None` to `PassaporteItem`.
4. **[`.gitignore`](../.gitignore)**
   - Add `apps/web/public/audio/local/` (keep `apps/web/public/audio/sample/` committable, mirroring `crops/` vs `samples/`).
5. **[`.env.example`](../.env.example)**
   - Document optional vars: `VOICERSS_API_KEY`, `LANGUAGETOOL_API_URL`, `UNSPLASH_ACCESS_KEY`, `DEEPL_API_KEY`.
6. **[`package.json`](../package.json)**
   - Add root scripts:
     - `pipeline:audio`: `cd pipeline && uv run python audio.py`
     - `pipeline:lint-pt`: `cd pipeline && uv run python lint_pt.py`

### Verification
- `pnpm test:schema`
- `pnpm content:validate`

---

## Phase 1 — F1: European Portuguese Listening Audio (~5h)

Delivers Roadmap #1 (`Audio for listening exercises`) with build-time VoiceRSS `pt-PT` clips and a browser Web Speech fallback.

### Pipeline (`pipeline/`)
1. **Create `pipeline/audio.py`** (following the exact CLI/unit-loading pattern of `pipeline/hints.py`):
   - Args: `--content-dir`, `--out-dir` (default `apps/web/public/audio/local`), `--url-prefix` (default `audio/local`), `--units`, `--limit`, `--include-answers`, `--rate` (default `0`), `--force`, `--dry-run`.
   - Calls VoiceRSS (`https://api.voicerss.org/`) with `hl=pt-pt`, `c=MP3`, `f=44khz_16bit_mono`, `src=<transcript>`.
   - Writes `<out-dir>/<item.id>.mp3`, sets `item["audio"] = "<url-prefix>/<item.id>.mp3"`, validates `PassaporteUnit`, and saves JSON.
   - Logs failures to `failures.jsonl` with `stage: "audio"`.
2. **Create `pipeline/tests/test_audio.py`**:
   - Test item selection (`listen_choice` with missing `audio`, skip existing unless `--force`, `--dry-run`, mocked VoiceRSS HTTP client, failure logging).
3. *(Optional one-time run)* Generate committed MP3 clips for `content/sample/` into `apps/web/public/audio/sample/` so a fresh clone plays real `pt-PT` audio out of the box.

### Web (`apps/web/`)
1. **Create `apps/web/src/lib/speech.ts`**:
   - Thin wrapper around `window.speechSynthesis` selecting a `pt-PT` voice (preferring exact `pt-PT` / `pt_PT` match, exposing `voiceMatch: "pt-PT" | "pt-fallback" | "none"`), supporting `speak(text, { rate })` and `stop()`.
2. **Upgrade [`apps/web/src/components/ListenTranscript.tsx`](../apps/web/src/components/ListenTranscript.tsx)** (or extract `AudioPlayer.tsx` used by it):
   - Props: `{ transcript: string; audio?: string | null; locked?: boolean }`.
   - Renders **Play / Pause**, **Replay**, and **0.8× Slow** buttons.
   - Plays static `<audio src={href}>` when `audio` is provided; falls back to `speech.ts` otherwise.
   - When `locked` is `true` (`phase === "playing"`), hides transcript by default behind a subtle "Show transcript" affordance (or locks until feedback, configurable via `LearnerSettings.hideTranscriptUntilFeedback`, default `true`).
   - Cancels audio playback automatically on item change / unmount.
3. **Update [`apps/web/src/components/SessionPlayer.tsx`](../apps/web/src/components/SessionPlayer.tsx)**:
   - Pass `audio={current.audio}` and `locked={phase === "playing"}` to `ListenTranscript`.
   - Add a compact "Listen" button in `FeedbackBanner` (or below the revealed answer) to pronounce the canonical Portuguese answer.
4. **Tests**:
   - Vitest component tests for `ListenTranscript` (static audio mode, Web Speech fallback, transcript hidden during playing & revealed on feedback).
   - Playwright assertion in `apps/web/e2e/session.spec.ts` verifying play controls render and transcript reveals after answering.

### Verification
- `pnpm pipeline:test`
- `pnpm web:test`
- `pnpm content:validate && pnpm content:ship-gate`

---

## Phase 2 — F2: `pt-PT` OCR & Spelling Lint Pass (~3h)

Catches scanned PDF OCR errors (dropped accents/cedillas) and `pt-BR` phrasing before items pass `/admin/review`.

### Pipeline (`pipeline/`)
1. **Create `pipeline/lint_pt.py`**:
   - Args: `--content-dir`, `--units`, `--limit`, `--api-url` (default `LANGUAGETOOL_API_URL` or `https://api.languagetool.org/v2/check`), `--report` (default `extracted/lint_report.md`), `--delay-ms` (default `3500` for public fair-use limit), `--dry-run`.
   - Checks `instruction`, `prompt` (stripping `___` blank placeholders cleanly so blanks don't trigger false positives), `transcript`, and string `answer` with `language=pt-PT`.
   - Writes grouped Markdown report by unit/item ID with rule ID, offending snippet, and top 3 replacements.
2. **Create `pipeline/tests/test_lint_pt.py`**:
   - Mock LanguageTool response; test blank-placeholder masking, report generation, `--dry-run`, and graceful handling of HTTP 429/5xx.

### Web (`apps/web/`)
1. **Create `apps/web/src/lib/languagetool.ts`**:
   - Shared server-side client for LanguageTool `v2/check` (`language=pt-PT`), 3s `AbortSignal.timeout`, max text length guard, normalized `GrammarIssue[]` return type, and small in-memory LRU cache (reused in Phase 4).
2. **Create `apps/web/src/app/api/admin/lint-pt/route.ts`**:
   - Reuses `assertAdminAccess` from `src/lib/admin.ts` (same auth pattern as `/api/admin/review/route.ts`).
   - `POST` `{ text: string }` → `{ issues: GrammarIssue[] }`.
3. **Update [`apps/web/src/components/AdminReviewBoard.tsx`](../apps/web/src/components/AdminReviewBoard.tsx)**:
   - Add a "Check PT-PT (`L`)" button using TanStack Query mutation against `/api/admin/lint-pt`.
   - Render compact warning pills beneath the prompt with one-click "Apply fix" that populates the existing `promptForm` editor.
4. **Tests**:
   - Add MSW handler in `apps/web/src/mocks/handlers.ts` for `/api/admin/lint-pt`.
   - Vitest tests for `languagetool.ts`, route auth (`401`/`403` vs `200`), and `AdminReviewBoard` lint interaction.

### Verification
- `pnpm pipeline:test`
- `pnpm web:test`

---

## Phase 3 — F4: Anti-Spoiler Tap-to-Define Word Popover (~4h)

Gives learners instant in-session word definitions and Lisbon IPA without leaking answers.

### Web (`apps/web/`)
1. **Create `apps/web/src/lib/spoiler-guard.ts`**:
   - Port `answer_strings()` and `_fold()` from [`pipeline/hints.py`](../pipeline/hints.py) into TypeScript: `extractSpoilerTokens(item: PassaporteItem): Set<string>` and `isSpoilerToken(word: string, spoilers: Set<string>): boolean`.
2. **Create `apps/web/src/lib/wiktionary.ts`** & **`apps/web/src/app/api/lookup/route.ts`**:
   - Sanitize `word` query param (1–40 chars, Unicode letters/hyphens only).
   - Fetch `https://en.wiktionary.org/api/rest_v1/page/definition/<word>` (with descriptive `User-Agent` header per Wikimedia policy), extracting the `pt` section (part of speech, English glosses, gender notes).
   - Optional secondary lookup or wikitext parse for Lisbon `(Portugal)` IPA when missing.
   - Server-side LRU cache (e.g., 500 words, 24h TTL) + `Cache-Control: public, max-age=86400`.
3. **Create `apps/web/src/components/WordLookupText.tsx`** & **`WordLookupPopover.tsx`**:
   - Tokenizes Portuguese sentences while preserving punctuation and `___` blanks.
   - During `phase === "playing"`, tokens flagged by `isSpoilerToken()` render as plain non-interactive text; all other words open `WordLookupPopover` on click/Enter.
   - Popover uses TanStack Query (`queryKey: ["lookup", normalizedWord]`), displays glosses, gender, IPA, and a `pt-PT` Listen button (`speech.ts`), plus link to Wiktionary.
4. **Integrate in [`apps/web/src/components/SessionPlayer.tsx`](../apps/web/src/components/SessionPlayer.tsx)**:
   - Wrap `current.prompt` and revealed `transcript` in `WordLookupText`, passing `spoilers={phase === "playing" ? spoilerSet : EMPTY_SET}`.
5. **Tests**:
   - Unit tests for `spoiler-guard.ts` (diacritics, multi-word answers, `accepted` variants, `match` pairs).
   - Unit tests for Wiktionary parser + MSW handler in `apps/web/src/mocks/handlers.ts`.
   - Component + E2E test confirming spoiler token is blocked during `playing` and clickable during `feedback`.

### Verification
- `pnpm web:test`
- `pnpm web:e2e`

---

## Phase 4 — F3: Unlock `open` Items & Smart Typed Mistake Diagnostics (~5h)

Turns skipped `open` textbook prompts into playable practice and upgrades typed `fill_blank` / `transform` attempt-1 feedback.

### Web (`apps/web/`)
1. **Create `apps/web/src/app/api/grammar-check/route.ts`**:
   - `POST` `{ text: string }` (capped at 500 chars) → delegates to `src/lib/languagetool.ts` (`language=pt-PT`).
   - Respects session auth in production (same pattern as `/api/progress/route.ts`).
2. **Smart attempt-1 feedback in [`SessionPlayer.tsx`](../apps/web/src/components/SessionPlayer.tsx) & [`FeedbackBanner.tsx`](../apps/web/src/components/FeedbackBanner.tsx)**:
   - Keep `gradeFillBlank()` and `gradeTransform()` untouched and synchronous.
   - On an incorrect attempt 1 (`!result.correct && attemptNo === 1`), fire a non-blocking query to `/api/grammar-check` with the learner's response (for `fill_blank`, reconstruct the sentence by substituting `___` with `given` so LanguageTool sees full agreement context).
   - Display up to 2 concise grammar/accent tips in `FeedbackBanner` when returned; show nothing extra on timeout/offline.
3. **Unlock `open` items**:
   - Add `includeOpenItems: boolean` (default `false`) to `LearnerSettings` in [`apps/web/src/lib/progress-store.ts`](../apps/web/src/lib/progress-store.ts) and expose toggle in `apps/web/src/app/settings/page.tsx`.
   - Update [`apps/web/src/lib/session-builder.ts`](../apps/web/src/lib/session-builder.ts): `isPlayableItem(item, { includeOpen?: boolean })` returns `true` for `type === "open"` when `includeOpen` is `true` and `prompt` is non-empty.
   - Create `apps/web/src/components/OpenResponseInput.tsx`: multiline textarea → "Check Portuguese" calls `/api/grammar-check` and highlights `pt-PT` issues → reveals model `answer` (if non-PENDING) → learner chooses "Feels solid" (`correct: true`, 10 XP) or "Needs review" (`correct: false`, queues for SM-2).
   - Wire `current.type === "open"` into `SessionPlayer.tsx`.
4. **Tests**:
   - MSW handler for `/api/grammar-check`.
   - Vitest tests for `session-builder.ts` (`includeOpen: false` default preserved, `includeOpen: true` includes `open`), `OpenResponseInput.tsx`, and `SessionPlayer` attempt-1 diagnostic tip + offline graceful fallback.

### Verification
- `pnpm web:test`
- `pnpm web:e2e`

---

## Phase 5 — F5: Sample Unit Image Helper & Optional DeepL Backend (~3h)

Speeds up authoring `content/sample/u04–u06` and lowers pipeline translation costs.

### Pipeline (`pipeline/`)
1. **Create `pipeline/fetch_sample_images.py`**:
   - Args: `--query`, `--slug`, `--out-dir` (default `apps/web/public/samples`), `--attribution-file` (default `content/sample/ATTRIBUTIONS.md`), `--max-width` (default `800`).
   - Uses `UNSPLASH_ACCESS_KEY` to search Unsplash (`per_page=1`, `orientation=landscape`), downloads the image, converts/resizes via Pillow to `.webp`, triggers Unsplash's required download-tracking endpoint, and appends credit to `content/sample/ATTRIBUTIONS.md`.
2. **Update [`pipeline/instructions_en.py`](../pipeline/instructions_en.py)**:
   - Add `--provider {anthropic,deepl}` (default `anthropic`) and `--target-lang` (default `EN-GB`).
   - Implement `request_translations_deepl()` calling `https://api-free.deepl.com/v2/translate` with `DEEPL_API_KEY`, reusing the exact same batching, `apply_batch_translations()`, retry, and failure-logging logic.
3. **Tests**:
   - `pipeline/tests/test_fetch_sample_images.py` (mocked Unsplash JSON + tiny in-memory PNG → `.webp` + attribution entry).
   - Extend `pipeline/tests/test_instructions_en.py` with mocked DeepL provider tests.

### Verification
- `pnpm pipeline:test`
- `pnpm content:validate && pnpm content:ship-gate`

---

## Cross-Phase Verification Checklist

Before merging each phase (or the full feature branch), run Passaporte's full exit suite:

```bash
pnpm test:schema
pnpm content:validate
pnpm content:ship-gate
pnpm pipeline:test
pnpm web:test
pnpm web:e2e
```
