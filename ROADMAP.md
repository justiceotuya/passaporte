# Roadmap

Work I plan to do on Passaporte, roughly in priority order. Estimates are for my own pace.

## Next up

- [ ] **Audio for listening exercises (`pt-PT`)** (~5h): `listen_choice` items currently show the transcript only. Add an optional `audio` schema field + `pipeline/audio.py` using VoiceRSS (`hl=pt-pt`) to pre-generate MP3 clips into `apps/web/public/audio/`, fall back to the browser Web Speech API (`pt-PT`), add play/replay controls, and keep the transcript hidden until feedback. (See `docs/PRD-pt-pt-apis.md` · F1)
- [ ] **Google sign-in** (~2h): wire `GOOGLE_CLIENT_ID`/`SECRET` locally and on Convex, and make sure the invite-only allowlist applies to OAuth sign-ups too.
- [ ] **Deploy** (~3h): Vercel + Convex production deployment with invite-only sign-up, environment docs, and a CI job that runs the Playwright suite against a production build.
- [ ] **More original sample units** (~4h): grow `content/sample/` from 3 to 6 units (family, home, daily routine) so a fresh clone gives a full first week of practice; add a build-time Unsplash image helper (`pipeline/fetch_sample_images.py`) for `stimulus_image` assets. (See `docs/PRD-pt-pt-apis.md` · F5)

## Content pipeline

- [ ] **European Portuguese (`pt-PT`) OCR & spelling lint** (~3h): add `pipeline/lint_pt.py` and an on-demand `/api/admin/lint-pt` check in the admin review board backed by LanguageTool (`language=pt-PT`) to flag OCR accent/cedilla typos and `pt-BR` mismatches before ship gate. (See `docs/PRD-pt-pt-apis.md` · F2)
- [ ] **Optional DeepL Free backend for `instructions_en.py`** (~2h): support `--provider deepl` (`500k chars/mo` free tier, `PT-PT` / `EN`) alongside Anthropic Haiku to cut pipeline translation cost to $0 when desired. (See `docs/PRD-pt-pt-apis.md` · F5)
- [ ] **Better answer-key matching** (~6h): the join stage still leaves many exercises without a matched teacher-key answer. Improve printed↔PDF page mapping and multi-blank answer splitting, and add regression fixtures.
- [ ] **Tighter image crops** (~4h): improve bounding boxes for exercise stimulus images and add a crop QA view in the admin board.
- [ ] **Second book support** (~6h): the schema already knows `valer`. Add classify/extract prompts and a join strategy for a second book layout.

## Learning experience

- [ ] **Anti-spoiler tap-to-define word popover** (~4h): add a cached `/api/lookup` route backed by Wiktionary (`en.wiktionary.org` / `pt.wiktionary.org`) showing English gloss, gender, and Lisbon IPA on click in prompts/transcripts, with target answer tokens blocked during `playing` and unlocked on `feedback`. (See `docs/PRD-pt-pt-apis.md` · F4)
- [ ] **Unlock `open` items & smart mistake diagnostics (`pt-PT`)** (~5h): add `/api/grammar-check` backed by LanguageTool (`language=pt-PT`) to enable free-response `open` textbook items and surface accent/agreement explanations on attempt-1 misses for typed `fill_blank` and `transform` items. (See `docs/PRD-pt-pt-apis.md` · F3)
- [ ] **In-app exercise editor** (~6h): create and edit original items from the admin board (with schema validation), instead of editing JSON by hand.
- [ ] **Mistake review mode** (~3h): a session built only from recently missed items, with the hint shown up front.
- [ ] **Offline / installable PWA** (~3h): cache units and queue progress sync for practice on the train.
- [ ] **Accessibility pass** (~3h): keyboard-only play for every exercise type, screen-reader labels for match/order tiles, and reduced-motion support.

## Maintenance

- [ ] Fix the `import.meta.glob` type error in `tests/convex-progress.test.ts` and add `tsc --noEmit` to CI (~1h).
- [ ] e2e coverage for review queue, stats and settings persistence (~2h).
