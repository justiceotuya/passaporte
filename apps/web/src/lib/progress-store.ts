"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applySm2, isDue, type Sm2State } from "@/lib/sm2";

import type { AppearanceSetting } from "@/lib/appearance";
import type { InstructionLanguage } from "@/lib/instruction-display";
import type { ProgressSnapshot } from "@/lib/progress-api";

export type AttemptRecord = {
  itemId: string;
  correct: boolean;
  answerGiven: string;
  attemptNo: number;
  sessionId: string;
  createdAt: string;
  xp: number;
};

export type LearnerSettings = {
  accentStrictness: "lenient" | "strict";
  sessionLength: number;
  heartsEnabled: boolean;
  hintsEnabled: boolean;
  typedMode: boolean;
  appearance: AppearanceSetting;
  instructionLanguage: InstructionLanguage;
};

export type AnsweredItem = {
  itemId: string;
  correct: boolean;
};

export type ProgressState = {
  attempts: AttemptRecord[];
  itemStates: Record<string, Sm2State>;
  dueItemIds: string[];
  streakDays: number;
  lastSessionDate: string | null;
  totalXp: number;
  settings: LearnerSettings;
  recordAttempt: (attempt: AttemptRecord) => void;
  finishSession: (input: {
    sessionId: string;
    xp: number;
    missedItemIds: string[];
    answeredItems?: AnsweredItem[];
  }) => void;
  updateSettings: (patch: Partial<LearnerSettings>) => void;
  /** Soft-merge remote XP / streak / due without wiping local SM-2 item state. */
  mergeRemoteSnapshot: (snap: ProgressSnapshot) => void;
  reset: () => void;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function recomputeDue(itemStates: Record<string, Sm2State>, now = Date.now()): string[] {
  return Object.entries(itemStates)
    .filter(([, state]) => isDue(state, now))
    .map(([id]) => id);
}

const defaultSettings: LearnerSettings = {
  accentStrictness: "lenient",
  sessionLength: 12,
  heartsEnabled: false,
  hintsEnabled: true,
  typedMode: false,
  appearance: "system",
  instructionLanguage: "en",
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      attempts: [],
      itemStates: {},
      dueItemIds: [],
      streakDays: 0,
      lastSessionDate: null,
      totalXp: 0,
      settings: defaultSettings,
      recordAttempt: (attempt) => {
        set((state) => ({
          attempts: [...state.attempts, attempt],
        }));
      },
      finishSession: ({ xp, missedItemIds, answeredItems }) => {
        const today = todayKey();
        const { lastSessionDate, streakDays, itemStates } = get();
        let nextStreak = streakDays;
        if (lastSessionDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yKey = yesterday.toISOString().slice(0, 10);
          nextStreak = lastSessionDate === yKey ? streakDays + 1 : 1;
        }

        const now = Date.now();
        const nextStates = { ...itemStates };
        const outcomes = new Map<string, boolean>();
        for (const row of answeredItems ?? []) {
          outcomes.set(row.itemId, row.correct);
        }
        for (const id of missedItemIds) {
          outcomes.set(id, false);
        }

        for (const [itemId, correct] of outcomes) {
          nextStates[itemId] = applySm2(nextStates[itemId], correct, now);
        }

        set((state) => ({
          totalXp: state.totalXp + xp,
          streakDays: nextStreak,
          lastSessionDate: today,
          itemStates: nextStates,
          dueItemIds: recomputeDue(nextStates, now),
        }));
      },
      updateSettings: (patch) => {
        set((state) => ({
          settings: { ...state.settings, ...patch },
        }));
      },
      mergeRemoteSnapshot: (snap) => {
        set((state) => {
          const due = new Set([...state.dueItemIds, ...snap.dueItemIds]);
          return {
            totalXp: Math.max(state.totalXp, snap.totalXp),
            streakDays: Math.max(state.streakDays, snap.streakDays),
            dueItemIds: [...due],
          };
        });
      },
      reset: () =>
        set({
          attempts: [],
          itemStates: {},
          dueItemIds: [],
          streakDays: 0,
          lastSessionDate: null,
          totalXp: 0,
          settings: defaultSettings,
        }),
    }),
    {
      name: "passaporte-progress-v2",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProgressState>;
        return {
          ...current,
          ...p,
          settings: {
            ...current.settings,
            ...(p.settings ?? {}),
          },
        };
      },
    },
  ),
);
