import type { PassaporteUnit } from "@/types/item";
import type { UnitSummary } from "@/lib/content";

/** GET /api/content/units — unit summaries for the map. */
export async function fetchUnitList(): Promise<UnitSummary[]> {
  const res = await fetch("/api/content/units");
  if (!res.ok) {
    throw new Error(`content units ${res.status}`);
  }
  return (await res.json()) as UnitSummary[];
}

/** GET /api/content/units/:unit — one unit with items. */
export async function fetchUnit(unit: number): Promise<PassaporteUnit> {
  const res = await fetch(`/api/content/units/${unit}`);
  if (!res.ok) {
    throw new Error(`content unit ${res.status}`);
  }
  return (await res.json()) as PassaporteUnit;
}
