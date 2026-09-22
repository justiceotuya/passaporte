"use client";

import { useMemo, useState } from "react";

type Props = {
  sequence: string[];
  locked?: boolean;
  showSolution?: boolean;
  onSubmit: (ordered: string[]) => void;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Tap tiles into order; undo last; Check when complete. */
export function OrderSequence({
  sequence,
  locked = false,
  showSolution = false,
  onSubmit,
}: Props) {
  const pool = useMemo(() => shuffle(sequence), [sequence]);
  const [usedIndexes, setUsedIndexes] = useState<number[]>([]);
  const picked = usedIndexes.map((i) => pool[i]);
  const available = pool
    .map((label, index) => ({ label, index }))
    .filter(({ index }) => !usedIndexes.includes(index));

  function pick(index: number) {
    if (locked) return;
    setUsedIndexes((prev) => [...prev, index]);
  }

  function undo() {
    if (locked || usedIndexes.length === 0) return;
    setUsedIndexes((prev) => prev.slice(0, -1));
  }

  return (
    <div className="flex flex-col gap-4" data-testid="order-sequence">
      <div
        className="card-surface flex min-h-24 flex-wrap gap-2 p-3"
        data-testid="order-picked"
      >
        {picked.length === 0 ? (
          <p className="text-sm text-ink-faint">Tap tiles in order…</p>
        ) : (
          picked.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="rounded-pill border border-info bg-info/10 px-3 py-2 text-sm font-semibold"
            >
              {i + 1}. {label}
            </span>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {available.map(({ label, index }) => (
          <button
            key={`${label}-${index}`}
            type="button"
            disabled={locked}
            onClick={() => pick(index)}
            className="card-surface min-h-tap px-4 py-2 text-sm font-semibold"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="card-surface min-h-tap flex-1 px-4 font-semibold disabled:opacity-40"
          disabled={locked || picked.length === 0}
          onClick={undo}
        >
          Undo
        </button>
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={locked || picked.length !== sequence.length}
          data-testid="order-submit"
          onClick={() => onSubmit(picked)}
        >
          Check
        </button>
      </div>

      {showSolution ? (
        <p className="text-sm text-ink-muted" data-testid="order-solution">
          {sequence.map((s, i) => `${i + 1}. ${s}`).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
