import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const profileSettings = v.object({
  accentStrictness: v.union(v.literal("lenient"), v.literal("strict")),
  sessionLength: v.number(),
  heartsEnabled: v.boolean(),
  hintsEnabled: v.boolean(),
  typedMode: v.boolean(),
});

export default defineSchema({
  profiles: defineTable({
    userId: v.string(),
    displayName: v.string(),
    settings: profileSettings,
  }).index("by_user", ["userId"]),

  attempts: defineTable({
    userId: v.string(),
    itemId: v.string(),
    correct: v.boolean(),
    answerGiven: v.string(),
    attemptNo: v.number(),
    sessionId: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_item", ["userId", "itemId"]),

  itemState: defineTable({
    userId: v.string(),
    itemId: v.string(),
    ease: v.number(),
    intervalDays: v.number(),
    dueAt: v.number(),
    mastery: v.number(),
  })
    .index("by_user_item", ["userId", "itemId"])
    .index("by_user_due", ["userId", "dueAt"]),

  sessions: defineTable({
    userId: v.string(),
    unitId: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    xp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_started", ["userId", "startedAt"]),

  itemReports: defineTable({
    userId: v.string(),
    itemId: v.string(),
    note: v.string(),
    createdAt: v.number(),
  }).index("by_item", ["itemId"]),
});
