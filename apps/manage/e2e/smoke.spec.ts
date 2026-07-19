import { expect, test } from "@playwright/test";

test("platform login lands on Manage dashboard", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("SocietyHub").first()).toBeVisible();

  await page.getByLabel("Email").fill("superadmin@societyhub.local");
  await page.getByLabel("Password").fill("Test@1234");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByTestId("manage-dashboard")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("link", { name: "Manage societies" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Societies" }).first()).toBeVisible();
});
