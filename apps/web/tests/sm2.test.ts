import { describe, expect, it } from "vitest";
import { applySm2, initialSm2State, isDue } from "@/lib/sm2";
import { sm2BatchUpdate } from "@/lib/sm2-batch";

describe("SM-2", () => {
  it("marks misses immediately due with ease floor", () => {
    const now = 1_700_000_000_000;
    const next = applySm2(initialSm2State(now), false, now);
    expect(next.intervalDays).toBe(1);
    expect(next.ease).toBeGreaterThanOrEqual(1.3);
    expect(next.mastery).toBe(0);
    expect(next.dueAt).toBe(now);
    expect(isDue(next, now)).toBe(true);
  });

  it("grows interval on success", () => {
    const now = 1_700_000_000_000;
    const first = applySm2(null, true, now);
    expect(first.intervalDays).toBe(1);
    const second = applySm2(first, true, now + first.intervalDays * 86_400_000);
    expect(second.intervalDays).toBeGreaterThanOrEqual(2);
    expect(second.ease).toBeGreaterThan(first.ease);
  });

  it("isDue respects dueAt", () => {
    const now = 1_000;
    expect(isDue({ ease: 2.5, intervalDays: 1, dueAt: 500, mastery: 0 }, now)).toBe(
      true,
    );
    expect(isDue({ ease: 2.5, intervalDays: 1, dueAt: 2000, mastery: 0 }, now)).toBe(
      false,
    );
  });

  it("batch updates multiple item outcomes", () => {
    const now = 1_700_000_000_000;
    const next = sm2BatchUpdate(
      {},
      [
        { itemId: "a", correct: true },
        { itemId: "b", correct: false },
      ],
      now,
    );
    expect(next.a.intervalDays).toBe(1);
    expect(next.b.intervalDays).toBe(1);
    expect(next.b.mastery).toBe(0);
    expect(Object.keys(next)).toEqual(["a", "b"]);
  });
});
