import { NextResponse } from "next/server";
import { assertAdminAccess, isAdminBypassEnabled } from "@/lib/admin";
import { listReviewQueue, updateItemReview } from "@/lib/content-review";
import { getSessionUser } from "@/lib/session-user";
import type { ReviewStatus } from "@/types/item";

async function requireAdmin(request: Request) {
  const user = await getSessionUser();
  const bypassHeader = request.headers.get("x-passaporte-admin-bypass") === "1";
  return assertAdminAccess({
    email: user?.email,
    bypass: bypassHeader && isAdminBypassEnabled(),
  });
}

export async function GET(request: Request) {
  const access = await requireAdmin(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") as ReviewStatus | null) ?? "pending";
  try {
    const items = await listReviewQueue(status);
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load review queue";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const access = await requireAdmin(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: {
    itemId?: string;
    status?: ReviewStatus;
    notes?: string;
    prompt?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.itemId || !body.status) {
    return NextResponse.json(
      { error: "itemId and status required" },
      { status: 400 },
    );
  }
  if (!["approved", "rejected", "pending"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const user = await getSessionUser();
  let updated;
  try {
    updated = await updateItemReview({
      itemId: body.itemId,
      status: body.status,
      by: user?.email ?? "admin-bypass",
      notes: body.notes,
      prompt: body.prompt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update review";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ item: updated });
}
