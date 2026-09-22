import { applySm2, type Sm2State } from "./sm2";

/** Shared SM-2 update for Convex finishSession and tests. */
export function sm2BatchUpdate(
  existing: Record<string, Sm2State | undefined>,
  outcomes: { itemId: string; correct: boolean }[],
  now = Date.now(),
): Record<string, Sm2State> {
  const next: Record<string, Sm2State> = { ...existing } as Record<string, Sm2State>;
  for (const row of outcomes) {
    next[row.itemId] = applySm2(existing[row.itemId], row.correct, now);
  }
  return next;
}
