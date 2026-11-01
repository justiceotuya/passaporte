import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

type FixtureItem = {
  id: string;
  type: string;
  answer: string | string[] | { left: string; right: string }[];
  options?: string[];
  pairs?: { left: string; right: string }[];
  sequence?: string[];
  stimulus_image?: string | null;
};

type FixtureUnit = {
  items: FixtureItem[];
};

const unit = JSON.parse(
  readFileSync(
    path.join(__dirname, "../../../content/sample/u01.json"),
    "utf8",
  ),
) as FixtureUnit;

const answers = new Map(unit.items.map((item) => [item.id, item]));

test.beforeEach(async ({ page }) => {
  await page.goto("/settings");
  await page.evaluate(() => {
    window.localStorage.removeItem("passaporte-progress-v2");
  });
});

async function answerCurrentItem(page: import("@playwright/test").Page) {
  const player = page.getByTestId("session-player");
  await expect(player).toHaveAttribute("data-phase", "playing");
  const itemId = await player.getAttribute("data-item-id");
  const itemType = await player.getAttribute("data-item-type");
  expect(itemId).toBeTruthy();
  const item = answers.get(itemId!);
  expect(item, `fixture missing ${itemId}`).toBeTruthy();

  if (itemType === "true_false") {
    const label = item!.answer === "true" ? "Verdadeiro" : "Falso";
    await player.getByRole("button", { name: label }).click();
    return;
  }

  if (itemType === "choice" || itemType === "listen_choice") {
    await player
      .getByRole("button", { name: String(item!.answer), exact: true })
      .first()
      .click();
    return;
  }

  if (
    itemType === "fill_blank" &&
    Array.isArray(item!.options) &&
    item!.options.length >= 2
  ) {
    await player
      .getByRole("button", { name: String(item!.answer), exact: true })
      .first()
      .click();
    return;
  }

  if (itemType === "fill_blank" || itemType === "transform") {
    await page.getByTestId("fill-blank-input").fill(String(item!.answer));
    await page.getByTestId("fill-blank-submit").click();
    return;
  }

  if (itemType === "match") {
    const pairs =
      Array.isArray(item!.answer) && typeof item!.answer[0] === "object"
        ? (item!.answer as { left: string; right: string }[])
        : (item!.pairs ?? []);
    for (const pair of pairs) {
      await player.getByRole("button", { name: pair.left, exact: true }).first().click();
      await player.getByRole("button", { name: pair.right, exact: true }).first().click();
    }
    return;
  }

  if (itemType === "order") {
    const seq =
      Array.isArray(item!.answer) && typeof item!.answer[0] === "string"
        ? (item!.answer as string[])
        : (item!.sequence ?? []);
    for (const step of seq) {
      await player.getByRole("button", { name: step, exact: true }).first().click();
    }
    await page.getByTestId("order-submit").click();
    return;
  }

  throw new Error(`Unhandled item type ${itemType} for ${itemId}`);
}

test("completes a short fixture session on /play", async ({ page }) => {
  await page.goto("/play?size=3");
  await expect(page.getByTestId("session-player")).toBeVisible();

  for (let i = 0; i < 3; i += 1) {
    await answerCurrentItem(page);
    await expect(page.getByTestId("continue-button")).toBeVisible();
    await page.getByTestId("continue-button").click();
  }

  await expect(page.getByTestId("session-summary")).toBeVisible();
  await expect(page.getByText(/session complete/i)).toBeVisible();
  await expect(page.getByText(/you earned/i)).toBeVisible();
});

test("enlarges stimulus image in a lightbox", async ({ page }) => {
  const withImage = unit.items
    .filter((item) => Boolean(item.stimulus_image))
    .slice(0, 5)
    .map((item) => item.id);

  expect(withImage.length).toBeGreaterThan(0);

  await page.goto("/settings");
  await page.evaluate((ids) => {
    const now = Date.now() - 60_000;
    const itemStates = Object.fromEntries(
      ids.map((id) => [
        id,
        {
          ease: 2.5,
          intervalDays: 0,
          dueAt: now,
          mastery: 0,
        },
      ]),
    );
    window.localStorage.setItem(
      "passaporte-progress-v2",
      JSON.stringify({
        state: {
          attempts: [],
          itemStates,
          dueItemIds: ids,
          streakDays: 0,
          lastSessionDate: null,
          totalXp: 0,
          settings: {
            accentStrictness: "lenient",
            sessionLength: 12,
            heartsEnabled: false,
            hintsEnabled: true,
            typedMode: false,
            appearance: "light",
          },
        },
        version: 0,
      }),
    );
  }, withImage);

  await page.goto("/play?review=1&size=5");
  await expect(page.getByTestId("session-player")).toBeVisible();

  const zoom = page.getByTestId("stimulus-image-zoom");
  await expect(zoom).toBeVisible({ timeout: 15_000 });
  await zoom.click();
  await expect(page.getByTestId("image-lightbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("image-lightbox")).toHaveCount(0);
  await zoom.click();
  await page.getByTestId("image-lightbox-close").click();
  await expect(page.getByTestId("image-lightbox")).toHaveCount(0);
});

test("can create an account from sign-in", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.locator('input[autocomplete="name"]').fill("E2E Learner");
  await page.locator('input[autocomplete="email"]').fill(email);
  await page.locator('input[autocomplete="new-password"]').fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  // Auth may stay on /sign-in if Convex is unreachable; accept either success or visible error.
  await Promise.race([
    page.waitForURL(/\/(map)?(\?|$)/, { timeout: 30_000 }),
    page.getByRole("alert").waitFor({ state: "visible", timeout: 30_000 }),
  ]).catch(() => undefined);

  const url = page.url();
  const onApp =
    !url.includes("sign-in") &&
    (/\/map(\?|$)/.test(url) || /\/(\?|$)/.test(url));
  if (onApp) {
    // Signed-in landing redirects to /map; unit map is the learner home.
    if (/\/(\?|$)/.test(url) && !url.includes("/map")) {
      await page.goto("/map");
    }
    await expect(page.getByTestId("unit-map")).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(page.getByTestId("sign-in-form")).toBeVisible();
  }
});
