"use client";

import { useMemo, useState } from "react";
import type { MatchPair, PassaporteItem, PassaporteUnit } from "@/types/item";
import { ChoiceOption } from "@/components/ChoiceOption";
import { TrueFalsePair } from "@/components/TrueFalsePair";
import { HintDisclosure } from "@/components/HintDisclosure";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { StimulusImage } from "@/components/StimulusImage";
import { FillBlankTyped } from "@/components/FillBlankTyped";
import { MatchPairTap } from "@/components/MatchPairTap";
import {
  gradeChoice,
  gradeFillBlank,
  gradeMatch,
  gradeTrueFalse,
} from "@/lib/grader";
import { buildSession, isPlayableItem } from "@/lib/session-builder";
import { useProgressStore } from "@/lib/progress-store";

type Phase = "playing" | "feedback" | "summary";

function expectedMatchPairs(item: PassaporteItem): MatchPair[] {
  if (Array.isArray(item.answer) && item.answer.length > 0) {
    const first = item.answer[0];
    if (typeof first === "object" && first && "left" in first) {
      return item.answer as MatchPair[];
    }
  }
  return item.pairs ?? [];
}

export function SessionPlayer({
  unit,
  sessionSize = 12,
}: {
  unit: PassaporteUnit;
  sessionSize?: number;
}) {
  const dueItemIds = useProgressStore((s) => s.dueItemIds);
  const recordAttempt = useProgressStore((s) => s.recordAttempt);
  const finishSession = useProgressStore((s) => s.finishSession);
  const totalXp = useProgressStore((s) => s.totalXp);
  const streakDays = useProgressStore((s) => s.streakDays);

  const sessionId = useMemo(
    () => `local-${unit.unit}-${Date.now()}`,
    [unit.unit],
  );

  const plan = useMemo(
    () =>
      buildSession({
        unitItems: unit.items.filter(isPlayableItem),
        dueItemIds,
        size: sessionSize,
      }),
    [unit.items, dueItemIds, sessionSize],
  );

  const itemById = useMemo(() => {
    const map = new Map<string, PassaporteItem>();
    for (const item of unit.items) map.set(item.id, item);
    return map;
  }, [unit.items]);

  const items = plan.itemIds
    .map((id) => itemById.get(id))
    .filter((i): i is PassaporteItem => Boolean(i));

  const [index, setIndex] = useState(0);
  const [attemptNo, setAttemptNo] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("playing");
  const [lastCorrect, setLastCorrect] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);

  const current = items[index];
  const progress =
    items.length === 0
      ? 0
      : ((index + (phase === "summary" ? 1 : 0)) / items.length) * 100;

  function commitResult(given: string, result: { correct: boolean; xp: number }) {
    if (!current) return;
    setSelected(given);
    setLocked(true);

    recordAttempt({
      itemId: current.id,
      correct: result.correct,
      answerGiven: given,
      attemptNo,
      sessionId,
      createdAt: new Date().toISOString(),
      xp: result.xp,
    });

    void fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "attempt",
        itemId: current.id,
        correct: result.correct,
      }),
    }).catch(() => undefined);

    setLastCorrect(result.correct);
    setSessionXp((xp) => xp + result.xp);

    if (!result.correct && attemptNo >= 2) {
      setMissed((m) => [...m, current.id]);
    }
    setPhase("feedback");
  }

  function submitAnswer(given: string) {
    if (!current || locked) return;

    if (current.type === "true_false") {
      commitResult(
        given,
        gradeTrueFalse(given as "true" | "false", String(current.answer), attemptNo),
      );
      return;
    }

    if (current.type === "fill_blank") {
      commitResult(
        given,
        gradeFillBlank(
          given,
          String(current.answer),
          current.accepted ?? [],
          attemptNo,
        ),
      );
      return;
    }

    commitResult(given, gradeChoice(given, String(current.answer), attemptNo));
  }

  function submitMatch(pairs: MatchPair[]) {
    if (!current || locked) return;
    const expected = expectedMatchPairs(current);
    const result = gradeMatch(pairs, expected, attemptNo);
    commitResult(JSON.stringify(pairs), result);
  }

  function continueAfterFeedback() {
    if (!current) return;

    if (!lastCorrect && attemptNo < 2) {
      setAttemptNo(2);
      setSelected(null);
      setTyped("");
      setLocked(false);
      setPhase("playing");
      return;
    }

    const next = index + 1;
    if (next >= items.length) {
      const missedIds = lastCorrect
        ? missed
        : [...new Set([...missed, current.id])];
      finishSession({ sessionId, xp: sessionXp, missedItemIds: missedIds });
      void fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "finish",
          xp: sessionXp,
          missedItemIds: missedIds,
        }),
      }).catch(() => undefined);
      setPhase("summary");
      return;
    }

    setIndex(next);
    setAttemptNo(1);
    setSelected(null);
    setTyped("");
    setLocked(false);
    setPhase("playing");
  }

  if (items.length === 0) {
    return (
      <p className="p-6 text-ink-muted">
        No playable items in this unit (choice, true_false, fill_blank, match).
      </p>
    );
  }

  if (phase === "summary") {
    return (
      <div
        className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-8"
        data-testid="session-summary"
      >
        <h1 className="font-display text-3xl font-semibold">Session complete</h1>
        <p className="mt-2 text-ink-muted">
          You earned {sessionXp} XP this session.
        </p>
        <div className="card-surface mt-6 space-y-3 p-5">
          <p className="text-sm uppercase tracking-wide text-ink-faint">Totals</p>
          <p className="text-lg font-bold">Lifetime XP · {totalXp}</p>
          <p className="text-lg font-bold text-primary">
            Streak · {streakDays} day{streakDays === 1 ? "" : "s"}
          </p>
          <p className="text-sm text-ink-muted">
            Missed items queued for review: {missed.length}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary mt-8"
          onClick={() => window.location.reload()}
        >
          Play again
        </button>
      </div>
    );
  }

  const answerStr = String(current.answer);
  const showReveal = phase === "feedback" && !lastCorrect && attemptNo >= 2;
  const fillUsesTiles =
    current.type === "fill_blank" &&
    Array.isArray(current.options) &&
    current.options.length >= 2;
  const matchPairs = expectedMatchPairs(current);

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-6"
      data-testid="session-player"
      data-item-id={current.id}
      data-item-type={current.type}
      data-phase={phase}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p
          className="text-xs font-bold uppercase tracking-wide text-ink-faint"
          data-testid="session-progress-label"
        >
          Unit {unit.unit} · {index + 1}/{items.length}
        </p>
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          {sessionXp} XP
        </p>
      </div>

      <div className="mb-6 h-2 overflow-hidden rounded-pill bg-ink/10">
        <div
          className="h-full rounded-pill bg-success transition-all duration-base ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="book-text mb-4">{current.instruction}</p>

      {current.stimulus_image ? (
        <StimulusImage src={current.stimulus_image} />
      ) : null}

      <h2 className="mb-2 text-xl font-semibold tracking-tight text-ink">
        {current.prompt}
      </h2>
      {current.hint_en ? <HintDisclosure hint={current.hint_en} /> : null}

      <div className="mt-6 flex flex-col gap-3">
        {current.type === "true_false" ? (
          <TrueFalsePair
            selected={selected as "true" | "false" | null}
            correctValue={
              phase === "feedback" ? (answerStr as "true" | "false") : undefined
            }
            locked={phase === "feedback"}
            onSelect={(value) => {
              if (phase === "playing") submitAnswer(value);
            }}
          />
        ) : null}

        {current.type === "match" ? (
          <MatchPairTap
            key={`${current.id}-${attemptNo}`}
            pairs={matchPairs}
            locked={phase === "feedback"}
            showSolution={showReveal}
            onComplete={(pairs) => {
              if (phase === "playing") submitMatch(pairs);
            }}
          />
        ) : null}

        {current.type === "fill_blank" && !fillUsesTiles ? (
          phase === "playing" ? (
            <FillBlankTyped
              value={typed}
              onChange={setTyped}
              onSubmit={() => submitAnswer(typed)}
              disabled={locked}
            />
          ) : (
            <p className="text-sm text-ink-muted" data-testid="fill-blank-reveal">
              {showReveal ? `Answer: ${answerStr}` : `You wrote: ${selected}`}
            </p>
          )
        ) : null}

        {(current.type === "choice" || fillUsesTiles) &&
          (current.options ?? []).map((option) => {
            let state:
              | "default"
              | "selected"
              | "correct"
              | "incorrect"
              | "revealed" = "default";
            if (phase === "feedback") {
              if (option === answerStr) {
                state =
                  showReveal && selected !== option ? "revealed" : "correct";
              } else if (option === selected) {
                state = "incorrect";
              }
            } else if (option === selected) {
              state = "selected";
            }

            return (
              <ChoiceOption
                key={option}
                label={option}
                state={state}
                disabled={phase !== "playing"}
                onClick={() => submitAnswer(option)}
              />
            );
          })}
      </div>

      {phase === "feedback" ? (
        <>
          <FeedbackBanner
            correct={lastCorrect}
            message={
              lastCorrect
                ? attemptNo === 1
                  ? "Nice — first try."
                  : "Got it on the second try."
                : attemptNo < 2
                  ? "Try once more. Accents matter on the next attempt."
                  : current.type === "match"
                    ? "Check the highlighted pairs."
                    : `Answer: ${answerStr}`
            }
          />
          <button
            type="button"
            className="btn-primary mt-6 w-full"
            data-testid="continue-button"
            onClick={continueAfterFeedback}
          >
            Continue
          </button>
        </>
      ) : null}
    </div>
  );
}
