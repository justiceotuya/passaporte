import { expect, test } from "@playwright/test";

async function clearProgress(page: import("@playwright/test").Page) {
  await page.goto("/settings");
  await page.evaluate(() => {
    window.localStorage.removeItem("passaporte-progress-v2");
  });
  await page.reload();
}

test("landing page shows marketing hero and links to map", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("passaporte-landing")).toBeVisible();
  await expect(page.getByTestId("landing-start")).toBeVisible();
  await page.getByTestId("landing-start").click();
  await expect(page.getByTestId("unit-map")).toBeVisible();
});

test("review / stats / settings pages and analytics mock", async ({ page }) => {
  await page.addInitScript(() => {
    const events: { event: string; props?: Record<string, unknown> }[] = [];
    (
      window as unknown as {
        __ph: typeof events;
        posthog: { capture: (event: string, props?: Record<string, unknown>) => void };
      }
    ).__ph = events;
    (
      window as unknown as {
        posthog: { capture: (event: string, props?: Record<string, unknown>) => void };
      }
    ).posthog = {
      capture(event, props) {
        events.push({ event, props });
      },
    };
  });

  await clearProgress(page);
  await expect(page.getByTestId("settings-page")).toBeVisible();
  await expect(page.getByTestId("setting-appearance")).toBeVisible();
  await page.getByTestId("setting-appearance-dark").click();
  await expect(page.getByTestId("setting-instruction-language")).toBeVisible();
  await page.getByTestId("setting-instruction-language-pt").click();
  await expect(page.getByTestId("setting-instruction-language-pt")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("setting-accent-strict").click();
  await page.getByTestId("setting-typed-mode").check();
  await page.getByTestId("setting-hearts").check();
  await page.getByRole("button", { name: "8", exact: true }).click();
  await expect(page.getByTestId("setting-hearts")).toBeChecked();
  await expect(page.getByTestId("setting-typed-mode")).toBeChecked();

  await page.goto("/stats");
  await expect(page.getByTestId("stats-page")).toBeVisible();
  await expect(page.getByTestId("stat-xp")).toContainText("0");
  await expect(page.getByTestId("stat-accuracy")).toContainText("0%");

  await page.goto("/review");
  await expect(page.getByTestId("review-page")).toBeVisible();
  await expect(page.getByTestId("review-empty")).toBeVisible();

  // Phone: bottom tab bar
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("app-nav")).toBeVisible();
  await page.getByTestId("nav-map").click();
  await expect(page.getByTestId("unit-map")).toBeVisible();

  // Desktop: side rail (PassaporteDesktop)
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByTestId("app-nav-rail")).toBeVisible();
  await page.getByTestId("nav-settings-rail").click();
  await expect(page.getByTestId("settings-page")).toBeVisible();
  await expect(page.getByTestId("setting-account")).toBeVisible();
  await expect(
    page.getByTestId("setting-account").getByTestId("auth-sign-in"),
  ).toBeVisible();

  await page.goto("/units/1");
  await expect(page.getByTestId("unit-exercises")).toBeVisible();
  await expect(page.getByTestId("app-nav-rail")).toBeVisible();

  await page.goto("/play?size=2");
  await expect(page.getByTestId("session-player")).toBeVisible();
  await expect(page.getByTestId("session-hearts")).toBeVisible();
  await expect(page.getByTestId("play-settings-link")).toBeVisible();

  const events = await page.evaluate(() => {
    return (window as unknown as { __ph: { event: string }[] }).__ph ?? [];
  });
  expect(events.some((e) => e.event === "session_start")).toBe(true);
});

test("settings hearts persist across reload", async ({ page }) => {
  await clearProgress(page);
  await page.getByTestId("setting-hints").uncheck();
  await page.reload();
  await expect(page.getByTestId("setting-hints")).not.toBeChecked();
});
