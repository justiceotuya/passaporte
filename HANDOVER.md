# Passaporte — Handover

Use this when your context/token budget is low.

1. Update **`PROGRESS.md`** (Done, Remaining, test log, Current focus in the handover prompt section).
2. Confirm **`TESTING.md`** exit suite for anything you finished was run green.
3. Open a **new chat** and paste the fenced **Handover prompt** from the bottom of `PROGRESS.md`.

Do not rely on chat history. The next model should be able to continue from those three files + the design doc + `templates/passaporte/` alone.
