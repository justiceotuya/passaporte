"use client";

import Link from "next/link";
import type { PassaporteUnit } from "@/types/item";
import { useProgressStore } from "@/lib/progress-store";
import {
  attemptedItemIds,
  isItemMastered,
  unitAttemptPercent,
} from "@/lib/unit-progress";
import { PageShell } from "@/components/PageShell";

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
  const sessionLength = useProgressStore((s) => s.settings.sessionLength);
  const percent = Math.round(
    unitAttemptPercent(
      unit.items.map((i) => i.id),
      attempts,
    ) * 100,
  );
  const attempted = attemptedItemIds(attempts);
  const unitDue = dueItemIds.filter((id) =>
    unit.items.some((item) => item.id === id),
  );
  const exercises = groupByExercise(unit);
  const playHref = `/play?unit=${unit.unit}`;
  const reviewHref = `/review`;

  return (
    <PageShell>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-8">
        <div>
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

          <div className="mb-4 flex items-center gap-4 lg:hidden">
            <ProgressRing percent={percent} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{unit.title}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {unit.items.length} items ·{" "}
                {unit.items.filter((i) => attempted.has(i.id)).length} attempted
              </p>
            </div>
          </div>

          <h1 className="mb-2 hidden text-3xl font-bold tracking-tight lg:block">
            {unit.title}
          </h1>
          <p className="mb-4 hidden text-sm text-ink-muted lg:block">
            {unit.items.length} items ·{" "}
            {unit.items.filter((i) => attempted.has(i.id)).length} attempted
          </p>

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
        </div>

        <aside className="mt-8 lg:sticky lg:top-8 lg:mt-0">
          <div className="card-surface hidden p-6 text-center lg:block">
            <ProgressRing percent={percent} size="lg" />
            <p className="mt-4 text-sm text-ink-muted">
              {unit.items.filter((i) => attempted.has(i.id)).length} of{" "}
              {unit.items.length} items attempted
            </p>
            <PlayActions
              locked={locked}
              playHref={playHref}
              reviewHref={reviewHref}
              unitDue={unitDue.length}
              sessionLength={sessionLength}
              unitSize={unit.items.length}
            />
          </div>

          <div className="fixed bottom-16 left-0 right-0 z-30 bg-gradient-to-t from-surface via-surface to-transparent px-4 pb-4 pt-10 lg:hidden">
            <div className="mx-auto max-w-lg md:max-w-2xl">
              <PlayActions
                locked={locked}
                playHref={playHref}
                reviewHref={reviewHref}
                unitDue={unitDue.length}
                sessionLength={sessionLength}
                unitSize={unit.items.length}
              />
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function ProgressRing({
  percent,
  size = "md",
}: {
  percent: number;
  size?: "md" | "lg";
}) {
  const outer = size === "lg" ? "h-[120px] w-[120px]" : "h-[84px] w-[84px]";
  const inner = size === "lg" ? "h-[98px] w-[98px]" : "h-[68px] w-[68px]";
  return (
    <div
      className={`mx-auto flex ${outer} flex-none items-center justify-center rounded-full`}
      style={{
        background: `conic-gradient(#F67A1D 0 ${percent}%, rgb(var(--color-ink) / 0.1) ${percent}%)`,
      }}
    >
      <div
        className={`flex ${inner} flex-col items-center justify-center rounded-full bg-surface`}
      >
        <span className="text-xl font-extrabold text-primary md:text-3xl">
          {percent}%
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
          done
        </span>
      </div>
    </div>
  );
}

function PlayActions({
  locked,
  playHref,
  reviewHref,
  unitDue,
  sessionLength,
  unitSize,
}: {
  locked: boolean;
  playHref: string;
  reviewHref: string;
  unitDue: number;
  sessionLength: number;
  unitSize: number;
}) {
  if (locked) {
    return (
      <p className="card-surface mt-4 px-4 py-4 text-center text-sm text-ink-muted lg:mt-5">
        Finish 60% of the previous unit to unlock.
      </p>
    );
  }
  return (
    <div className="mt-4 flex flex-col gap-2.5 lg:mt-5">
      <Link href={playHref} className="btn-primary w-full" data-testid="unit-play">
        Play · {Math.min(sessionLength, unitSize)} items
      </Link>
      {unitDue > 0 ? (
        <Link
          href={reviewHref}
          className="card-surface flex min-h-12 items-center justify-center text-xs font-bold uppercase tracking-wide"
        >
          Review this unit · {unitDue}
        </Link>
      ) : null}
    </div>
  );
}
