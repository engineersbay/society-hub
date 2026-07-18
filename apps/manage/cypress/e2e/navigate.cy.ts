describe("Manage sidebar navigation", () => {
  beforeEach(() => {
    // Any list endpoint we haven't explicitly mocked should degrade gracefully to empty.
    // Registered first so more specific intercepts below (and inside loginAsAdmin) take
    // priority — Cypress resolves overlapping intercepts last-registered-first.
    cy.intercept("GET", "**/v1/**", { statusCode: 200, body: [] });
    cy.loginAsAdmin();
    cy.intercept("GET", "**/v1/complaints*", {
      statusCode: 200,
      body: { items: [], page: 1, limit: 5, total: 0 },
    });
    cy.intercept("GET", "**/v1/bills*", {
      statusCode: 200,
      body: { items: [], page: 1, limit: 20, total: 0 },
    });
    cy.intercept("GET", "**/v1/payments*", {
      statusCode: 200,
      body: { items: [], page: 1, limit: 20, total: 0 },
    });
    cy.intercept("GET", "**/v1/dashboard/stats", {
      statusCode: 200,
      body: {
        openComplaints: 2,
        totalComplaints: 10,
        duesOutstandingPaise: 150000,
        upcomingBookings: 1,
        publishedNotices: 3,
        unreadNotifications: 4,
      },
    });
  });

  it("loads Dashboard, Bills, Payments and Notices from the sidebar", () => {
    cy.visit("/dashboard");
    cy.contains("h1", "Welcome back").should("be.visible");

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
