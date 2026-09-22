"use client";

import type { PassaporteUnit } from "@/types/item";
import type { UnitSummary } from "@/lib/content";
import { UnitDetail } from "@/components/UnitDetail";
import { useProgressStore } from "@/lib/progress-store";
import { buildUnitProgressList } from "@/lib/unit-progress";

type Props = {
  unit: PassaporteUnit;
  summaries: UnitSummary[];
};

export function UnitDetailClient({ unit, summaries }: Props) {
  const attempts = useProgressStore((s) => s.attempts);
  const progress = buildUnitProgressList(
    summaries.map((s) => ({ unit: s.unit, itemIds: s.itemIds })),
    attempts,
  );
  const state = progress.find((p) => p.unit === unit.unit);
  const locked = state?.lockState === "locked";

  return <UnitDetail unit={unit} locked={Boolean(locked)} />;
}
