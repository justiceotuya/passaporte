import { describe, expect, it } from "vitest";
import { computeLearnerStats } from "@/lib/learner-stats";

describe("learner stats", () => {
  it("computes accuracy and counts", () => {
    const stats = computeLearnerStats({
      totalXp: 40,
      streakDays: 2,
      attempts: [
        {
          itemId: "a",
          correct: true,
          answerGiven: "x",
          attemptNo: 1,
          sessionId: "s",
          createdAt: "2026-01-01",
          xp: 10,
        },
        {
          itemId: "b",
          correct: false,
          answerGiven: "y",
          attemptNo: 1,
          sessionId: "s",
          createdAt: "2026-01-01",
          xp: 0,
        },
      ],
      dueItemIds: ["b"],
      itemStates: {
        a: { ease: 2.6, intervalDays: 1, dueAt: 9e12, mastery: 1 },
        b: { ease: 2.3, intervalDays: 1, dueAt: 1, mastery: 0 },
      },
    });
    expect(stats.accuracy).toBe(0.5);
    expect(stats.dueCount).toBe(1);
    expect(stats.masteredCount).toBe(1);
    expect(stats.totalXp).toBe(40);
  });
});
