import { describe, expect, it } from "vitest";
import { buildSession } from "@/lib/session-builder";
import type { PassaporteItem } from "@/types/item";

function fakeItem(id: string): PassaporteItem {
  return {
    id,
    book: "passaporte",
    unit: 1,
    page: 10,
    exercise: "A",
    type: "choice",
    skill: "vocabulary",
    topic: "test",
    instruction: "Escolha.",
    prompt: "?",
    options: ["a", "b"],
    answer: "a",
    accepted: [],
    hint_en: "hint",
    answer_source: "generated",
    review: { status: "approved" },
  };
}

describe("session builder", () => {
  it("builds a session between 12 and 15 when enough items exist", () => {
    const unitItems = Array.from({ length: 20 }, (_, i) =>
      fakeItem(`pass-u01-p010-A-${i + 1}`),
    );
    const plan = buildSession({ unitItems, dueItemIds: [], size: 12 });
    expect(plan.itemIds.length).toBe(12);
    expect(plan.dueCount).toBe(0);
    expect(plan.newCount).toBe(12);
  });

  it("pulls about 30% from due when due queue is non-empty", () => {
    const unitItems = Array.from({ length: 20 }, (_, i) =>
      fakeItem(`pass-u01-p010-A-${i + 1}`),
    );
    const dueItemIds = unitItems.slice(0, 10).map((i) => i.id);
    const plan = buildSession({ unitItems, dueItemIds, size: 12 });
    expect(plan.itemIds.length).toBe(12);
    expect(plan.dueCount).toBeGreaterThan(0);
    expect(plan.dueCount).toBeLessThanOrEqual(4);
    expect(plan.newCount + plan.dueCount).toBe(12);
  });

  it("does not exceed available items", () => {
    const unitItems = Array.from({ length: 5 }, (_, i) =>
      fakeItem(`pass-u01-p010-A-${i + 1}`),
    );
    const plan = buildSession({ unitItems, dueItemIds: [], size: 12 });
    expect(plan.itemIds.length).toBe(5);
  });
});
