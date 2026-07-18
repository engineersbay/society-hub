describe("Manage onboard resident", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.intercept("GET", "**/v1/admin/flats", {
      statusCode: 200,
      body: [{ id: "flat-1", number: "101", wingName: "A" }],
    }).as("flats");
  });

  it("requires an email and labels the current society as read-only", () => {
    cy.visit("/onboard");
    cy.wait("@flats");

    cy.contains("h1", "Onboard resident").should("be.visible");
    cy.get('[data-testid="onboard-society-name"]').should("be.disabled");
    cy.contains("Chairperson").should("be.visible");

    cy.get("#onboard-email:invalid").should("exist");

    cy.intercept("POST", "**/v1/admin/residents", {
      statusCode: 200,
      body: { user: { name: "Test Resident", phone: "9999999999" } },
    }).as("onboard");

    cy.get("#name").type("Test Resident");
    cy.get("#phone").type("9999999999");
    cy.get("#onboard-email").type("resident@example.com");
    cy.get('[data-testid="onboard-submit"]').click();

    cy.wait("@onboard");
    cy.contains("Onboarded Test Resident").should("be.visible");
  });
});
