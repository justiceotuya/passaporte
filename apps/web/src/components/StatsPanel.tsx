"use client";

import { useProgressStore } from "@/lib/progress-store";
import { computeLearnerStats } from "@/lib/learner-stats";
import { PageShell } from "@/components/PageShell";

export function StatsPanel() {
  const totalXp = useProgressStore((s) => s.totalXp);
  const streakDays = useProgressStore((s) => s.streakDays);
  const attempts = useProgressStore((s) => s.attempts);
  const dueItemIds = useProgressStore((s) => s.dueItemIds);
  const itemStates = useProgressStore((s) => s.itemStates);

  const stats = computeLearnerStats({
    totalXp,
    streakDays,
    attempts,
    dueItemIds,
    itemStates,
  });

  const accuracyPct = Math.round(stats.accuracy * 100);

  return (
    <PageShell testId="stats-page">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Stats</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Progress from your local practice store.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Lifetime XP" value={String(stats.totalXp)} testId="stat-xp" />
        <StatCard
          label="Streak"
          value={`${stats.streakDays}d`}
          testId="stat-streak"
        />
        <StatCard
          label="Accuracy"
          value={`${accuracyPct}%`}
          testId="stat-accuracy"
        />
        <StatCard
          label="Attempts"
          value={String(stats.attemptCount)}
          testId="stat-attempts"
        />
        <StatCard
          label="Due"
          value={String(stats.dueCount)}
          testId="stat-due"
        />
        <StatCard
          label="Mastered"
          value={String(stats.masteredCount)}
          testId="stat-mastered"
        />
      </dl>
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="card-surface p-4" data-testid={testId}>
      <dt className="text-xs font-bold uppercase tracking-wide text-ink-faint">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-bold text-ink">{value}</dd>
    </div>
  );
}
