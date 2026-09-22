import { http, HttpResponse } from "msw";

export const progressHandlers = [
  http.get("http://localhost/api/progress", () => {
    return HttpResponse.json({
      dueItemIds: ["pass-u01-p010-A-1"],
      streakDays: 2,
      totalXp: 40,
    });
  }),
  http.post("http://localhost/api/progress", async ({ request }) => {
    const body = (await request.json()) as {
      type: string;
      xp?: number;
      missedItemIds?: string[];
    };
    return HttpResponse.json({
      dueItemIds: body.missedItemIds ?? [],
      streakDays: 1,
      totalXp: body.xp ?? 0,
    });
  }),
];

export const authHandlers = [
  http.post("http://localhost/api/auth/sign-in/email", async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return HttpResponse.json({ message: "Missing credentials" }, { status: 400 });
    }
    return HttpResponse.json({
      user: { id: "user_test", email: body.email, name: "Test" },
      session: { token: "test-session" },
    });
  }),
  http.post("http://localhost/api/auth/sign-up/email", async ({ request }) => {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };
    if (!body.email || !body.password) {
      return HttpResponse.json({ message: "Missing fields" }, { status: 400 });
    }
    return HttpResponse.json({
      user: {
        id: "user_new",
        email: body.email,
        name: body.name ?? "Learner",
      },
      session: { token: "test-session-new" },
    });
  }),
];

export const handlers = [...progressHandlers, ...authHandlers];
