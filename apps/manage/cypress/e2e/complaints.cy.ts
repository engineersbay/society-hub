describe("Manage complaints list", () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.intercept("GET", "**/v1/complaints*", {
      statusCode: 200,
      body: {
        items: [
          {
            id: "c1",
            ticketNumber: "TCK-0001",
            title: "Leaking pipe",
            type: "plumbing",
            typeOtherText: null,
            description: "Water leaking near meter room",
            status: "open",
            flatId: "f1",
            flatNumber: "A-101",
            residentName: "Asha Rao",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachments: [],
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      },
    }).as("complaints");
  });

  it("renders the complaints table with search", () => {
    cy.visit("/complaints");
    cy.wait("@complaints");

    cy.contains("h1", "Complaints").should("be.visible");
    cy.get('[data-testid="complaints-table"]').should("contain", "TCK-0001");
    cy.get('[data-testid="complaints-table"]').should("contain", "Leaking pipe");

    cy.get('[data-testid="complaints-search"]').type("nonexistent");
    cy.contains("No complaints match").should("be.visible");
  });
});
