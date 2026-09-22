import { expect, test } from "@playwright/test";

test("auth providers endpoint and sign-in google control", async ({ page }) => {
  const res = await page.request.get("/api/auth/providers");
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { google: boolean; emailPassword: boolean };
  expect(body.emailPassword).toBe(true);
  expect(typeof body.google).toBe("boolean");

  await page.goto("/sign-in");
  await expect(page.getByTestId("sign-in-form")).toBeVisible();
  await expect(page.getByTestId("sign-in-google")).toBeVisible();
  if (body.google) {
    await expect(page.getByTestId("sign-in-google")).toBeEnabled();
  } else {
    await expect(page.getByTestId("sign-in-google")).toBeDisabled();
  }
});
