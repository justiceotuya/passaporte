"use client";

import Link from "next/link";
import type { PassaporteUnit } from "@/types/item";
import { useProgressStore } from "@/lib/progress-store";
import {
  attemptedItemIds,
  isItemMastered,
  unitAttemptPercent,
} from "@/lib/unit-progress";

type Props = {
  unit: PassaporteUnit;
  locked: boolean;
};

function groupByExercise(unit: PassaporteUnit) {
  const groups = new Map<
    string,
    { letter: string; skill: string; page: number; itemIds: string[] }
  >();
  for (const item of unit.items) {
    const key = item.exercise;
    const existing = groups.get(key);
    if (existing) {
      existing.itemIds.push(item.id);
    } else {
      groups.set(key, {
        letter: item.exercise,
        skill: item.skill,
        page: item.page,
        itemIds: [item.id],
      });
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.letter.localeCompare(b.letter),
  );
}

function masterySegments(
  itemIds: string[],
  attempts: ReturnType<typeof useProgressStore.getState>["attempts"],
): number {
  const mastered = itemIds.filter((id) => isItemMastered(id, attempts)).length;
  if (itemIds.length === 0) return 0;
  return Math.round((mastered / itemIds.length) * 3);
}

export function UnitDetail({ unit, locked }: Props) {
  const attempts = useProgressStore((s) => s.attempts);
  const dueItemIds = useProgressStore((s) => s.dueItemIds);
  const percent = Math.round(unitAttemptPercent(
    unit.items.map((i) => i.id),
    attempts,
  ) * 100);
  const attempted = attemptedItemIds(attempts);
  const unitDue = dueItemIds.filter((id) =>
    unit.items.some((item) => item.id === id),
  );
  const exercises = groupByExercise(unit);
  const playHref = `/play?unit=${unit.unit}`;
  const reviewHref = `/play?unit=${unit.unit}&review=1`;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-36 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/10 text-lg"
          aria-label="Back to map"
        >
          ←
        </Link>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
          Unit {unit.unit}
        </p>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div
          className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(#F67A1D 0 ${percent}%, rgba(252,245,239,0.1) ${percent}%)`,
          }}
        >
          <div className="flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full bg-surface-card">
            <span className="text-xl font-extrabold text-primary">{percent}%</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
              done
            </span>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{unit.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {unit.items.length} items ·{" "}
            {unit.items.filter((i) => attempted.has(i.id)).length} attempted
          </p>
        </div>
      </div>

      {(unit.topics ?? []).length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {(unit.topics ?? []).slice(0, 8).map((topic) => (
            <span
              key={topic}
              className="rounded-pill bg-ink/10 px-3 py-1.5 text-xs font-bold"
            >
              {topic}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">
        Exercises
      </p>
      <ul className="flex flex-col gap-2.5" data-testid="unit-exercises">
        {exercises.map((ex) => {
          const segs = masterySegments(ex.itemIds, attempts);
          const done = ex.itemIds.filter((id) => attempted.has(id)).length;
          return (
            <li
              key={ex.letter}
              className="card-surface flex min-h-16 items-center gap-3 px-3.5 py-3"
            >
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ink/10 text-sm font-bold">
                {ex.letter}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold capitalize">
                  {ex.skill} · p. {ex.page}
                </p>
                <div className="mt-2 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-sm ${
                        i < segs ? "bg-success" : "bg-ink/15"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs text-ink-muted">
                {done}/{ex.itemIds.length}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-surface via-surface to-transparent px-4 pb-6 pt-10">
        <div className="mx-auto flex max-w-lg flex-col gap-2.5">
          {locked ? (
            <p className="card-surface px-4 py-4 text-center text-sm text-ink-muted">
              Finish 60% of the previous unit to unlock.
            </p>
          ) : (
            <>
              <Link
                href={playHref}
                className="btn-primary w-full"
                data-testid="unit-play"
              >
                Play · {Math.min(12, unit.items.length)} items
              </Link>
              {unitDue.length > 0 ? (
                <Link
                  href={reviewHref}
                  className="card-surface flex min-h-12 items-center justify-center text-xs font-bold uppercase tracking-wide"
                >
                  Review this unit · {unitDue.length}
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
