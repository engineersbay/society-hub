describe("Manage sidebar navigation", () => {
  beforeEach(() => {
    // Any list endpoint we haven't explicitly mocked should degrade gracefully to empty.
    // Registered first so more specific intercepts below (and inside loginAsAdmin) take
    // priority — Cypress resolves overlapping intercepts last-registered-first.
    cy.intercept("GET", "**/v1/**", { statusCode: 200, body: [] });
    cy.loginAsAdmin();
    cy.intercept("GET", "**/v1/societies", {
      statusCode: 200,
      body: [
        {
          id: "22222222-2222-2222-2222-222222222222",
          name: "Keshav Heights",
          address: null,
          city: "Pune",
          pincode: "411001",
          chairpersonName: "Rekha Iyer",
          chairpersonEmail: "rekha@example.com",
          chairpersonPhone: "9000000000",
          timezone: "Asia/Kolkata",
          createdAt: new Date().toISOString(),
        },
      ],
    }).as("societies");
  });

  it("lists societies and opens a society detail with Add to society team", () => {
    cy.visit("/societies");
    cy.wait("@societies");
    cy.contains("h1", "Societies").should("be.visible");
    cy.contains("Keshav Heights").click();

    cy.url().should("include", "/societies/22222222-2222-2222-2222-222222222222");
    cy.get('[data-testid="add-team-form"]').should("be.visible");
  });

  it("only shows Societies and Account in the sidebar, with a link to open the Client App", () => {
    cy.visit("/societies");
    cy.wait("@societies");

    cy.get('nav a[href="/societies"]').should("be.visible");
    cy.contains("a", "Open Client App")
      .should("have.attr", "href")
      .and("include", "app.localhost:5173");
  });

  it("redirects unknown routes to /societies", () => {
    cy.visit("/dashboard");
    cy.url().should("include", "/societies");
  });
});
