import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

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

const reviewStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);

const review = v.object({
  status: reviewStatus,
  by: v.optional(v.string()),
  at: v.optional(v.string()),
  notes: v.optional(v.string()),
});

/** Seed/payload shape aligned with PassaporteItem (`id` → stored as `itemId`). */
const contentItem = v.object({
  id: v.string(),
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
});

type ContentItemDoc = Doc<"items">;

function toPassaporteItem(doc: ContentItemDoc) {
  return {
    id: doc.itemId,
    book: doc.book,
    unit: doc.unit,
    page: doc.page,
    exercise: doc.exercise,
    type: doc.type,
    skill: doc.skill,
    topic: doc.topic,
    instruction: doc.instruction,
    instruction_en: doc.instruction_en,
    prompt: doc.prompt,
    options: doc.options,
    pairs: doc.pairs,
    sequence: doc.sequence,
    answer: doc.answer,
    accepted: doc.accepted,
    hint_en: doc.hint_en,
    stimulus_image: doc.stimulus_image,
    transcript: doc.transcript,
    audio: doc.audio,
    answer_source: doc.answer_source,
    review: doc.review,
  };
}

function sortItems(rows: ContentItemDoc[]): ContentItemDoc[] {
  return [...rows].sort((a, b) => a.ord - b.ord);
}

const MAX_UNITS = 100;
const MAX_ITEMS_PER_UNIT = 500;

export const listUnits = query({
  args: {
    book: v.optional(bookId),
  },
  handler: async (ctx, args) => {
    const book = args.book ?? "passaporte";
    const rows = await ctx.db
      .query("units")
      .withIndex("by_book_unit", (q) => q.eq("book", book))
      .take(MAX_UNITS);

    const sorted = rows.sort((a, b) => a.unit - b.unit);
    const summaries = [];
    for (const row of sorted) {
      const itemRows = await ctx.db
        .query("items")
        .withIndex("by_unitId", (q) => q.eq("unitId", row._id))
        .take(MAX_ITEMS_PER_UNIT);
      summaries.push({
        book: row.book,
        unit: row.unit,
        title: row.title,
        topics: row.topics,
        itemCount: row.itemCount,
        itemIds: sortItems(itemRows).map((item) => item.itemId),
        updatedAt: row.updatedAt,
      });
    }
    return summaries;
  },
});

export const getUnit = query({
  args: {
    book: v.optional(bookId),
    unit: v.number(),
  },
  handler: async (ctx, args) => {
    const book = args.book ?? "passaporte";
    const unitDoc = await ctx.db
      .query("units")
      .withIndex("by_book_unit", (q) =>
        q.eq("book", book).eq("unit", args.unit),
      )
      .unique();

    if (!unitDoc) return null;

    const itemRows = await ctx.db
      .query("items")
      .withIndex("by_unitId", (q) => q.eq("unitId", unitDoc._id))
      .take(MAX_ITEMS_PER_UNIT);

    return {
      book: unitDoc.book,
      unit: unitDoc.unit,
      title: unitDoc.title,
      topics: unitDoc.topics,
      items: sortItems(itemRows).map(toPassaporteItem),
    };
  },
});

export const getItem = query({
  args: {
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("items")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .unique();
    if (!row) return null;
    return toPassaporteItem(row);
  },
});

function toReviewQueueItem(doc: ContentItemDoc) {
  return {
    id: doc.itemId,
    unit: doc.unit,
    page: doc.page,
    exercise: doc.exercise,
    type: doc.type,
    prompt: doc.prompt,
    instruction: doc.instruction,
    instruction_en: doc.instruction_en,
    answer: doc.answer,
    options: doc.options,
    hint_en: doc.hint_en,
    stimulus_image: doc.stimulus_image,
    review: doc.review,
  };
}

/** Admin review queue filtered by review.status (scans units for the book). */
export const listReviewQueue = query({
  args: {
    status: reviewStatus,
    book: v.optional(bookId),
  },
  handler: async (ctx, args) => {
    const book = args.book ?? "passaporte";
    const units = await ctx.db
      .query("units")
      .withIndex("by_book_unit", (q) => q.eq("book", book))
      .take(MAX_UNITS);

    const rows: ReturnType<typeof toReviewQueueItem>[] = [];
    for (const unit of units.sort((a, b) => a.unit - b.unit)) {
      const items = await ctx.db
        .query("items")
        .withIndex("by_unitId", (q) => q.eq("unitId", unit._id))
        .take(MAX_ITEMS_PER_UNIT);
      for (const item of sortItems(items)) {
        if (item.review.status === args.status) {
          rows.push(toReviewQueueItem(item));
        }
      }
    }
    return rows;
  },
});

type UnitBundleArgs = {
  book: "passaporte" | "valer" | "sample";
  unit: number;
  title: string;
  topics: string[];
  items: Array<{
    id: string;
    book: "passaporte" | "valer" | "sample";
    unit: number;
    page: number;
    exercise: string;
    type: ContentItemDoc["type"];
    skill: ContentItemDoc["skill"];
    topic: string;
    instruction: string;
    instruction_en?: string;
    prompt: string;
    options?: string[];
    pairs?: Array<{ left: string; right: string }>;
    sequence?: string[];
    answer: ContentItemDoc["answer"];
    accepted: string[];
    hint_en?: string;
    stimulus_image?: string | null;
    transcript?: string;
    audio?: string | null;
    answer_source: ContentItemDoc["answer_source"];
    review: ContentItemDoc["review"];
  }>;
};

