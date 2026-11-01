# Roadmap

Work I plan to do on Passaporte, roughly in priority order. Estimates are for my own pace.

## Next up

- [ ] **Audio for listening exercises** (~5h): `listen_choice` items currently show the transcript only. Generate European Portuguese TTS clips (or fall back to the Web Speech API), add play/replay controls, and hide the transcript until after answering.
- [ ] **Google sign-in** (~2h): wire `GOOGLE_CLIENT_ID`/`SECRET` locally and on Convex, and make sure the invite-only allowlist applies to OAuth sign-ups too.
- [ ] **Deploy** (~3h): Vercel + Convex production deployment with invite-only sign-up, environment docs, and a CI job that runs the Playwright suite against a production build.
- [ ] **More original sample units** (~4h): grow `content/sample/` from 3 to 6 units (family, home, daily routine) so a fresh clone gives a full first week of practice.

## Content pipeline

- [ ] **Better answer-key matching** (~6h): the join stage still leaves many exercises without a matched teacher-key answer. Improve printed↔PDF page mapping and multi-blank answer splitting, and add regression fixtures.
- [ ] **Tighter image crops** (~4h): improve bounding boxes for exercise stimulus images and add a crop QA view in the admin board.
- [ ] **Second book support** (~6h): the schema already knows `valer`. Add classify/extract prompts and a join strategy for a second book layout.

## Learning experience

- [ ] **In-app exercise editor** (~6h): create and edit original items from the admin board (with schema validation), instead of editing JSON by hand.
- [ ] **Mistake review mode** (~3h): a session built only from recently missed items, with the hint shown up front.
- [ ] **Offline / installable PWA** (~3h): cache units and queue progress sync for practice on the train.
- [ ] **Accessibility pass** (~3h): keyboard-only play for every exercise type, screen-reader labels for match/order tiles, and reduced-motion support.

## Maintenance

- [ ] Fix the `import.meta.glob` type error in `tests/convex-progress.test.ts` and add `tsc --noEmit` to CI (~1h).
- [ ] e2e coverage for review queue, stats and settings persistence (~2h).
