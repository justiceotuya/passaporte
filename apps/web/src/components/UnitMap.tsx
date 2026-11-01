"use client";

import Link from "next/link";
import { useProgressStore } from "@/lib/progress-store";
import { buildUnitProgressList } from "@/lib/unit-progress";
import { PageShell } from "@/components/PageShell";

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
    <PageShell>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink lg:text-4xl">
            Passaporte
          </h1>
          <p className="mt-1 text-sm text-ink-muted">A1 European Portuguese</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
          href="/review"
          className="mb-6 flex min-h-tap items-center justify-between rounded-2xl border border-info/40 bg-info/10 px-4"
          data-testid="review-due-chip"
        >
          <span className="font-bold text-info">
            Review due · {dueItemIds.length}
          </span>
          <span className="rounded-pill bg-info px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-on">
            Open
          </span>
        </Link>
      ) : null}

      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-faint">
        Units
      </p>

      {/* Mobile: path list · Laptop+: 2-col grid (desktop template) */}
      <ol
        className="relative flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-4"
        data-testid="unit-map"
      >
        <div
          className="pointer-events-none absolute bottom-8 left-[33px] top-8 w-0.5 bg-ink/20 md:hidden"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, currentColor 0 6px, transparent 6px 14px)",
            backgroundColor: "transparent",
          }}
        />
        {units.map((unit) => {
          const state = byUnit.get(unit.unit);
          const lockState = state?.lockState ?? "locked";
          const percent = Math.round((state?.percent ?? 0) * 100);
          const locked = lockState === "locked";
          const complete = lockState === "complete";
          const inProgress = lockState === "in_progress";
          const ringColor = complete
            ? "var(--color-success)"
            : inProgress
              ? "#F67A1D"
              : "rgb(var(--color-ink) / 0.15)";
          const ringPct = complete ? 100 : percent;

          const row = (
            <div
              className={`card-surface relative flex items-center gap-4 p-4 ${locked ? "opacity-45" : ""} ${
                inProgress ? "border-primary/40" : ""
              }`}
              data-testid={`unit-node-${unit.unit}`}
              data-lock-state={lockState}
            >
              <div
                className="relative z-10 flex h-[60px] w-[60px] flex-none items-center justify-center rounded-full md:h-[68px] md:w-[68px]"
                style={{
                  background: `conic-gradient(${ringColor} 0 ${ringPct}%, rgb(var(--color-ink) / 0.1) ${ringPct}%)`,
                }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-lg font-bold md:h-14 md:w-14">
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
                <p className="truncate text-base font-bold md:text-lg">
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
                <span className="hidden rounded-pill bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-on sm:inline-flex">
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
    </PageShell>
  );
}
