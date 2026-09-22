import { afterEach, describe, expect, it } from "vitest";
import {
  assertAdminAccess,
  isAdminBypassEnabled,
  isAdminEmail,
} from "@/lib/admin";

describe("admin access", () => {
  const prevEmails = process.env.PASSAPORTE_ADMIN_EMAILS;
  const prevBypass = process.env.PASSAPORTE_ADMIN_BYPASS;

  afterEach(() => {
    if (prevEmails === undefined) delete process.env.PASSAPORTE_ADMIN_EMAILS;
    else process.env.PASSAPORTE_ADMIN_EMAILS = prevEmails;
    if (prevBypass === undefined) delete process.env.PASSAPORTE_ADMIN_BYPASS;
    else process.env.PASSAPORTE_ADMIN_BYPASS = prevBypass;
  });

  it("matches configured admin emails", () => {
    process.env.PASSAPORTE_ADMIN_EMAILS = "a@example.com, b@example.com";
    expect(isAdminEmail("A@example.com")).toBe(true);
    expect(isAdminEmail("other@example.com")).toBe(false);
  });

  it("returns 404 when admin is not configured", () => {
    delete process.env.PASSAPORTE_ADMIN_EMAILS;
    delete process.env.PASSAPORTE_ADMIN_BYPASS;
    const result = assertAdminAccess({ email: "a@example.com" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("returns 401 without email when configured", () => {
    process.env.PASSAPORTE_ADMIN_EMAILS = "admin@passaporte.test";
    const result = assertAdminAccess({ email: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("returns 403 for non-admin email", () => {
    process.env.PASSAPORTE_ADMIN_EMAILS = "admin@passaporte.test";
    const result = assertAdminAccess({ email: "learner@example.com" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("allows bypass only outside production", () => {
    process.env.PASSAPORTE_ADMIN_BYPASS = "1";
    expect(isAdminBypassEnabled()).toBe(process.env.NODE_ENV !== "production");
  });
});
