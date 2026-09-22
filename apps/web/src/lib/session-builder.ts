import type { PassaporteItem } from "@/types/item";

export type SessionPlan = {
  itemIds: string[];
  newCount: number;
  dueCount: number;
};

const MIN_SIZE = 12;
const MAX_SIZE = 15;
const DUE_RATIO = 0.3;
const MATCH_PAIR_CAP = 8;

export function isPlayableItem(item: PassaporteItem): boolean {
  if (item.type === "choice" || item.type === "true_false") return true;
  if (item.type === "fill_blank") {
    const answer = String(item.answer ?? "").trim();
    return Boolean(answer) && answer !== "PENDING";
  }
  if (item.type === "match") {
    const pairs =
      Array.isArray(item.answer) &&
      item.answer.length > 0 &&
      typeof item.answer[0] === "object"
        ? (item.answer as { left: string; right: string }[])
        : (item.pairs ?? []);
    return pairs.length >= 2 && pairs.length <= MATCH_PAIR_CAP;
  }
  if (item.type === "order") {
    const seq =
      Array.isArray(item.answer) && typeof item.answer[0] === "string"
        ? (item.answer as string[])
        : (item.sequence ?? []);
    return seq.length >= 2;
  }
  if (item.type === "transform") {
    const answer = String(item.answer ?? "").trim();
    return Boolean(answer) && answer !== "PENDING";
  }
  if (item.type === "listen_choice") {
    return (
      Boolean(item.transcript?.trim()) &&
      Array.isArray(item.options) &&
      item.options.length >= 2
    );
  }
  return false;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build a 12–15 item session: ~70% new from the unit, ~30% from due queue when non-empty.
 */
export function buildSession(input: {
  unitItems: PassaporteItem[];
  dueItemIds: string[];
  size?: number;
  random?: () => number;
}): SessionPlan {
  const sizeCap = Math.min(
    MAX_SIZE,
    input.unitItems.length + input.dueItemIds.length,
  );
  const size =
    input.size != null
      ? Math.min(sizeCap, Math.max(1, input.size))
      : Math.min(sizeCap, MIN_SIZE);

  const unitIds = input.unitItems.map((i) => i.id);
  const dueInUnit = input.dueItemIds.filter((id) => unitIds.includes(id));
  const dueOutside = input.dueItemIds.filter((id) => !unitIds.includes(id));

  const targetDue = dueInUnit.length + dueOutside.length === 0
    ? 0
    : Math.min(
        Math.round(size * DUE_RATIO),
        dueInUnit.length + dueOutside.length,
        size,
      );

  const duePool = shuffle([...dueInUnit, ...dueOutside]);
  const selectedDue = duePool.slice(0, targetDue);
  const selectedDueSet = new Set(selectedDue);

  const newPool = shuffle(unitIds.filter((id) => !selectedDueSet.has(id)));
  const needNew = size - selectedDue.length;
  const selectedNew = newPool.slice(0, needNew);

  // If still short, fill from remaining unit items
  const picked = new Set([...selectedDue, ...selectedNew]);
  for (const id of unitIds) {
    if (picked.size >= size) break;
    if (!picked.has(id)) {
      selectedNew.push(id);
      picked.add(id);
    }
  }

  const itemIds = shuffle([...selectedDue, ...selectedNew]).slice(0, size);

  return {
    itemIds,
    newCount: itemIds.filter((id) => !selectedDueSet.has(id)).length,
    dueCount: itemIds.filter((id) => selectedDueSet.has(id)).length,
  };
}
