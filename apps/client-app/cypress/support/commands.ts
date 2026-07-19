/// <reference types="cypress" />

export const mockResident = {
  id: "33333333-3333-3333-3333-333333333333",
  phone: "8888888888",
  email: null,
  name: "Asha Rao",
  username: null,
  role: "resident" as const,
  tenantId: "22222222-2222-2222-2222-222222222222",
  flatId: "flat-1",
  flatNumber: "A-101",
  hasPin: false,
};

export const mockStaff = {
  id: "44444444-4444-4444-4444-444444444444",
  phone: null,
  email: "chair@societyhub.local",
  name: "Rekha Iyer",
  username: null,
  role: "chairperson" as const,
  tenantId: "22222222-2222-2222-2222-222222222222",
  flatId: null,
  flatNumber: null,
  hasPin: false,
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Seeds localStorage + intercepts /v1/auth/me so the resident shell renders as logged in. */
      loginAsResident(): Chainable<void>;
      /** Seeds localStorage + intercepts /v1/auth/me so the shell renders as a logged-in society staff (chairperson) in Admin mode. */
      loginAsStaff(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("loginAsResident", () => {
  cy.intercept("GET", "**/v1/auth/me", { statusCode: 200, body: mockResident }).as("me");
  cy.intercept("GET", "**/v1/auth/memberships", {
    statusCode: 200,
    body: [{ tenantId: mockResident.tenantId, societyName: "Keshav Heights", role: "resident", canUseAdminMode: false }],
  }).as("memberships");

  cy.window().then((win) => {
    win.localStorage.setItem("sh_web_access", "dev-access-token");
    win.localStorage.setItem("sh_web_refresh", "dev-refresh-token");
    win.localStorage.setItem("sh_web_user", JSON.stringify(mockResident));
  });
});

Cypress.Commands.add("loginAsStaff", () => {
  cy.intercept("GET", "**/v1/auth/me", { statusCode: 200, body: mockStaff }).as("me");
  cy.intercept("GET", "**/v1/auth/memberships", {
    statusCode: 200,
    body: [{ tenantId: mockStaff.tenantId, societyName: "Keshav Heights", role: "chairperson", canUseAdminMode: true }],
  }).as("memberships");

  cy.window().then((win) => {
    win.localStorage.setItem("sh_web_access", "dev-access-token");
    win.localStorage.setItem("sh_web_refresh", "dev-refresh-token");
    win.localStorage.setItem("sh_web_user", JSON.stringify(mockStaff));
    win.localStorage.setItem("sh_app_mode", "admin");
  });
});

export {};
