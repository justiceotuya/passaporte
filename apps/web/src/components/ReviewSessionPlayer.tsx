"use client";

import { useMemo } from "react";
import type { PassaporteUnit } from "@/types/item";
import { SessionPlayer } from "@/components/SessionPlayer";
import { useProgressStore } from "@/lib/progress-store";
import { isPlayableItem } from "@/lib/session-builder";
import Link from "next/link";

/** Filters unit items to due IDs for review sessions. */
export function ReviewSessionPlayer({
  unit,
  sessionSize,
}: {
  unit: PassaporteUnit;
  sessionSize?: number;
}) {
  const dueItemIds = useProgressStore((s) => s.dueItemIds);

  const reviewUnit = useMemo((): PassaporteUnit => {
    const due = new Set(dueItemIds);
    const items = unit.items.filter(
      (item) => isPlayableItem(item) && due.has(item.id),
    );
    return { ...unit, items };
  }, [unit, dueItemIds]);

  if (reviewUnit.items.length === 0) {
    return (
      <div
        className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col px-4 py-8"
        data-testid="review-session-empty"
      >
        <h1 className="font-display text-2xl font-semibold">Nothing due</h1>
        <p className="mt-2 text-ink-muted">
          No spaced-repetition items are due. Play a unit first.
        </p>
        <Link href="/review" className="btn-primary mt-6 inline-flex w-fit">
          Review queue
        </Link>
      </div>
    );
  }

  return <SessionPlayer unit={reviewUnit} sessionSize={sessionSize} />;
}
