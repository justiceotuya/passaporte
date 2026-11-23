import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const profileSettings = v.object({
  accentStrictness: v.union(v.literal("lenient"), v.literal("strict")),
  sessionLength: v.number(),
  heartsEnabled: v.boolean(),
  hintsEnabled: v.boolean(),
  typedMode: v.boolean(),
});

const bookId = v.union(
  v.literal("passaporte"),
  v.literal("valer"),
  v.literal("sample"),
);

const itemType = v.union(
  v.literal("choice"),
  v.literal("fill_blank"),
  v.literal("match"),
  v.literal("order"),
  v.literal("true_false"),
  v.literal("transform"),
  v.literal("listen_choice"),
  v.literal("open"),
);

const skill = v.union(
  v.literal("grammar"),
  v.literal("vocabulary"),
  v.literal("reading"),
  v.literal("listening"),
  v.literal("other"),
);

const matchPair = v.object({
  left: v.string(),
  right: v.string(),
});

const itemAnswer = v.union(
  v.string(),
  v.array(v.string()),
  v.array(matchPair),
);

const review = v.object({
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
  ),
  by: v.optional(v.string()),
  at: v.optional(v.string()),
  notes: v.optional(v.string()),
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

  units: defineTable({
    book: bookId,
    unit: v.number(),
    title: v.string(),
    topics: v.array(v.string()),
    itemCount: v.number(),
    updatedAt: v.number(),
  }).index("by_book_unit", ["book", "unit"]),

  items: defineTable({
    unitId: v.id("units"),
    itemId: v.string(),
    book: bookId,
    unit: v.number(),
    page: v.number(),
    exercise: v.string(),
    type: itemType,
    skill: skill,
    topic: v.string(),
    instruction: v.string(),
    instruction_en: v.optional(v.string()),
    prompt: v.string(),
    options: v.optional(v.array(v.string())),
    pairs: v.optional(v.array(matchPair)),
    sequence: v.optional(v.array(v.string())),
    answer: itemAnswer,
    accepted: v.array(v.string()),
    hint_en: v.optional(v.string()),
    stimulus_image: v.optional(v.union(v.string(), v.null())),
    transcript: v.optional(v.string()),
    audio: v.optional(v.union(v.string(), v.null())),
    answer_source: v.union(
      v.literal("teacher_book"),
      v.literal("student_book_key"),
      v.literal("generated"),
      v.literal("original"),
    ),
    review: review,
    /** Stable order within the unit (seed array index). */
    ord: v.number(),
  })
    .index("by_unitId", ["unitId"])
    .index("by_itemId", ["itemId"]),
});
