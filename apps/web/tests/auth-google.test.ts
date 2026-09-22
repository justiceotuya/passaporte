import { describe, expect, it } from "vitest";

describe("auth google flag", () => {
  it("exports isGoogleAuthConfigured boolean", async () => {
    const { isGoogleAuthConfigured } = await import("@/lib/auth");
    expect(typeof isGoogleAuthConfigured).toBe("boolean");
  });
});
