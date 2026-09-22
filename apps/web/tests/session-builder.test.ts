import { describe, expect, it } from "vitest";
import { buildSession, isPlayableItem } from "@/lib/session-builder";
import type { PassaporteItem } from "@/types/item";

function fakeItem(id: string, overrides: Partial<PassaporteItem> = {}): PassaporteItem {
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
    ...overrides,
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

  it("respects an explicit small size for e2e / short drills", () => {
    const unitItems = Array.from({ length: 20 }, (_, i) =>
      fakeItem(`pass-u01-p010-A-${i + 1}`),
    );
    const plan = buildSession({ unitItems, dueItemIds: [], size: 3 });
    expect(plan.itemIds.length).toBe(3);
  });

  it("marks fill_blank and small match sets playable", () => {
    expect(isPlayableItem(fakeItem("pass-u01-p010-A-1", { type: "fill_blank" }))).toBe(
      true,
    );
    expect(
      isPlayableItem(
        fakeItem("pass-u01-p010-B-1", {
          type: "match",
          pairs: [
            { left: "a", right: "1" },
            { left: "b", right: "2" },
          ],
          answer: [
            { left: "a", right: "1" },
            { left: "b", right: "2" },
          ],
        }),
      ),
    ).toBe(true);
    expect(
      isPlayableItem(
        fakeItem("pass-u01-p010-C-1", {
          type: "match",
          pairs: Array.from({ length: 12 }, (_, i) => ({
            left: `L${i}`,
            right: `${i}`,
          })),
        }),
      ),
    ).toBe(false);
    expect(
      isPlayableItem(
        fakeItem("pass-u01-p010-D-1", {
          type: "order",
          sequence: ["a", "b", "c"],
          answer: ["a", "b", "c"],
        }),
      ),
    ).toBe(true);
    expect(
      isPlayableItem(
        fakeItem("pass-u01-p010-E-1", {
          type: "transform",
          answer: "PENDING",
        }),
      ),
    ).toBe(false);
    expect(
      isPlayableItem(
        fakeItem("pass-u01-p010-F-1", {
          type: "listen_choice",
          options: ["A", "B"],
          transcript: "Olá",
          answer: "A",
        }),
      ),
    ).toBe(true);
  });
});
