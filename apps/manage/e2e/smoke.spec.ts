import { expect, test } from "@playwright/test";

test("admin login and open complaints", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("SocietyHub").first()).toBeVisible();

  await page.getByLabel("Email").fill("superadmin@societyhub.local");
  await page.getByLabel("Password").fill("Test@1234");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("link", { name: "Onboard resident" })).toBeVisible();

  await page.getByRole("link", { name: "Complaints" }).click();
  await expect(page.getByRole("heading", { name: "Complaints" })).toBeVisible();
});