/** Shared idempotent upsert used by internal + seed-secret public mutation. */
async function upsertUnitBundleHandler(ctx: MutationCtx, args: UnitBundleArgs) {
  const now = Date.now();
  const existingUnit = await ctx.db
    .query("units")
    .withIndex("by_book_unit", (q) =>
      q.eq("book", args.book).eq("unit", args.unit),
    )
    .unique();

  let unitId: Id<"units">;
  if (existingUnit) {
    unitId = existingUnit._id;
    await ctx.db.patch(unitId, {
      title: args.title,
      topics: args.topics,
      itemCount: args.items.length,
      updatedAt: now,
    });
  } else {
    unitId = await ctx.db.insert("units", {
      book: args.book,
      unit: args.unit,
      title: args.title,
      topics: args.topics,
      itemCount: args.items.length,
      updatedAt: now,
    });
  }

  const existingItems = await ctx.db
    .query("items")
    .withIndex("by_unitId", (q) => q.eq("unitId", unitId))
    .take(MAX_ITEMS_PER_UNIT);

  const byItemId = new Map(
    existingItems.map((row) => [row.itemId, row] as const),
  );
  const keepIds = new Set<string>();

  for (let i = 0; i < args.items.length; i += 1) {
    const item = args.items[i];
    keepIds.add(item.id);
    const fields = {
      unitId,
      itemId: item.id,
      book: item.book,
      unit: item.unit,
      page: item.page,
      exercise: item.exercise,
      type: item.type,
      skill: item.skill,
      topic: item.topic,
      instruction: item.instruction,
      instruction_en: item.instruction_en,
      prompt: item.prompt,
      options: item.options,
      pairs: item.pairs,
      sequence: item.sequence,
      answer: item.answer,
      accepted: item.accepted,
      hint_en: item.hint_en,
      stimulus_image: item.stimulus_image,
      transcript: item.transcript,
      audio: item.audio,
      answer_source: item.answer_source,
      review: item.review,
      ord: i,
    };

    const prev = byItemId.get(item.id);
    if (prev) {
      await ctx.db.replace(prev._id, fields);
    } else {
      await ctx.db.insert("items", fields);
    }
  }

  for (const row of existingItems) {
    if (!keepIds.has(row.itemId)) {
      await ctx.db.delete(row._id);
    }
  }

  return {
    unitId,
    itemCount: args.items.length,
    updatedAt: now,
  };
}

const unitBundleArgs = {
  book: bookId,
  unit: v.number(),
  title: v.string(),
  topics: v.array(v.string()),
  items: v.array(contentItem),
};

/**
 * Idempotent seed upsert: one unit meta + its items.
 * Replaces items for the unit so removed JSON items are deleted.
 * Callable via `npx convex run content:upsertUnitBundle`.
 */
export const upsertUnitBundle = internalMutation({
  args: unitBundleArgs,
  handler: async (ctx, args) => upsertUnitBundleHandler(ctx, args),
});

/**
 * Public seed entrypoint for scripts (ConvexHttpClient).
 * Requires `CONTENT_SEED_SECRET` on the Convex deployment and matching
 * `CONTENT_SEED_SECRET` in the caller's environment.
 */
export const seedUnitBundle = mutation({
  args: {
    secret: v.string(),
    book: bookId,
    unit: v.number(),
    title: v.string(),
    topics: v.array(v.string()),
    items: v.array(contentItem),
  },
  handler: async (ctx, args) => {
    const expected = process.env.CONTENT_SEED_SECRET?.trim();
    if (!expected || args.secret !== expected) {
      throw new Error(
        "Unauthorized seed: set CONTENT_SEED_SECRET on the Convex deployment and pass the same value from the seed script",
      );
    }
    return await upsertUnitBundleHandler(ctx, {
      book: args.book,
      unit: args.unit,
      title: args.title,
      topics: args.topics,
      items: args.items,
    });
  },
});

/** Admin review: update `review` (and optional prompt) on an item. */
export const updateItemReview = mutation({
  args: {
    itemId: v.string(),
    status: reviewStatus,
    by: v.string(),
    notes: v.optional(v.string()),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("items")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .unique();

    if (!row) return null;

    const nextReview = {
      status: args.status,
      by: args.by,
      at: new Date().toISOString(),
      notes: args.notes ?? row.review.notes,
    };

    const patch: {
      review: typeof nextReview;
      prompt?: string;
    } = { review: nextReview };

    const trimmed = args.prompt?.trim();
    if (trimmed) {
      patch.prompt = trimmed;
    }

    await ctx.db.patch(row._id, patch);
    const updated = await ctx.db.get(row._id);
    return updated ? toPassaporteItem(updated) : null;
  },
});
