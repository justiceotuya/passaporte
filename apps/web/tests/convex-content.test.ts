import { afterEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");

function sampleItem(overrides: Partial<{ id: string; prompt: string }> = {}) {
  return {
    id: overrides.id ?? "pass-u99-p001-A-1",
    book: "passaporte" as const,
    unit: 99,
    page: 1,
    exercise: "A",
    type: "choice" as const,
    skill: "vocabulary" as const,
    topic: "test",
    instruction: "Escolha",
    instruction_en: "Choose",
    prompt: overrides.prompt ?? "Olá?",
    options: ["Oi", "Tchau"],
    answer: "Oi",
    accepted: ["Oi"],
    hint_en: "Greeting",
    answer_source: "generated" as const,
    review: { status: "pending" as const },
  };
}

describe("Convex content", () => {
  afterEach(() => {
    delete process.env.CONTENT_SEED_SECRET;
  });

  it("upserts a unit bundle and is idempotent on re-seed", async () => {
    const t = convexTest(schema, modules);
    process.env.CONTENT_SEED_SECRET = "test-seed-secret";

    const payload = {
      secret: "test-seed-secret",
      book: "passaporte" as const,
      unit: 99,
      title: "Unit 99",
      topics: ["greetings"],
      items: [sampleItem()],
    };

    const first = await t.mutation(api.content.seedUnitBundle, payload);
    expect(first.itemCount).toBe(1);

    const listed = await t.query(api.content.listUnits, { book: "passaporte" });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.itemCount).toBe(1);

    const second = await t.mutation(api.content.seedUnitBundle, {
      ...payload,
      title: "Unit 99 renamed",
      items: [
        sampleItem({ prompt: "Oi?" }),
        sampleItem({ id: "pass-u99-p001-A-2", prompt: "Tchau?" }),
      ],
    });
    expect(second.itemCount).toBe(2);
    expect(second.unitId).toBe(first.unitId);

    const unit = await t.query(api.content.getUnit, {
      book: "passaporte",
      unit: 99,
    });
    expect(unit?.title).toBe("Unit 99 renamed");
    expect(unit?.items).toHaveLength(2);
    expect(unit?.items.map((i) => i.id).sort()).toEqual([
      "pass-u99-p001-A-1",
      "pass-u99-p001-A-2",
    ]);

    await t.mutation(api.content.seedUnitBundle, {
      ...payload,
      title: "Unit 99 trimmed",
      items: [sampleItem({ id: "pass-u99-p001-A-2", prompt: "Só um" })],
    });
    const trimmed = await t.query(api.content.getUnit, {
      book: "passaporte",
      unit: 99,
    });
    expect(trimmed?.items).toHaveLength(1);
    expect(trimmed?.items[0]?.id).toBe("pass-u99-p001-A-2");
  });

  it("rejects seed without matching CONTENT_SEED_SECRET", async () => {
    const t = convexTest(schema, modules);
    process.env.CONTENT_SEED_SECRET = "expected";
    await expect(
      t.mutation(api.content.seedUnitBundle, {
        secret: "wrong",
        book: "passaporte",
        unit: 1,
        title: "Nope",
        topics: [],
        items: [sampleItem()],
      }),
    ).rejects.toThrow(/Unauthorized seed/i);
  });

  it("updates item review via updateItemReview", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.content.upsertUnitBundle, {
      book: "passaporte",
      unit: 1,
      title: "U1",
      topics: [],
      items: [sampleItem({ id: "pass-u01-review-1" })],
    });

    await t.mutation(api.content.updateItemReview, {
      itemId: "pass-u01-review-1",
      status: "approved",
      by: "admin@test",
    });

    const item = await t.query(api.content.getItem, {
      itemId: "pass-u01-review-1",
    });
    expect(item?.review.status).toBe("approved");
    expect(item?.review.by).toBe("admin@test");
  });
});
