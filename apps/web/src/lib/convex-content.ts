import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { getConvexUrl, isConvexConfigured } from "@/lib/convex-env";
import type {
  PassaporteItem,
  PassaporteUnit,
  ReviewStatus,
} from "@/types/item";

export type ConvexUnitSummary = {
  unit: number;
  title: string;
  topics: string[];
  itemCount: number;
  itemIds: string[];
};

type ReviewQueueRow = Pick<
  PassaporteItem,
  | "id"
  | "unit"
  | "page"
  | "exercise"
  | "type"
  | "prompt"
  | "instruction"
  | "instruction_en"
  | "answer"
  | "options"
  | "hint_en"
  | "stimulus_image"
  | "review"
>;

function client(): ConvexHttpClient | null {
  const url = getConvexUrl();
  if (!url) return null;
  return new ConvexHttpClient(url);
}

/** Server-side Convex content bridge (public queries). */
export async function convexListUnits(
  book: "passaporte" | "valer" = "passaporte",
): Promise<ConvexUnitSummary[] | null> {
  if (!isConvexConfigured()) return null;
  const c = client();
  if (!c) return null;
  const rows = await c.query(api.content.listUnits, { book });
  return rows.map((row) => ({
    unit: row.unit,
    title: row.title,
    topics: row.topics ?? [],
    itemCount: row.itemCount,
    itemIds: row.itemIds ?? [],
  }));
}

export async function convexGetUnit(
  unit: number,
  book: "passaporte" | "valer" = "passaporte",
): Promise<PassaporteUnit | null> {
  if (!isConvexConfigured()) return null;
  const c = client();
  if (!c) return null;
  const row = await c.query(api.content.getUnit, { book, unit });
  if (!row) return null;
  return {
    book: row.book,
    unit: row.unit,
    title: row.title,
    topics: row.topics,
    items: row.items as PassaporteItem[],
  };
}

export async function convexGetItem(
  itemId: string,
): Promise<PassaporteItem | null> {
  if (!isConvexConfigured()) return null;
  const c = client();
  if (!c) return null;
  const row = await c.query(api.content.getItem, { itemId });
  return (row as PassaporteItem | null) ?? null;
}

/** Admin review queue (used by content-review when CONTENT_SOURCE=convex). */
export async function convexListReviewQueue(
  status: ReviewStatus,
  book: "passaporte" | "valer" = "passaporte",
): Promise<ReviewQueueRow[] | null> {
  if (!isConvexConfigured()) return null;
  const c = client();
  if (!c) return null;
  const rows = await c.query(api.content.listReviewQueue, { status, book });
  return rows as ReviewQueueRow[];
}

export async function convexUpdateItemReview(input: {
  itemId: string;
  status: ReviewStatus;
  by: string;
  notes?: string;
  prompt?: string;
}): Promise<ReviewQueueRow | null> {
  if (!isConvexConfigured()) return null;
  const c = client();
  if (!c) return null;
  const updated = await c.mutation(api.content.updateItemReview, input);
  if (!updated) return null;
  return {
    id: updated.id,
    unit: updated.unit,
    page: updated.page,
    exercise: updated.exercise,
    type: updated.type,
    prompt: updated.prompt,
    instruction: updated.instruction,
    instruction_en: updated.instruction_en,
    answer: updated.answer,
    options: updated.options,
    hint_en: updated.hint_en,
    stimulus_image: updated.stimulus_image,
    review: updated.review,
  };
}
