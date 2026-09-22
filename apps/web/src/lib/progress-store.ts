"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AttemptRecord = {
  itemId: string;
  correct: boolean;
  answerGiven: string;
  attemptNo: number;
  sessionId: string;
  createdAt: string;
  xp: number;
};

export type ProgressState = {
  attempts: AttemptRecord[];
  dueItemIds: string[];
  streakDays: number;
  lastSessionDate: string | null;
  totalXp: number;
  recordAttempt: (attempt: AttemptRecord) => void;
  finishSession: (input: {
    sessionId: string;
    xp: number;
    missedItemIds: string[];
  }) => void;
  reset: () => void;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      attempts: [],
      dueItemIds: [],
      streakDays: 0,
      lastSessionDate: null,
      totalXp: 0,
      recordAttempt: (attempt) => {
        set((state) => ({
          attempts: [...state.attempts, attempt],
        }));
      },
      finishSession: ({ xp, missedItemIds }) => {
        const today = todayKey();
        const { lastSessionDate, streakDays, dueItemIds } = get();
        let nextStreak = streakDays;
        if (lastSessionDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yKey = yesterday.toISOString().slice(0, 10);
          nextStreak = lastSessionDate === yKey ? streakDays + 1 : 1;
        }

        const due = new Set(dueItemIds);
        for (const id of missedItemIds) due.add(id);

        set((state) => ({
          totalXp: state.totalXp + xp,
          streakDays: nextStreak,
          lastSessionDate: today,
          dueItemIds: [...due],
        }));
      },
      reset: () =>
        set({
          attempts: [],
          dueItemIds: [],
          streakDays: 0,
          lastSessionDate: null,
          totalXp: 0,
        }),
    }),
    { name: "passaporte-progress-v1" },
  ),
);
