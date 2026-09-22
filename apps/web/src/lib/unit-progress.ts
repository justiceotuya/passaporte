import type { AttemptRecord } from "@/lib/progress-store";

export type UnitLockState = "locked" | "available" | "in_progress" | "complete";

export type UnitProgress = {
  unit: number;
  attempted: number;
  total: number;
  percent: number;
  mastered: number;
  lockState: UnitLockState;
};

const UNLOCK_THRESHOLD = 0.6;
const COMPLETE_THRESHOLD = 0.8;

/** Unique item ids that have at least one attempt. */
export function attemptedItemIds(attempts: AttemptRecord[]): Set<string> {
  return new Set(attempts.map((a) => a.itemId));
}

/** Item is mastered when the last two attempts for it are both correct. */
export function isItemMastered(
  itemId: string,
  attempts: AttemptRecord[],
): boolean {
  const forItem = attempts.filter((a) => a.itemId === itemId);
  if (forItem.length < 2) return false;
  const lastTwo = forItem.slice(-2);
  return lastTwo.every((a) => a.correct);
}

export function unitAttemptPercent(
  itemIds: string[],
  attempts: AttemptRecord[],
): number {
  if (itemIds.length === 0) return 0;
  const attempted = attemptedItemIds(attempts);
  const count = itemIds.filter((id) => attempted.has(id)).length;
  return count / itemIds.length;
}

export function buildUnitProgressList(
  units: { unit: number; itemIds: string[] }[],
  attempts: AttemptRecord[],
): UnitProgress[] {
  const sorted = [...units].sort((a, b) => a.unit - b.unit);
  const result: UnitProgress[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const unit = sorted[i];
    const attemptedSet = attemptedItemIds(attempts);
    const attempted = unit.itemIds.filter((id) => attemptedSet.has(id)).length;
    const total = unit.itemIds.length;
    const percent = total === 0 ? 0 : attempted / total;
    const mastered = unit.itemIds.filter((id) =>
      isItemMastered(id, attempts),
    ).length;

    let lockState: UnitLockState;
    if (i === 0) {
      lockState =
        percent >= COMPLETE_THRESHOLD
          ? "complete"
          : percent > 0
            ? "in_progress"
            : "available";
    } else {
      const prev = result[i - 1];
      const unlocked = prev.percent >= UNLOCK_THRESHOLD;
      if (!unlocked) {
        lockState = "locked";
      } else if (percent >= COMPLETE_THRESHOLD) {
        lockState = "complete";
      } else if (percent > 0) {
        lockState = "in_progress";
      } else {
        lockState = "available";
      }
    }

    result.push({
      unit: unit.unit,
      attempted,
      total,
      percent,
      mastered,
      lockState,
    });
  }

  return result;
}
