import { describe, expect, it, vi } from "vitest";

describe("auth-email", () => {
  it("reports configured when RESEND_API_KEY is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const { isAuthEmailConfigured } = await import("@/lib/auth-email");
    expect(isAuthEmailConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });

  it("logs instead of sending when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendPasswordResetEmail } = await import("@/lib/auth-email");
    const result = await sendPasswordResetEmail({
      to: "learner@example.com",
      url: "http://localhost:3000/reset-password?token=abc",
    });
    expect(result).toBe("logged");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    vi.unstubAllEnvs();
  });
});
