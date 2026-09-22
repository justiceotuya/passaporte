import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

type FixtureItem = {
  id: string;
  type: string;
  answer: string;
};

type FixtureUnit = {
  items: FixtureItem[];
};

const unit = JSON.parse(
  readFileSync(
    path.join(__dirname, "../../../content/passaporte/u01.json"),
    "utf8",
  ),
) as FixtureUnit;

const answers = new Map(unit.items.map((item) => [item.id, item]));

test("completes a short fixture session on /play", async ({ page }) => {
  await page.goto("/play?size=3");
  await expect(page.getByTestId("session-player")).toBeVisible();

  for (let i = 0; i < 3; i += 1) {
    const player = page.getByTestId("session-player");
    await expect(player).toHaveAttribute("data-phase", "playing");

    const itemId = await player.getAttribute("data-item-id");
    expect(itemId).toBeTruthy();
    const item = answers.get(itemId!);
    expect(item, `fixture missing ${itemId}`).toBeTruthy();

    if (item!.type === "true_false") {
      const label = item!.answer === "true" ? "Verdadeiro" : "Falso";
      await page.getByRole("button", { name: label }).click();
    } else {
      await page.getByRole("button", { name: item!.answer, exact: true }).click();
    }

    await expect(page.getByRole("status")).toBeVisible();
    await page.getByTestId("continue-button").click();
  }

  await expect(page.getByTestId("session-summary")).toBeVisible();
  await expect(page.getByText(/session complete/i)).toBeVisible();
  await expect(page.getByText(/you earned/i)).toBeVisible();
});

test("can create an account from sign-in", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.locator('input[autocomplete="name"]').fill("E2E Learner");
  await page.locator('input[autocomplete="email"]').fill(email);
  await page.locator('input[autocomplete="new-password"]').fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/(\?|$)/, { timeout: 30_000 });
  await expect(page.getByTestId("unit-map")).toBeVisible({ timeout: 15_000 });
});
