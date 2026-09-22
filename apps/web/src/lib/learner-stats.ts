import type { AttemptRecord } from "@/lib/progress-store";
import type { Sm2State } from "@/lib/sm2";

export type LearnerStats = {
  totalXp: number;
  streakDays: number;
  attemptCount: number;
  correctCount: number;
  accuracy: number;
  dueCount: number;
  masteredCount: number;
};

export function computeLearnerStats(input: {
  totalXp: number;
  streakDays: number;
  attempts: AttemptRecord[];
  dueItemIds: string[];
  itemStates: Record<string, Sm2State>;
}): LearnerStats {
  const attemptCount = input.attempts.length;
  const correctCount = input.attempts.filter((a) => a.correct).length;
  const masteredCount = Object.values(input.itemStates).filter(
    (s) => s.mastery >= 1,
  ).length;
  return {
    totalXp: input.totalXp,
    streakDays: input.streakDays,
    attemptCount,
    correctCount,
    accuracy: attemptCount === 0 ? 0 : correctCount / attemptCount,
    dueCount: input.dueItemIds.length,
    masteredCount,
  };
}
