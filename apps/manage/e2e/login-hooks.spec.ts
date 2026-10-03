import { expect, test } from "@playwright/test";

const user = {
  id: "11111111-1111-1111-1111-111111111111",
  phone: "9999999999",
  email: "ops@societyhub.local",
  name: "Platform Ops",
  username: null,
  role: "superadmin",
  tenantId: null,
  flatId: null,
  flatNumber: null,
  hasPin: false,
};

test("login stays rendered for a logged-out visitor", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/login");
  await expect(page.getByText("Manage").first()).toBeVisible();
  await expect(page.getByTestId("login-submit")).toBeVisible();
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("login with a saved session redirects without a hooks crash", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.route("**/v1/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    });
  });

  await page.addInitScript((saved) => {
    localStorage.setItem("sh_manage_access", "dev-access");
    localStorage.setItem("sh_manage_refresh", "dev-refresh");
    localStorage.setItem("sh_manage_user", JSON.stringify(saved));
  }, user);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
