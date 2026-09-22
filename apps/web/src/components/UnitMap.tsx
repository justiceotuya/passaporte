"use client";

import Link from "next/link";
import { useProgressStore } from "@/lib/progress-store";
import { buildUnitProgressList } from "@/lib/unit-progress";

export type MapUnit = {
  unit: number;
  title: string;
  itemCount: number;
  itemIds: string[];
};

type Props = {
  units: MapUnit[];
};

function shortTitle(title: string, unit: number): string {
  const cleaned = title.replace(/^Unidade\s+\d+\s*[·\-–]?\s*/i, "").trim();
  if (!cleaned || cleaned.toLowerCase().includes("draft")) {
    return `Unidade ${unit}`;
  }
  return cleaned;
}

export function UnitMap({ units }: Props) {
  const attempts = useProgressStore((s) => s.attempts);
  const dueItemIds = useProgressStore((s) => s.dueItemIds);
  const streakDays = useProgressStore((s) => s.streakDays);
  const totalXp = useProgressStore((s) => s.totalXp);

  const progress = buildUnitProgressList(units, attempts);
  const byUnit = new Map(progress.map((p) => [p.unit, p]));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-24 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Passaporte
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Passaporte para Português 1</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-pill bg-primary/15 px-3 py-2 text-sm font-bold text-primary">
            Streak · {streakDays}
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            {totalXp} XP
          </span>
        </div>
      </header>

      {dueItemIds.length > 0 ? (
        <Link
          href="/play?review=1"
          className="mb-6 flex min-h-tap items-center justify-between rounded-2xl border border-info/40 bg-info/10 px-4"
          data-testid="review-due-chip"
        >
          <span className="font-bold text-info">
            Review due · {dueItemIds.length}
          </span>
          <span className="rounded-pill bg-info px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-on">
            Play
          </span>
        </Link>
      ) : null}

      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-faint">
        Units
      </p>

      <ol className="relative flex flex-col gap-5" data-testid="unit-map">
        <div
          className="pointer-events-none absolute bottom-8 left-[33px] top-8 w-0.5 bg-[repeating-linear-gradient(180deg,rgba(252,245,239,0.18)_0_6px,transparent_6px_14px)]"
          aria-hidden
        />
        {units.map((unit) => {
          const state = byUnit.get(unit.unit);
          const lockState = state?.lockState ?? "locked";
          const percent = Math.round((state?.percent ?? 0) * 100);
          const locked = lockState === "locked";
          const complete = lockState === "complete";
          const inProgress = lockState === "in_progress";
          const ringColor = complete
            ? "#07C874"
            : inProgress
              ? "#F67A1D"
              : "rgba(252,245,239,0.15)";
          const ringPct = complete ? 100 : percent;

          const row = (
            <div
              className={`relative flex items-center gap-4 ${locked ? "opacity-45" : ""}`}
              data-testid={`unit-node-${unit.unit}`}
              data-lock-state={lockState}
            >
              <div
                className="relative z-10 flex h-[68px] w-[68px] flex-none items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(${ringColor} 0 ${ringPct}%, rgba(252,245,239,0.1) ${ringPct}%)`,
                }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-card text-lg font-bold">
                  {complete ? (
                    <span className="text-success">✓</span>
                  ) : locked ? (
                    <span className="text-sm text-ink-faint">Lock</span>
                  ) : (
                    <span
                      className={
                        inProgress ? "text-primary" : "text-ink-muted"
                      }
                    >
                      {unit.unit}
                    </span>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">
                  {unit.unit} · {shortTitle(unit.title, unit.unit)}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    complete
                      ? "text-success"
                      : inProgress
                        ? "text-primary"
                        : locked
                          ? "text-ink-faint"
                          : "text-ink-muted"
                  }`}
                >
                  {locked
                    ? "Locked"
                    : complete
                      ? `Complete · ${percent}%`
                      : inProgress
                        ? `In progress · ${percent}%`
                        : "Available"}
                </p>
              </div>
              {!locked ? (
                <span className="rounded-pill bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-on">
                  {inProgress || complete ? "Play" : "Open"}
                </span>
              ) : null}
            </div>
          );

          if (locked) {
            return (
              <li key={unit.unit} aria-disabled>
                {row}
              </li>
            );
          }

          return (
            <li key={unit.unit}>
              <Link href={`/units/${unit.unit}`} className="block">
                {row}
              </Link>
            </li>
          );
        })}
      </ol>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-ink/10 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg">
          <Link
            href="/"
            className="flex min-h-[64px] flex-1 flex-col items-center justify-center text-xs font-bold text-primary"
          >
            Map
          </Link>
          <Link
            href="/play?review=1"
            className="flex min-h-[64px] flex-1 flex-col items-center justify-center text-xs font-bold text-ink-faint"
          >
            Review
          </Link>
          <Link
            href="/sign-in"
            className="flex min-h-[64px] flex-1 flex-col items-center justify-center text-xs font-bold text-ink-faint"
          >
            Account
          </Link>
        </div>
      </nav>
    </div>
  );
}
