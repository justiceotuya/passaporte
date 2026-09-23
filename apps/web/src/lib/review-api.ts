import type { ReviewQueueItem } from "@/lib/content-review";
import type { ReviewStatus } from "@/types/item";

export type ReviewActionBody = {
  itemId: string;
  status: ReviewStatus;
  prompt?: string;
};

export type ReviewQueueResponse = {
  items: ReviewQueueItem[];
};

/** GET /api/admin/review — pending (or filtered) review queue. */
export async function fetchReviewQueue(
  status: ReviewStatus = "pending",
  opts?: { bypass?: boolean },
): Promise<ReviewQueueItem[]> {
  const headers: Record<string, string> = {};
  if (opts?.bypass) headers["x-passaporte-admin-bypass"] = "1";

  const res = await fetch(
    `/api/admin/review?status=${encodeURIComponent(status)}`,
    { headers },
  );
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Failed (${res.status})`);
  }
  const body = (await res.json()) as ReviewQueueResponse;
  return body.items ?? [];
}

/** POST /api/admin/review — approve / reject / edit prompt. */
export async function postReviewAction(
  body: ReviewActionBody,
  opts?: { bypass?: boolean },
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts?.bypass) headers["x-passaporte-admin-bypass"] = "1";

  const res = await fetch("/api/admin/review", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Failed (${res.status})`);
  }
}
