import { describe, expect, it } from "vitest";
import { isConvexConfigured, getConvexUrl } from "@/lib/convex-env";

describe("convex-env", () => {
  it("reports unconfigured when NEXT_PUBLIC_CONVEX_URL is empty", () => {
    const prev = process.env.NEXT_PUBLIC_CONVEX_URL;
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    expect(isConvexConfigured()).toBe(false);
    expect(getConvexUrl()).toBeNull();
    process.env.NEXT_PUBLIC_CONVEX_URL = prev;
  });

  it("reports configured when URL is set", () => {
    const prev = process.env.NEXT_PUBLIC_CONVEX_URL;
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
    expect(isConvexConfigured()).toBe(true);
    expect(getConvexUrl()).toBe("https://example.convex.cloud");
    process.env.NEXT_PUBLIC_CONVEX_URL = prev;
  });
});
