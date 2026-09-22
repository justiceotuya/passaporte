/** Simplified SM-2 for Passaporte item scheduling. */

export type Sm2State = {
  ease: number;
  intervalDays: number;
  dueAt: number;
  mastery: number;
};

export const DEFAULT_EASE = 2.5;

export function initialSm2State(now = Date.now()): Sm2State {
  return {
    ease: DEFAULT_EASE,
    intervalDays: 0,
    dueAt: now,
    mastery: 0,
  };
}

/**
 * Apply one review outcome.
 * Miss → interval 1 day, ease floor 1.3.
 * Hit → grow interval by ease (min 1 day on first success).
 */
export function applySm2(
  prev: Sm2State | null | undefined,
  correct: boolean,
  now = Date.now(),
): Sm2State {
  const current = prev ?? initialSm2State(now);
  if (!correct) {
    return {
      ease: Math.max(1.3, current.ease - 0.2),
      intervalDays: 1,
      // Immediately due so the review queue picks it up now.
      dueAt: now,
      mastery: 0,
    };
  }

  const ease = current.ease + 0.1;
  const intervalDays =
    current.intervalDays <= 0 ? 1 : Math.max(1, Math.round(current.intervalDays * ease));
  return {
    ease,
    intervalDays,
    dueAt: now + intervalDays * 24 * 60 * 60 * 1000,
    mastery: Math.min(1, current.mastery + 0.34),
  };
}

export function isDue(state: Sm2State, now = Date.now()): boolean {
  return state.dueAt <= now;
}
