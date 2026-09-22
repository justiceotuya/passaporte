import { describe, expect, it, vi } from "vitest";
import { drainAnalyticsBuffer, track } from "@/lib/analytics";

describe("analytics mock", () => {
  it("buffers events when posthog is absent", () => {
    drainAnalyticsBuffer();
    track("session_start", { unit: 1 });
    track("item_answered", { correct: true });
    const events = drainAnalyticsBuffer();
    expect(events.map((e) => e.event)).toEqual([
      "session_start",
      "item_answered",
    ]);
  });

  it("forwards to window.posthog when present", () => {
    drainAnalyticsBuffer();
    const capture = vi.fn();
    window.posthog = { capture };
    track("session_complete", { xp: 10 });
    expect(capture).toHaveBeenCalledWith("session_complete", { xp: 10 });
    expect(drainAnalyticsBuffer()).toEqual([]);
    delete window.posthog;
  });
});
