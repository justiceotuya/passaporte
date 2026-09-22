import { describe, expect, it } from "vitest";
import {
  buildUnitProgressList,
  isItemMastered,
  unitAttemptPercent,
} from "@/lib/unit-progress";
import type { AttemptRecord } from "@/lib/progress-store";

function attempt(
  itemId: string,
  correct: boolean,
  overrides: Partial<AttemptRecord> = {},
): AttemptRecord {
  return {
    itemId,
    correct,
    answerGiven: "x",
    attemptNo: 1,
    sessionId: "s",
    createdAt: new Date().toISOString(),
    xp: correct ? 10 : 0,
    ...overrides,
  };
}

describe("unit progress", () => {
  it("computes attempt percent", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const attempts = [attempt("a", true), attempt("b", false)];
    expect(unitAttemptPercent(ids, attempts)).toBe(0.4);
  });

  it("requires two trailing correct attempts for mastery", () => {
    expect(isItemMastered("a", [attempt("a", true)])).toBe(false);
    expect(
      isItemMastered("a", [attempt("a", true), attempt("a", true)]),
    ).toBe(true);
    expect(
      isItemMastered("a", [
        attempt("a", true),
        attempt("a", false),
        attempt("a", true),
      ]),
    ).toBe(false);
  });

  it("locks later units until prior reaches 60%", () => {
    const units = [
      { unit: 1, itemIds: Array.from({ length: 10 }, (_, i) => `u1-${i}`) },
      { unit: 2, itemIds: Array.from({ length: 10 }, (_, i) => `u2-${i}`) },
      { unit: 3, itemIds: Array.from({ length: 10 }, (_, i) => `u3-${i}`) },
    ];
    const none = buildUnitProgressList(units, []);
    expect(none[0].lockState).toBe("available");
    expect(none[1].lockState).toBe("locked");
    expect(none[2].lockState).toBe("locked");

    const half = buildUnitProgressList(
      units,
      units[0].itemIds.slice(0, 5).map((id) => attempt(id, true)),
    );
    expect(half[0].lockState).toBe("in_progress");
    expect(half[1].lockState).toBe("locked");

    const unlocked = buildUnitProgressList(
      units,
      units[0].itemIds.slice(0, 6).map((id) => attempt(id, true)),
    );
    expect(unlocked[0].percent).toBe(0.6);
    expect(unlocked[1].lockState).toBe("available");
    expect(unlocked[2].lockState).toBe("locked");
  });

  it("marks unit complete at 80% attempted", () => {
    const units = [
      { unit: 1, itemIds: Array.from({ length: 10 }, (_, i) => `u1-${i}`) },
    ];
    const progress = buildUnitProgressList(
      units,
      units[0].itemIds.slice(0, 8).map((id) => attempt(id, true)),
    );
    expect(progress[0].lockState).toBe("complete");
  });
});
