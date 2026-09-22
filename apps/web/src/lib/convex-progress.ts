import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { getConvexUrl, isConvexConfigured } from "@/lib/convex-env";

export type ProgressSnapshot = {
  dueItemIds: string[];
  streakDays: number;
  totalXp: number;
};

function client(): ConvexHttpClient | null {
  const url = getConvexUrl();
  if (!url) return null;
  return new ConvexHttpClient(url);
}

/**
 * Server-side Convex progress bridge. Uses Better Auth's user id until the
 * official Convex Better Auth adapter owns identity (`ctx.auth`).
 */
export async function convexGetSnapshot(
  bridgeUserId: string,
): Promise<ProgressSnapshot | null> {
  if (!isConvexConfigured()) return null;
  const c = client();
  if (!c) return null;
  return await c.query(api.progress.getSnapshot, { bridgeUserId });
}

export async function convexRecordAttempt(input: {
  bridgeUserId: string;
  itemId: string;
  correct: boolean;
  answerGiven: string;
  attemptNo: number;
  sessionId: string;
}): Promise<boolean> {
  if (!isConvexConfigured()) return false;
  const c = client();
  if (!c) return false;
  await c.mutation(api.progress.recordAttempt, input);
  return true;
}

export async function convexFinishSession(input: {
  bridgeUserId: string;
  sessionId: string;
  unitId: string;
  xp: number;
  missedItemIds: string[];
  answeredItems?: { itemId: string; correct: boolean }[];
}): Promise<ProgressSnapshot | null> {
  if (!isConvexConfigured()) return null;
  const c = client();
  if (!c) return null;
  const result = await c.mutation(api.progress.finishSession, input);
  const snapshot = await c.query(api.progress.getSnapshot, {
    bridgeUserId: input.bridgeUserId,
  });
  return {
    dueItemIds: result.dueItemIds.length
      ? result.dueItemIds
      : snapshot.dueItemIds,
    streakDays: snapshot.streakDays,
    totalXp: snapshot.totalXp,
  };
}
