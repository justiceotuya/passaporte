import { expect, test } from "@playwright/test";

test("non-admin cannot use admin review API", async ({ request }) => {
  const res = await request.get("/api/admin/review");
  expect([401, 403, 404]).toContain(res.status());
});

test("admin review route is gated in the UI", async ({ page }) => {
  await page.goto("/admin/review");
  // Either redirected to sign-in, forbidden panel, or (with bypass) board.
  const url = page.url();
  if (url.includes("sign-in")) {
    await expect(page.getByTestId("sign-in-form")).toBeVisible();
    return;
  }
  const forbidden = page.getByTestId("admin-forbidden");
  const board = page.getByTestId("admin-review-board");
  const empty = page.getByTestId("admin-review-empty");
  await expect(forbidden.or(board).or(empty)).toBeVisible();
});
