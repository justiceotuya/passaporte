"use client";

import { useMemo, useState } from "react";
import type { MatchPair } from "@/types/item";

type Props = {
  pairs: MatchPair[];
  locked?: boolean;
  showSolution?: boolean;
  onComplete: (pairs: MatchPair[]) => void;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function MatchPairTap({
  pairs,
  locked = false,
  showSolution = false,
  onComplete,
}: Props) {
  const lefts = useMemo(() => pairs.map((p) => p.left), [pairs]);
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right)), [pairs]);

  const [armedLeft, setArmedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<MatchPair[]>([]);
  const [shakeRight, setShakeRight] = useState<string | null>(null);

  const matchedLefts = new Set(matched.map((p) => p.left));
  const matchedRights = new Set(matched.map((p) => p.right));
  const expected = useMemo(() => {
    const map = new Map(pairs.map((p) => [p.left, p.right]));
    return map;
  }, [pairs]);

  function selectLeft(left: string) {
    if (locked || matchedLefts.has(left)) return;
    setArmedLeft(left);
  }

  function selectRight(right: string) {
    if (locked || matchedRights.has(right) || !armedLeft) return;
    const expectedRight = expected.get(armedLeft);
    if (expectedRight === right) {
      const next = [...matched, { left: armedLeft, right }];
      setMatched(next);
      setArmedLeft(null);
      if (next.length === pairs.length) {
        onComplete(next);
      }
      return;
    }
    setShakeRight(right);
    window.setTimeout(() => setShakeRight(null), 350);
    setArmedLeft(null);
  }

  return (
    <div className="grid grid-cols-2 gap-3" data-testid="match-pair-tap">
      <div className="flex flex-col gap-2">
        {lefts.map((left) => {
          const done = matchedLefts.has(left);
          const armed = armedLeft === left;
          return (
            <button
              key={left}
              type="button"
              disabled={locked || done}
              onClick={() => selectLeft(left)}
              className={`card-surface min-h-tap px-3 py-3 text-left text-sm font-medium ${
                done
                  ? "border-success bg-success/10 text-success"
                  : armed
                    ? "border-info bg-info/10"
                    : "border-ink/10"
              }`}
            >
              {left}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2">
        {rights.map((right) => {
          const done = matchedRights.has(right);
          return (
            <button
              key={right}
              type="button"
              disabled={locked || done || !armedLeft}
              onClick={() => selectRight(right)}
              className={`card-surface min-h-tap px-3 py-3 text-left text-sm font-medium transition ${
                done
                  ? "border-success bg-success/10 text-success"
                  : shakeRight === right
                    ? "animate-pulse border-error bg-error/10"
                    : "border-ink/10"
              }`}
            >
              {right}
            </button>
          );
        })}
      </div>
      {showSolution ? (
        <p className="col-span-2 text-sm text-ink-muted" data-testid="match-solution">
          {pairs.map((p) => `${p.left} → ${p.right}`).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
