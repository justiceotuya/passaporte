export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

type PostHogLike = {
  capture: (event: string, props?: AnalyticsPayload) => void;
};

declare global {
  interface Window {
    posthog?: PostHogLike;
  }
}

const buffer: { event: string; props?: AnalyticsPayload }[] = [];

/** Capture analytics; buffers in test / when PostHog is absent. */
export function track(event: string, props?: AnalyticsPayload): void {
  if (typeof window !== "undefined" && window.posthog?.capture) {
    window.posthog.capture(event, props);
    return;
  }
  buffer.push({ event, props });
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, props ?? {});
  }
}

export function drainAnalyticsBuffer() {
  return buffer.splice(0, buffer.length);
}
