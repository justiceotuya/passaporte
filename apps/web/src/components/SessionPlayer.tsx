"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchPair, PassaporteItem, PassaporteUnit } from "@/types/item";
import { ChoiceOption } from "@/components/ChoiceOption";
import { TrueFalsePair } from "@/components/TrueFalsePair";
import { HintDisclosure } from "@/components/HintDisclosure";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { StimulusImage } from "@/components/StimulusImage";
import { FillBlankTyped } from "@/components/FillBlankTyped";
import { MatchPairTap } from "@/components/MatchPairTap";
import { OrderSequence } from "@/components/OrderSequence";
import { ListenTranscript } from "@/components/ListenTranscript";
import {
  gradeChoice,
  gradeFillBlank,
  gradeListenChoice,
  gradeMatch,
  gradeOrder,
  gradeTransform,
  gradeTrueFalse,
} from "@/lib/grader";
import { buildSession, isPlayableItem } from "@/lib/session-builder";
import { useProgressStore, type AnsweredItem } from "@/lib/progress-store";
import { track } from "@/lib/analytics";
import { instructionForDisplay } from "@/lib/instruction-display";
import { useSyncProgress } from "@/hooks/use-progress";

type Phase = "playing" | "feedback" | "summary";

const STARTING_HEARTS = 3;

function expectedMatchPairs(item: PassaporteItem): MatchPair[] {
  if (Array.isArray(item.answer) && item.answer.length > 0) {
    const first = item.answer[0];
    if (typeof first === "object" && first && "left" in first) {
      return item.answer as MatchPair[];
    }
  }
  return item.pairs ?? [];
}

function expectedOrder(item: PassaporteItem): string[] {
  if (Array.isArray(item.answer) && typeof item.answer[0] === "string") {
    return item.answer as string[];
  }
  return item.sequence ?? [];
}

