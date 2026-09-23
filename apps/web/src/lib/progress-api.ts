export type ProgressSnapshot = {
  dueItemIds: string[];
  streakDays: number;
  totalXp: number;
};

export type ProgressAttemptBody = {
  type: "attempt";
  itemId: string;
  correct: boolean;
  answerGiven: string;
  attemptNo: number;
  sessionId: string;
};

export type ProgressFinishBody = {
  type: "finish";
  sessionId: string;
  unitId: string;
  xp: number;
  missedItemIds: string[];
  answeredItems: { itemId: string; correct: boolean }[];
};

export type ProgressBody = ProgressAttemptBody | ProgressFinishBody;

/** GET /api/progress — remote snapshot (Convex when signed in). */
export async function fetchProgressSnapshot(): Promise<ProgressSnapshot> {
  const res = await fetch("/api/progress");
  if (!res.ok) {
    throw new Error(`progress ${res.status}`);
  }
  return (await res.json()) as ProgressSnapshot;
}

/** POST /api/progress — sync attempt or session finish. */
export async function postProgress(body: ProgressBody): Promise<ProgressSnapshot> {
  const res = await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`progress ${res.status}`);
  }
  return (await res.json()) as ProgressSnapshot;
}
