"use client";

import Link from "next/link";
import { useProgressStore } from "@/lib/progress-store";
import { AppNav } from "@/components/AppNav";

export function ReviewQueue({
  itemLabels,
}: {
  itemLabels: Record<string, string>;
}) {
  const dueItemIds = useProgressStore((s) => s.dueItemIds);
  const itemStates = useProgressStore((s) => s.itemStates);

  const rows = dueItemIds.map((id) => ({
    id,
    prompt: itemLabels[id] ?? id,
    mastery: itemStates[id]?.mastery ?? 0,
  }));

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-24 pt-6"
      data-testid="review-page"
    >
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Review</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Due items from spaced repetition.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="card-surface p-5" data-testid="review-empty">
          <p className="font-bold text-ink">Nothing due right now</p>
          <p className="mt-2 text-sm text-ink-muted">
            Play a unit session — misses land here for review.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Back to map
          </Link>
        </div>
      ) : (
        <>
          <p
            className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-faint"
            data-testid="review-due-count"
          >
            Due · {rows.length}
          </p>
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="card-surface px-4 py-3"
                data-testid="review-item"
                data-item-id={row.id}
              >
                <p className="text-sm font-semibold text-ink">{row.prompt}</p>
                <p className="mt-1 text-xs text-ink-faint">{row.id}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/play?review=1&size=8"
            className="btn-primary mt-8"
            data-testid="review-start"
          >
            Start review
          </Link>
        </>
      )}

      <AppNav />
    </div>
  );
}
