import { expect, test } from "@playwright/test";

const user = {
  id: "33333333-3333-3333-3333-333333333333",
  phone: "8888888888",
  email: "resident@keshav.local",
  name: "Asha Rao",
  username: null,
  role: "resident",
  tenantId: "22222222-2222-2222-2222-222222222222",
  flatId: "flat-1",
  flatNumber: "A-101",
  hasPin: false,
};

test("login stays rendered for a logged-out visitor", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/login");
  await expect(page.getByText("Resident sign-in")).toBeVisible();
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
  await page.route("**/v1/auth/memberships", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          tenantId: user.tenantId,
          societyName: "Keshav Heights",
          role: "resident",
        },
      ]),
    });
  });

  await page.addInitScript((saved) => {
    localStorage.setItem("sh_web_access", "dev-access");
    localStorage.setItem("sh_web_refresh", "dev-refresh");
    localStorage.setItem("sh_web_user", JSON.stringify(saved));
  }, user);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/(select-society|dashboard)/, { timeout: 15_000 });
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
