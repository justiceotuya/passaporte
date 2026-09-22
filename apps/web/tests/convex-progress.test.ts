import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s");

describe("Convex progress", () => {
  it("records attempts and finishes a session with due items", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_test" });

    await asUser.mutation(api.progress.recordAttempt, {
      itemId: "pass-u01-p010-A-1",
      correct: false,
      answerGiven: "errado",
      attemptNo: 2,
      sessionId: "sess-1",
    });

    const finish = await asUser.mutation(api.progress.finishSession, {
      sessionId: "sess-1",
      unitId: "passaporte-u01",
      xp: 15,
      missedItemIds: ["pass-u01-p010-A-1"],
    });

    expect(finish.dueItemIds).toContain("pass-u01-p010-A-1");
    expect(finish.xp).toBe(15);

    const snapshot = await asUser.query(api.progress.getSnapshot, {});
    expect(snapshot.dueItemIds).toContain("pass-u01-p010-A-1");
    expect(snapshot.totalXp).toBe(15);
    expect(snapshot.streakDays).toBeGreaterThanOrEqual(1);
  });

  it("accepts bridgeUserId when Convex auth identity is absent", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.progress.recordAttempt, {
      bridgeUserId: "sqlite_user_1",
      itemId: "pass-u01-p011-B-2",
      correct: true,
      answerGiven: "sim",
      attemptNo: 1,
      sessionId: "local-1",
    });

    const snapshot = await t.query(api.progress.getSnapshot, {
      bridgeUserId: "sqlite_user_1",
    });
    expect(snapshot.totalXp).toBe(0);
  });

  it("rejects unauthenticated progress writes", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.progress.recordAttempt, {
        itemId: "x",
        correct: true,
        answerGiven: "a",
        attemptNo: 1,
        sessionId: "s",
      }),
    ).rejects.toThrow(/Unauthenticated/i);
  });
});
