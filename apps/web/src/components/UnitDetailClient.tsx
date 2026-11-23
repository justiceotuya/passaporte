"use client";

import type { PassaporteUnit } from "@/types/item";
import type { UnitSummary } from "@/lib/content";
import { UnitDetail } from "@/components/UnitDetail";
import { useUnit, useUnitList } from "@/hooks/use-content";
import { useProgressStore } from "@/lib/progress-store";
import { buildUnitProgressList } from "@/lib/unit-progress";

type Props = {
  unit: PassaporteUnit;
  summaries: UnitSummary[];
};

export function UnitDetailClient({ unit, summaries }: Props) {
  const { data: liveUnit = unit } = useUnit(unit.unit, { initialData: unit });
  const { data: liveSummaries = summaries } = useUnitList({
    initialData: summaries,
  });
  const attempts = useProgressStore((s) => s.attempts);
  const progress = buildUnitProgressList(
    liveSummaries.map((s) => ({ unit: s.unit, itemIds: s.itemIds })),
    attempts,
  );
  const state = progress.find((p) => p.unit === liveUnit.unit);
  const locked = state?.lockState === "locked";

  return <UnitDetail unit={liveUnit} locked={Boolean(locked)} />;
}
