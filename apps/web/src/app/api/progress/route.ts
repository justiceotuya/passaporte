import { NextResponse } from "next/server";
import {
  convexFinishSession,
  convexGetSnapshot,
  convexRecordAttempt,
} from "@/lib/convex-progress";
import { getSessionUserId } from "@/lib/session-user";
import { isConvexConfigured } from "@/lib/convex-env";

/**
 * Progress API:
 * - Always returns/updates an in-memory snapshot (MSW-friendly, e2e-safe).
 * - When Convex is configured + a Better Auth session exists, also mirrors
 *   writes to Convex via the temporary bridgeUserId path.
 */

export type ProgressSnapshot = {
  dueItemIds: string[];
  streakDays: number;
  totalXp: number;
};

const memory: ProgressSnapshot = {
  dueItemIds: [],
  streakDays: 0,
  totalXp: 0,
};

export async function GET() {
  if (isConvexConfigured()) {
    const userId = await getSessionUserId();
    if (userId) {
      try {
        const remote = await convexGetSnapshot(userId);
        if (remote) {
          memory.dueItemIds = remote.dueItemIds;
          memory.streakDays = remote.streakDays;
          memory.totalXp = remote.totalXp;
        }
      } catch {
        // Fall through to memory — local/dev without a live deployment.
      }
    }
  }
  return NextResponse.json(memory);
}

export async function POST(request: Request) {
  let body: {
    type: "attempt" | "finish";
    itemId?: string;
    correct?: boolean;
    answerGiven?: string;
    attemptNo?: number;
    sessionId?: string;
    unitId?: string;
    dueItemIds?: string[];
    xp?: number;
    missedItemIds?: string[];
    answeredItems?: { itemId: string; correct: boolean }[];
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = isConvexConfigured() ? await getSessionUserId() : null;

  if (body.type === "attempt" && userId) {
    try {
      await convexRecordAttempt({
        bridgeUserId: userId,
        itemId: body.itemId ?? "unknown",
        correct: Boolean(body.correct),
        answerGiven: body.answerGiven ?? "",
        attemptNo: body.attemptNo ?? 1,
        sessionId: body.sessionId ?? "local",
      });
    } catch {
      // Keep memory path green if Convex is unreachable.
    }
  }

  if (body.type === "finish") {
    memory.totalXp += body.xp ?? 0;
    const due = new Set(memory.dueItemIds);
    for (const id of body.missedItemIds ?? []) due.add(id);
    memory.dueItemIds = [...due];
    if ((body.xp ?? 0) > 0 || (body.missedItemIds?.length ?? 0) >= 0) {
      memory.streakDays = Math.max(1, memory.streakDays);
    }

    if (userId) {
      try {
        const remote = await convexFinishSession({
          bridgeUserId: userId,
          sessionId: body.sessionId ?? "local",
          unitId: body.unitId ?? "unknown",
          xp: body.xp ?? 0,
          missedItemIds: body.missedItemIds ?? [],
          answeredItems: body.answeredItems,
        });
        if (remote) {
          memory.dueItemIds = remote.dueItemIds;
          memory.streakDays = remote.streakDays;
          memory.totalXp = remote.totalXp;
        }
      } catch {
        // Memory already updated.
      }
    }
  }

  return NextResponse.json(memory);
}