export function SessionPlayer({
  unit,
  sessionSize,
}: {
  unit: PassaporteUnit;
  sessionSize?: number;
}) {
  const dueItemIds = useProgressStore((s) => s.dueItemIds);
  const recordAttempt = useProgressStore((s) => s.recordAttempt);
  const finishSession = useProgressStore((s) => s.finishSession);
  const totalXp = useProgressStore((s) => s.totalXp);
  const streakDays = useProgressStore((s) => s.streakDays);
  const heartsEnabled = useProgressStore((s) => s.settings.heartsEnabled);
  const hintsEnabled = useProgressStore((s) => s.settings.hintsEnabled);
  const settingsSessionLength = useProgressStore((s) => s.settings.sessionLength);
  const typedMode = useProgressStore((s) => s.settings.typedMode);
  const instructionLanguage = useProgressStore(
    (s) => s.settings.instructionLanguage ?? "en",
  );
  const accentStrictness = useProgressStore((s) => s.settings.accentStrictness);

  const progressMutation = useSyncProgress();

  const sessionId = useMemo(
    () => `local-${unit.unit}-${Date.now()}`,
    [unit.unit],
  );

  const effectiveSize = sessionSize ?? settingsSessionLength;

  const plan = useMemo(
    () =>
      buildSession({
        unitItems: unit.items.filter(isPlayableItem),
        dueItemIds,
        size: effectiveSize,
      }),
    [unit.items, dueItemIds, effectiveSize],
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
  const [phase, setPhase] = useState<Phase>("playing");
  const [lastCorrect, setLastCorrect] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [answeredItems, setAnsweredItems] = useState<AnsweredItem[]>([]);
  const [hearts, setHearts] = useState(STARTING_HEARTS);
  const [locked, setLocked] = useState(false);
  const [endedEarly, setEndedEarly] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || items.length === 0) return;
    startedRef.current = true;
    track("session_start", {
      unit: unit.unit,
      size: items.length,
      heartsEnabled,
    });
  }, [items.length, unit.unit, heartsEnabled]);

  const current = items[index];
  const progress =
    items.length === 0
      ? 0
      : ((index + (phase === "summary" ? 1 : 0)) / items.length) * 100;

  function finalizeSession(opts: {
    xp: number;
    missedIds: string[];
    answered: AnsweredItem[];
    early: boolean;
  }) {
    finishSession({
      sessionId,
      xp: opts.xp,
      missedItemIds: opts.missedIds,
      answeredItems: opts.answered,
    });
    void progressMutation.mutateAsync({
      type: "finish",
      sessionId,
      unitId: `passaporte-u${String(unit.unit).padStart(2, "0")}`,
      xp: opts.xp,
      missedItemIds: opts.missedIds,
      answeredItems: opts.answered,
    }).catch(() => undefined);
    track("session_complete", {
      unit: unit.unit,
      xp: opts.xp,
      missed: opts.missedIds.length,
      answered: opts.answered.length,
      early: opts.early,
    });
    setEndedEarly(opts.early);
    setPhase("summary");
  }

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

    void progressMutation.mutateAsync({
      type: "attempt",
      itemId: current.id,
      correct: result.correct,
      answerGiven: given,
      attemptNo,
      sessionId,
    }).catch(() => undefined);

    track("item_answered", {
      itemId: current.id,
      correct: result.correct,
      attemptNo,
      type: current.type,
    });

    setLastCorrect(result.correct);
    setSessionXp((xp) => xp + result.xp);

    let nextHearts = hearts;
    if (heartsEnabled && !result.correct) {
      nextHearts = Math.max(0, hearts - 1);
      setHearts(nextHearts);
    }

    if (!result.correct && attemptNo >= 2) {
      setMissed((m) => [...m, current.id]);
    }

    if (heartsEnabled && !result.correct && nextHearts <= 0) {
      const outcomeCorrect = false;
      const answered: AnsweredItem[] = [
        ...answeredItems.filter((row) => row.itemId !== current.id),
        { itemId: current.id, correct: outcomeCorrect },
      ];
      const missedIds = [...new Set([...missed, current.id])];
      setAnsweredItems(answered);
      setMissed(missedIds);
      finalizeSession({
        xp: sessionXp + result.xp,
        missedIds,
        answered,
        early: true,
      });
      return;
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
          false,
          accentStrictness,
        ),
      );
      return;
    }

    if (current.type === "transform") {
      commitResult(
        given,
        gradeTransform(
          given,
          String(current.answer),
          current.accepted ?? [],
          attemptNo,
          false,
          accentStrictness,
        ),
      );
      return;
    }

    if (current.type === "listen_choice") {
      commitResult(
        given,
        gradeListenChoice(given, String(current.answer), attemptNo),
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

  function submitOrder(ordered: string[]) {
    if (!current || locked) return;
    const expected = expectedOrder(current);
    const result = gradeOrder(ordered, expected, attemptNo);
    commitResult(JSON.stringify(ordered), result);
  }

  function continueAfterFeedback() {
    if (!current) return;

    if (!lastCorrect && attemptNo < 2) {
      setAttemptNo(2);
      setSelected(null);
      setLocked(false);
      setPhase("playing");
      return;
    }

    const itemOutcome: AnsweredItem = {
      itemId: current.id,
      correct: lastCorrect,
    };
    const nextAnswered = [
      ...answeredItems.filter((row) => row.itemId !== current.id),
      itemOutcome,
    ];
    setAnsweredItems(nextAnswered);

    const next = index + 1;
    if (next >= items.length) {
      const missedIds = lastCorrect
        ? missed
        : [...new Set([...missed, current.id])];
      finalizeSession({
        xp: sessionXp,
        missedIds,
        answered: nextAnswered,
        early: false,
      });
      return;
    }

    setIndex(next);
    setAttemptNo(1);
    setSelected(null);
    setLocked(false);
    setPhase("playing");
  }

  if (items.length === 0) {
    return (
      <p className="p-6 text-ink-muted">
        No playable closed items in this unit.
      </p>
    );
  }

  if (phase === "summary") {
    return (
      <div
        className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col px-4 py-8 md:max-w-2xl lg:max-w-[760px]"
        data-testid="session-summary"
        data-ended-early={endedEarly ? "true" : "false"}
      >
        <h1 className="font-display text-3xl font-semibold">
          {endedEarly ? "Out of hearts" : "Session complete"}
        </h1>
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

  const answerStr =
    Array.isArray(current.answer) && typeof current.answer[0] === "string"
      ? (current.answer as string[]).join(" → ")
      : String(current.answer);
  const showReveal = phase === "feedback" && !lastCorrect && attemptNo >= 2;
  const fillUsesTiles =
    current.type === "fill_blank" &&
    !typedMode &&
    Array.isArray(current.options) &&
    current.options.length >= 2;
  const matchPairs = expectedMatchPairs(current);
  const orderSeq = expectedOrder(current);
  const choiceLike =
    current.type === "choice" ||
    current.type === "listen_choice" ||
    fillUsesTiles;
  const typedLike =
    (current.type === "fill_blank" && !fillUsesTiles) ||
    current.type === "transform";

  return (
    <div
      className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col px-4 py-6 md:max-w-2xl lg:max-w-[760px]"
      data-testid="session-player"
      data-item-id={current.id}
      data-item-type={current.type}
      data-phase={phase}
      data-hearts={heartsEnabled ? hearts : "off"}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p
          className="text-xs font-bold uppercase tracking-wide text-ink-faint"
          data-testid="session-progress-label"
        >
          Unit {unit.unit} · {index + 1}/{items.length}
        </p>
        <div className="flex items-center gap-3">
          {heartsEnabled ? (
            <p
              className="text-xs font-bold uppercase tracking-wide text-error"
              data-testid="session-hearts"
              aria-label={`${hearts} hearts remaining`}
            >
              {"♥".repeat(hearts)}
              {"♡".repeat(Math.max(0, STARTING_HEARTS - hearts))}
            </p>
          ) : null}
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            {sessionXp} XP
          </p>
        </div>
      </div>

      <div className="mb-6 h-2 overflow-hidden rounded-pill bg-ink/10">
        <div
          className="h-full rounded-pill bg-success transition-all duration-base ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="book-text mb-4">
        {instructionForDisplay(current, instructionLanguage)}
      </p>

      {current.stimulus_image ? (
        <StimulusImage src={current.stimulus_image} />
      ) : null}

      <h2 className="mb-2 text-xl font-semibold tracking-tight text-ink">
        {current.prompt}
      </h2>
      {hintsEnabled && current.hint_en ? (
        <HintDisclosure hint={current.hint_en} />
      ) : null}

      {current.type === "listen_choice" && current.transcript ? (
        <ListenTranscript transcript={current.transcript} />
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {current.type === "true_false" ? (
          <TrueFalsePair
            selected={selected as "true" | "false" | null}
            correctValue={
              phase === "feedback"
                ? (String(current.answer) as "true" | "false")
                : undefined
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

        {current.type === "order" ? (
          <OrderSequence
            key={`${current.id}-${attemptNo}`}
            sequence={orderSeq}
            locked={phase === "feedback"}
            showSolution={showReveal}
            onSubmit={(ordered) => {
              if (phase === "playing") submitOrder(ordered);
            }}
          />
        ) : null}

        {typedLike ? (
          phase === "playing" ? (
            <FillBlankTyped
              key={`${current.id}-${attemptNo}`}
              onSubmit={(answer) => submitAnswer(answer)}
              disabled={locked}
            />
          ) : (
            <p className="text-sm text-ink-muted" data-testid="typed-reveal">
              {showReveal ? `Answer: ${answerStr}` : `You wrote: ${selected}`}
            </p>
          )
        ) : null}

        {choiceLike &&
          (current.options ?? []).map((option) => {
            const expected = String(current.answer);
            let state:
              | "default"
              | "selected"
              | "correct"
              | "incorrect"
              | "revealed" = "default";
            if (phase === "feedback") {
              if (option === expected) {
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
                    : current.type === "order"
                      ? "Check the order above."
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
