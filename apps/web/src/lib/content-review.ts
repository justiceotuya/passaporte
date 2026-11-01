import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveContentDir } from "@/lib/content-dir";
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

function loadAllUnits(): PassaporteUnit[] {
  return readdirSync(CONTENT_DIR)
    .filter((name) => /^u\d{2}\.json$/.test(name))
    .sort()
    .map(
      (name) =>
        JSON.parse(readFileSync(path.join(CONTENT_DIR, name), "utf8")) as PassaporteUnit,
    );
}

export function listReviewQueue(status: ReviewStatus = "pending"): ReviewQueueItem[] {
  const rows: ReviewQueueItem[] = [];
  for (const unit of loadAllUnits()) {
    for (const item of unit.items) {
      if (item.review?.status !== status) continue;
      rows.push({
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
      });
    }
  }
  return rows;
}

export function updateItemReview(input: {
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

  return {
    id: next.id,
    unit: next.unit,
    page: next.page,
    exercise: next.exercise,
    type: next.type,
    prompt: next.prompt,
    instruction: next.instruction,
    answer: next.answer,
    options: next.options,
    hint_en: next.hint_en,
    review: next.review,
  };
}
