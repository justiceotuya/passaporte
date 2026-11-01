import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

type FixtureItem = {
  id: string;
  type: string;
  answer: string | string[] | { left: string; right: string }[];
  pairs?: { left: string; right: string }[];
  sequence?: string[];
  options?: string[];
};

type FixtureUnit = {
  items: FixtureItem[];
};

const unit = JSON.parse(
  readFileSync(
    path.join(__dirname, "../../../content/sample/u02.json"),
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

test("smoke play shipped unit u02", async ({ page }) => {
  await page.goto("/play?unit=2&size=2");
  await expect(page.getByTestId("session-player")).toBeVisible();

  for (let i = 0; i < 2; i += 1) {
    const player = page.getByTestId("session-player");
    await expect(player).toHaveAttribute("data-phase", "playing");
    const itemId = await player.getAttribute("data-item-id");
    const itemType = await player.getAttribute("data-item-type");
    const item = answers.get(itemId!);
    expect(item, `missing ${itemId}`).toBeTruthy();

    if (itemType === "true_false") {
      const label = item!.answer === "true" ? "Verdadeiro" : "Falso";
      await page.getByRole("button", { name: label }).click();
    } else if (itemType === "choice" || itemType === "listen_choice") {
      await page
        .getByRole("button", { name: String(item!.answer), exact: true })
        .click();
    } else if (itemType === "fill_blank" || itemType === "transform") {
      await page.getByTestId("fill-blank-input").fill(String(item!.answer));
      await page.getByTestId("fill-blank-submit").click();
    } else if (itemType === "match") {
      const pairs =
        Array.isArray(item!.answer) && typeof item!.answer[0] === "object"
          ? (item!.answer as { left: string; right: string }[])
          : (item!.pairs ?? []);
      for (const pair of pairs) {
        await page.getByRole("button", { name: pair.left, exact: true }).click();
        await page.getByRole("button", { name: pair.right, exact: true }).click();
      }
    } else if (itemType === "order") {
      const seq =
        Array.isArray(item!.answer) && typeof item!.answer[0] === "string"
          ? (item!.answer as string[])
          : (item!.sequence ?? []);
      for (const step of seq) {
        await page.getByRole("button", { name: step, exact: true }).first().click();
      }
      await page.getByTestId("order-submit").click();
    } else {
      throw new Error(`Unhandled type ${itemType} for ${itemId}`);
    }

    await expect(page.getByRole("status")).toBeVisible();
    await page.getByTestId("continue-button").click();
  }

  await expect(page.getByTestId("session-summary")).toBeVisible();
});
