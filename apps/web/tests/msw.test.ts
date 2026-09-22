import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";

describe("MSW handlers", () => {
  it("mocks GET /api/progress", async () => {
    const res = await fetch("http://localhost/api/progress");
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.streakDays).toBe(2);
    expect(body.dueItemIds).toContain("pass-u01-p010-A-1");
  });

  it("mocks POST /api/progress finish", async () => {
    const res = await fetch("http://localhost/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "finish",
        xp: 15,
        missedItemIds: ["pass-u01-p011-B-2"],
      }),
    });
    const body = await res.json();
    expect(body.totalXp).toBe(15);
    expect(body.dueItemIds).toEqual(["pass-u01-p011-B-2"]);
  });

  it("mocks auth sign-in", async () => {
    const res = await fetch("http://localhost/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "password1" }),
    });
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.user.email).toBe("a@b.com");
  });

  it("can override a handler per test", async () => {
    server.use(
      http.get("http://localhost/api/progress", () =>
        HttpResponse.json({ dueItemIds: [], streakDays: 0, totalXp: 0 }),
      ),
    );
    const res = await fetch("http://localhost/api/progress");
    const body = await res.json();
    expect(body.streakDays).toBe(0);
  });
});
