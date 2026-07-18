/// <reference types="cypress" />

export const mockAdminUser = {
  id: "11111111-1111-1111-1111-111111111111",
  phone: null,
  email: "superadmin@societyhub.local",
  name: "Super Admin",
  username: null,
  role: "superadmin" as const,
  tenantId: "22222222-2222-2222-2222-222222222222",
  flatId: null,
  flatNumber: null,
  hasPin: false,
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Seeds localStorage + intercepts /v1/auth/me so the Manage shell renders as a logged-in superadmin. */
      loginAsAdmin(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("loginAsAdmin", () => {
  cy.intercept("GET", "**/v1/auth/me", { statusCode: 200, body: mockAdminUser }).as("me");
  cy.intercept("GET", "**/v1/auth/memberships", {
    statusCode: 200,
    body: [{ tenantId: mockAdminUser.tenantId, societyName: "Keshav Heights", role: "superadmin" }],
  }).as("memberships");

  cy.window().then((win) => {
    win.localStorage.setItem("sh_manage_access", "dev-access-token");
    win.localStorage.setItem("sh_manage_refresh", "dev-refresh-token");
    win.localStorage.setItem("sh_manage_user", JSON.stringify(mockAdminUser));
  });
});

export {};
