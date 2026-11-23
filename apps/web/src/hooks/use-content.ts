"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchUnit, fetchUnitList } from "@/lib/content-api";
import { queryKeys } from "@/lib/query-keys";
import type { UnitSummary } from "@/lib/content";
import type { PassaporteUnit } from "@/types/item";

/** Unit summaries (map). Pass `initialData` from RSC for first paint. */
export function useUnitList(opts?: { initialData?: UnitSummary[] }) {
  return useQuery({
    queryKey: queryKeys.units,
    queryFn: fetchUnitList,
    initialData: opts?.initialData,
    staleTime: 60_000,
  });
}

/** One unit with items. Pass `initialData` from RSC for first paint. */
export function useUnit(
  unit: number,
  opts?: { initialData?: PassaporteUnit },
) {
  return useQuery({
    queryKey: queryKeys.unit(unit),
    queryFn: () => fetchUnit(unit),
    enabled: Number.isFinite(unit) && unit >= 1,
    initialData: opts?.initialData,
    staleTime: 60_000,
  });
}
