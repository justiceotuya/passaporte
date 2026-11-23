import { describe, expect, it } from "vitest";
import {
  isConvexConfigured,
  getConvexUrl,
  getContentSource,
} from "@/lib/convex-env";

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

  it("defaults CONTENT_SOURCE to convex when URL is set", () => {
    const prevUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const prevSource = process.env.CONTENT_SOURCE;
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
    delete process.env.CONTENT_SOURCE;
    expect(getContentSource()).toBe("convex");
    process.env.CONTENT_SOURCE = "fs";
    expect(getContentSource()).toBe("fs");
    process.env.NEXT_PUBLIC_CONVEX_URL = prevUrl;
    if (prevSource === undefined) delete process.env.CONTENT_SOURCE;
    else process.env.CONTENT_SOURCE = prevSource;
  });
});
