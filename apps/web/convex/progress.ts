import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/identity";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export const getSnapshot = query({
  args: {
    bridgeUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, args.bridgeUserId);
    const now = Date.now();

    const dueRows = await ctx.db
      .query("itemState")
      .withIndex("by_user_due", (q) =>
        q.eq("userId", userId).lte("dueAt", now),
      )
      .take(100);

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_started", (q) => q.eq("userId", userId))
      .order("desc")
      .take(60);

    const totalXp = sessions.reduce((sum, row) => sum + row.xp, 0);

    let streakDays = 0;
    if (sessions.length > 0) {
      const days = new Set(
        sessions
          .filter((s) => s.endedAt != null)
          .map((s) => startOfUtcDay(s.endedAt!)),
      );
      let cursor = startOfUtcDay(now);
      while (days.has(cursor)) {
        streakDays += 1;
        cursor -= DAY_MS;
      }
      if (streakDays === 0) {
        const yesterday = startOfUtcDay(now) - DAY_MS;
        if (days.has(yesterday)) {
          cursor = yesterday;
          while (days.has(cursor)) {
            streakDays += 1;
            cursor -= DAY_MS;
          }
        }
      }
    }

    return {
      dueItemIds: dueRows.map((row) => row.itemId),
      streakDays,
      totalXp,
    };
  },
});

export const listDueItemIds = query({
  args: {
    bridgeUserId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, args.bridgeUserId);
    const now = Date.now();
    const rows = await ctx.db
      .query("itemState")
      .withIndex("by_user_due", (q) =>
        q.eq("userId", userId).lte("dueAt", now),
      )
      .take(args.limit ?? 50);
    return rows.map((row) => row.itemId);
  },
});

export const startSession = mutation({
  args: {
    bridgeUserId: v.optional(v.string()),
    unitId: v.string(),
    clientSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, args.bridgeUserId);
    const startedAt = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      userId,
      unitId: args.unitId,
      startedAt,
      xp: 0,
    });
    return {
      sessionId,
      clientSessionId: args.clientSessionId ?? String(sessionId),
      startedAt,
    };
  },
});

export const recordAttempt = mutation({
  args: {
    bridgeUserId: v.optional(v.string()),
    itemId: v.string(),
    correct: v.boolean(),
    answerGiven: v.string(),
    attemptNo: v.number(),
    sessionId: v.string(),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, args.bridgeUserId);
    const createdAt = args.createdAt ?? Date.now();

    await ctx.db.insert("attempts", {
      userId,
      itemId: args.itemId,
      correct: args.correct,
      answerGiven: args.answerGiven,
      attemptNo: args.attemptNo,
      sessionId: args.sessionId,
      createdAt,
    });

    return { ok: true as const };
  },
});

export const finishSession = mutation({
  args: {
    bridgeUserId: v.optional(v.string()),
    sessionId: v.string(),
    unitId: v.string(),
    xp: v.number(),
    missedItemIds: v.array(v.string()),
    answeredItems: v.optional(
      v.array(
        v.object({
          itemId: v.string(),
          correct: v.boolean(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, args.bridgeUserId);
    const endedAt = Date.now();

    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    const match = existing.find(
      (row) => String(row._id) === args.sessionId || row.unitId === args.unitId,
    );

    if (match && match.endedAt == null) {
      await ctx.db.patch(match._id, {
        endedAt,
        xp: args.xp,
      });
    } else {
      await ctx.db.insert("sessions", {
        userId,
        unitId: args.unitId,
        startedAt: endedAt,
        endedAt,
        xp: args.xp,
      });
    }

    const outcomes = new Map<string, boolean>();
    for (const row of args.answeredItems ?? []) {
      outcomes.set(row.itemId, row.correct);
    }
    for (const itemId of args.missedItemIds) {
      outcomes.set(itemId, false);
    }

    for (const [itemId, correct] of outcomes) {
      const existingState = await ctx.db
        .query("itemState")
        .withIndex("by_user_item", (q) =>
          q.eq("userId", userId).eq("itemId", itemId),
        )
        .unique();

      const prev = existingState
        ? {
            ease: existingState.ease,
            intervalDays: existingState.intervalDays,
            dueAt: existingState.dueAt,
            mastery: existingState.mastery,
          }
        : null;

      let ease = prev?.ease ?? 2.5;
      let intervalDays = prev?.intervalDays ?? 0;
      let mastery = prev?.mastery ?? 0;
      let dueAt: number;
      if (!correct) {
        ease = Math.max(1.3, ease - 0.2);
        intervalDays = 1;
        mastery = 0;
        // Immediately due so the review queue picks it up now.
        dueAt = endedAt;
      } else {
        ease = ease + 0.1;
        intervalDays = intervalDays <= 0 ? 1 : Math.max(1, Math.round(intervalDays * ease));
        mastery = Math.min(1, mastery + 0.34);
        dueAt = endedAt + intervalDays * DAY_MS;
      }

      if (existingState) {
        await ctx.db.patch(existingState._id, {
          ease,
          intervalDays,
          dueAt,
          mastery,
        });
      } else {
        await ctx.db.insert("itemState", {
          userId,
          itemId,
          ease,
          intervalDays,
          dueAt,
          mastery,
        });
      }
    }

    const snapshot = await ctx.db
      .query("itemState")
      .withIndex("by_user_due", (q) =>
        q.eq("userId", userId).lte("dueAt", endedAt),
      )
      .take(100);

    return {
      dueItemIds: snapshot.map((row) => row.itemId),
      xp: args.xp,
    };
  },
});
