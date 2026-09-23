import { describe, expect, it, vi, afterEach } from "vitest";
import { resolveAppearance } from "@/lib/appearance";

describe("resolveAppearance", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns explicit light/dark", () => {
    expect(resolveAppearance("light")).toBe("light");
    expect(resolveAppearance("dark")).toBe("dark");
  });

  it("follows system preference when appearance is system", () => {
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: query.includes("dark"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });
    expect(resolveAppearance("system")).toBe("dark");
    expect(resolveAppearance(undefined)).toBe("dark");
  });
});
