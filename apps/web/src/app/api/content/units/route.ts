import { NextResponse } from "next/server";
import { listUnitSummaries } from "@/lib/content";

/** GET /api/content/units — summaries for map / TanStack Query. */
export async function GET() {
  try {
    const units = await listUnitSummaries();
    return NextResponse.json(units);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Content unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
