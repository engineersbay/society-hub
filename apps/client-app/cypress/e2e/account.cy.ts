import { mockResident } from "../support/commands";

describe("Account flat details", () => {
  it("shows linked flat details for a resident", () => {
    cy.loginAsResident();
    cy.intercept("GET", "**/v1/profile", {
      statusCode: 200,
      body: {
        userId: mockResident.id,
        emergencyContact: "9999999999",
        vehicleNumber: "MH12AB1234",
        societyName: "Keshav Heights",
        flat: {
          id: "flat-1",
          number: "101",
          wingName: "A",
          buildingName: "Tower A",
          floor: 1,
          parkingSlot: "P-101",
          isOwner: true,
        },
      },
    }).as("profile");

    cy.visit("/account");
    cy.wait("@profile");
    cy.get('[data-testid="account-flat-details"]').should("be.visible");
    cy.get('[data-testid="account-society-name"]').should("contain", "Keshav Heights");
    cy.get('[data-testid="account-flat-number"]').should("contain", "A-101");
    cy.get('[data-testid="account-building-name"]').should("contain", "Tower A");
    cy.get('[data-testid="account-floor"]').should("contain", "1");
    cy.get('[data-testid="account-parking"]').should("contain", "P-101");
    cy.get('[data-testid="account-occupancy"]').should("contain", "Owner");
  });

  it("shows empty state when no flat is linked", () => {
    cy.loginAsStaff();
    cy.intercept("GET", "**/v1/profile", {
      statusCode: 200,
      body: {
        userId: "staff-1",
        emergencyContact: null,
        vehicleNumber: null,
        societyName: "Keshav Heights",
        flat: null,
      },
    }).as("profile");

    cy.visit("/account");
    cy.wait("@profile");
    cy.get('[data-testid="account-flat-empty"]').should("be.visible");
  });
});
