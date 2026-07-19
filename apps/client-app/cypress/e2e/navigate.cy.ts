describe("Resident sidebar navigation", () => {
  beforeEach(() => {
    // Any list endpoint we haven't explicitly mocked should degrade gracefully to empty.
    // Registered first so more specific intercepts below (and inside loginAsResident) take
    // priority — Cypress resolves overlapping intercepts last-registered-first.
    cy.intercept("GET", "**/v1/**", { statusCode: 200, body: [] });
    cy.loginAsResident();
    cy.intercept("GET", "**/v1/complaints*", {
      statusCode: 200,
      body: { items: [], page: 1, limit: 4, total: 0 },
    });
    cy.intercept("GET", "**/v1/dashboard/stats*", {
      statusCode: 200,
      body: {
        openComplaints: 1,
        totalComplaints: 3,
        duesOutstandingPaise: 250000,
        upcomingBookings: 0,
        publishedNotices: 2,
        unreadNotifications: 1,
      },
    });
  });

  it("loads Dashboard, Bills, Payments and Notices from the sidebar", () => {
    cy.visit("/dashboard");
    cy.contains("h1", "Hello").should("be.visible");

    cy.get('nav a[href="/bills"]').click();
    cy.url().should("include", "/bills");
    cy.contains("h1", "Bills").should("be.visible");

    cy.get('nav a[href="/payments"]').click();
    cy.url().should("include", "/payments");
    cy.contains("h1", "Payments").should("be.visible");

    cy.get('nav a[href="/notices"]').click();
    cy.url().should("include", "/notices");
    cy.contains("h1", "Notices").should("be.visible");
  });
});
