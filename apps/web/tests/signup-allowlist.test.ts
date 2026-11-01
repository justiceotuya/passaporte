import { describe, expect, it } from "vitest";
import { allowedSignupEmails, isSignupAllowed } from "../src/lib/signup-allowlist";

describe("signup allowlist", () => {
  it("parses a comma-separated list, trimmed and lower-cased", () => {
    expect(allowedSignupEmails(" Me@Example.com, friend@example.com ,")).toEqual([
      "me@example.com",
      "friend@example.com",
    ]);
  });

  it("allows only listed emails when the list is set", () => {
    const allowlist = ["me@example.com"];
    expect(isSignupAllowed("ME@example.com", { allowlist, production: true })).toBe(true);
    expect(isSignupAllowed("other@example.com", { allowlist, production: false })).toBe(false);
    expect(isSignupAllowed(undefined, { allowlist })).toBe(false);
  });

  it("is open in development and closed in production when the list is empty", () => {
    expect(isSignupAllowed("anyone@example.com", { allowlist: [], production: false })).toBe(true);
    expect(isSignupAllowed("anyone@example.com", { allowlist: [], production: true })).toBe(false);
  });
});
