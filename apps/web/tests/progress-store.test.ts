import { beforeEach, describe, expect, it } from "vitest";
import { useProgressStore } from "@/lib/progress-store";

describe("progress store SM-2 finishSession", () => {
  beforeEach(() => {
    useProgressStore.getState().reset();
    localStorage.clear();
  });

  it("updates streak, XP, and itemStates from answeredItems", () => {
    const store = useProgressStore.getState();
    store.finishSession({
      sessionId: "s1",
      xp: 25,
      missedItemIds: [],
      answeredItems: [
        { itemId: "hit", correct: true },
        { itemId: "miss", correct: false },
      ],
    });

    const next = useProgressStore.getState();
    expect(next.totalXp).toBe(25);
    expect(next.streakDays).toBe(1);
    expect(next.itemStates.hit.intervalDays).toBe(1);
    expect(next.itemStates.miss.mastery).toBe(0);
    expect(next.dueItemIds).toContain("miss");
  });

  it("persists settings patches", () => {
    useProgressStore.getState().updateSettings({
      heartsEnabled: true,
      sessionLength: 8,
      hintsEnabled: false,
      appearance: "dark",
      accentStrictness: "strict",
      typedMode: true,
    });
    const settings = useProgressStore.getState().settings;
    expect(settings.heartsEnabled).toBe(true);
    expect(settings.sessionLength).toBe(8);
    expect(settings.hintsEnabled).toBe(false);
    expect(settings.appearance).toBe("dark");
    expect(settings.accentStrictness).toBe("strict");
    expect(settings.typedMode).toBe(true);
  });

  it("defaults appearance to system", () => {
    expect(useProgressStore.getState().settings.appearance).toBe("system");
  });

  it("defaults instructionLanguage to en", () => {
    expect(useProgressStore.getState().settings.instructionLanguage).toBe("en");
  });

  it("mergeRemoteSnapshot unions due ids and takes max xp/streak", () => {
    useProgressStore.setState({
      totalXp: 10,
      streakDays: 2,
      dueItemIds: ["a"],
    });
    useProgressStore.getState().mergeRemoteSnapshot({
      totalXp: 40,
      streakDays: 1,
      dueItemIds: ["b"],
    });
    const next = useProgressStore.getState();
    expect(next.totalXp).toBe(40);
    expect(next.streakDays).toBe(2);
    expect(next.dueItemIds.sort()).toEqual(["a", "b"]);
  });
});
