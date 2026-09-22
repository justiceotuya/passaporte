import { expect, test } from "@playwright/test";

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

  await page.goto("/settings");
  await expect(page.getByTestId("settings-page")).toBeVisible();
  await page.getByTestId("setting-hearts").check();
  await page.getByRole("button", { name: "8", exact: true }).click();
  await expect(page.getByTestId("setting-hearts")).toBeChecked();

  await page.goto("/stats");
  await expect(page.getByTestId("stats-page")).toBeVisible();
  await expect(page.getByTestId("stat-xp")).toContainText("0");
  await expect(page.getByTestId("stat-accuracy")).toContainText("0%");

  await page.goto("/review");
  await expect(page.getByTestId("review-page")).toBeVisible();
  await expect(page.getByTestId("review-empty")).toBeVisible();

  await page.getByTestId("nav-map").click();
  await expect(page.getByTestId("unit-map")).toBeVisible();

  await page.goto("/play?size=2");
  await expect(page.getByTestId("session-player")).toBeVisible();
  await expect(page.getByTestId("session-hearts")).toBeVisible();

  const events = await page.evaluate(() => {
    return (window as unknown as { __ph: { event: string }[] }).__ph ?? [];
  });
  expect(events.some((e) => e.event === "session_start")).toBe(true);
});

test("settings hearts persist across reload", async ({ page }) => {
  await page.goto("/settings");
  await page.getByTestId("setting-hints").uncheck();
  await page.reload();
  await expect(page.getByTestId("setting-hints")).not.toBeChecked();
});
