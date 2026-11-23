import { NextResponse } from "next/server";
import { loadUnit } from "@/lib/content";

type Props = {
  params: Promise<{ unit: string }>;
};

/** GET /api/content/units/:unit — one unit with items. */
export async function GET(_request: Request, { params }: Props) {
  const { unit: raw } = await params;
  const unitNum = Number(raw);
  if (!Number.isFinite(unitNum) || unitNum < 1) {
    return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
  }

  try {
    const unit = await loadUnit(unitNum);
    return NextResponse.json(unit);
  } catch {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }
}
