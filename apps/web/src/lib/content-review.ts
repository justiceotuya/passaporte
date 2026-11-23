import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveContentDir } from "@/lib/content-dir";
import {
  convexListReviewQueue,
  convexUpdateItemReview,
} from "@/lib/convex-content";
import { getContentSource, isConvexConfigured } from "@/lib/convex-env";
import type { PassaporteItem, PassaporteUnit, ReviewStatus } from "@/types/item";

const CONTENT_DIR = resolveContentDir();

export type ReviewQueueItem = Pick<
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

function unitPath(unit: number): string {
  return path.join(CONTENT_DIR, `u${String(unit).padStart(2, "0")}.json`);
}

function toQueueItem(item: PassaporteItem): ReviewQueueItem {
  return {
    id: item.id,
    unit: item.unit,
    page: item.page,
    exercise: item.exercise,
    type: item.type,
    prompt: item.prompt,
    instruction: item.instruction,
    instruction_en: item.instruction_en,
    answer: item.answer,
    options: item.options,
    hint_en: item.hint_en,
    stimulus_image: item.stimulus_image,
    review: item.review,
  };
}

function loadAllUnits(): PassaporteUnit[] {
  return readdirSync(CONTENT_DIR)
    .filter((name) => /^u\d{2}\.json$/.test(name))
    .sort()
    .map(
      (name) =>
        JSON.parse(readFileSync(path.join(CONTENT_DIR, name), "utf8")) as PassaporteUnit,
    );
}

function listReviewQueueFs(status: ReviewStatus = "pending"): ReviewQueueItem[] {
  const rows: ReviewQueueItem[] = [];
  for (const unit of loadAllUnits()) {
    for (const item of unit.items) {
      if (item.review?.status !== status) continue;
      rows.push(toQueueItem(item));
    }
  }
  return rows;
}

function updateItemReviewFs(input: {
  itemId: string;
  status: ReviewStatus;
  by: string;
  notes?: string;
  prompt?: string;
}): ReviewQueueItem | null {
  const match = /^[a-z0-9]+-u(\d{2})-/.exec(input.itemId);
  if (!match) return null;
  const unitNum = Number(match[1]);
  const file = unitPath(unitNum);
  const unit = JSON.parse(readFileSync(file, "utf8")) as PassaporteUnit;
  const idx = unit.items.findIndex((item) => item.id === input.itemId);
  if (idx < 0) return null;

  const item = unit.items[idx];
  const next: PassaporteItem = {
    ...item,
    prompt: input.prompt?.trim() ? input.prompt.trim() : item.prompt,
    review: {
      status: input.status,
      by: input.by,
      at: new Date().toISOString(),
      notes: input.notes ?? item.review.notes,
    },
  };
  unit.items[idx] = next;
  writeFileSync(file, `${JSON.stringify(unit, null, 2)}\n`, "utf8");

  return toQueueItem(next);
}

function assertConvexReady(): void {
  if (!isConvexConfigured()) {
    throw new Error("CONTENT_SOURCE=convex requires NEXT_PUBLIC_CONVEX_URL");
  }
}

/**
 * Admin review queue. When CONTENT_SOURCE=convex, reads review status from
 * Convex (runtime store). Otherwise scans JSON from resolveContentDir().
 */
export async function listReviewQueue(
  status: ReviewStatus = "pending",
): Promise<ReviewQueueItem[]> {
  if (getContentSource() === "convex") {
    assertConvexReady();
    const rows = await convexListReviewQueue(status);
    if (rows === null) {
      throw new Error("CONTENT_SOURCE=convex requires NEXT_PUBLIC_CONVEX_URL");
    }
    return rows;
  }
  return listReviewQueueFs(status);
}

/**
 * Persist an admin review decision. Convex path uses updateItemReview
 * mutation; fs path still writes JSON (local pipeline / CONTENT_SOURCE=fs).
 */
export async function updateItemReview(input: {
  itemId: string;
  status: ReviewStatus;
  by: string;
  notes?: string;
  prompt?: string;
}): Promise<ReviewQueueItem | null> {
  if (getContentSource() === "convex") {
    assertConvexReady();
    return convexUpdateItemReview(input);
  }
  return updateItemReviewFs(input);
}
