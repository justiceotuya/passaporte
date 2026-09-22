import { NextResponse } from "next/server";

/**
 * Thin progress API so MSW can mock the same HTTP shapes in tests.
 * Browser happy-path still uses Zustand/localStorage directly.
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
  return NextResponse.json(memory);
}

export async function POST(request: Request) {
  let body: {
    type: "attempt" | "finish";
    dueItemIds?: string[];
    xp?: number;
    missedItemIds?: string[];
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.type === "finish") {
    memory.totalXp += body.xp ?? 0;
    const due = new Set(memory.dueItemIds);
    for (const id of body.missedItemIds ?? []) due.add(id);
    memory.dueItemIds = [...due];
    if ((body.xp ?? 0) > 0 || (body.missedItemIds?.length ?? 0) >= 0) {
      memory.streakDays = Math.max(1, memory.streakDays);
    }
  }

  return NextResponse.json(memory);
}
