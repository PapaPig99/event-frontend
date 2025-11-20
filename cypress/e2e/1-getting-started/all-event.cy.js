/// <reference types="cypress" />

Cypress.on("uncaught:exception", () => false);

describe("Admin All Events Page (REAL UI MATCH)", () => {

  const VISIT_PATH = "/admin/allevents";

  const mockEvents = [
    { id: 1, title: "Pure Concert 2025", category: "concert" },
    { id: 2, title: "Biz Talk 2025", category: "business" },
    { id: 3, title: "High School Show", category: "show" },
    { id: 4, title: "Jazz Night", category: "concert" },
    { id: 5, title: "Data Science 101", category: "education" },
  ];

  const loginAsAdmin = (win) => {
    win.localStorage.setItem("token", "dummy_admin_token");
    win.localStorage.setItem(
      "user",
      JSON.stringify({
        id: 999,
        email: "admin@demo.app",
        role: "ADMIN",
        roles: ["ADMIN"],
      })
    );
  };

  beforeEach(() => {
    cy.intercept("GET", "**/api/**/me*", {
      statusCode: 200,
      body: { id: 999, email: "admin@demo.app", role: "ADMIN" },
    }).as("getMe");

    cy.intercept("GET", "**/api/events*", {
      statusCode: 200,
      body: mockEvents,
    }).as("getEvents");

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });
    cy.wait("@getEvents");

    cy.get(".event-item").should("have.length", mockEvents.length);
  });

  // ---------------------------------------------------------
  it("AE-001: โหลดรายการทั้งหมดถูกต้อง", () => {
    mockEvents.forEach((ev) => {
      cy.contains(".event-item", ev.title).should("exist");
    });
  });

  // ---------------------------------------------------------
  it("AE-002: ค้นหาตามชื่อ event", () => {
    cy.get(".input").clear().type("Jazz");

    cy.contains(".event-item", "Jazz Night").should("exist");
    cy.contains(".event-item", "Pure Concert 2025").should("not.exist");
  });

  // ---------------------------------------------------------
  it("AE-003: กรองด้วยหมวดหมู่ เช่น concert", () => {
    cy.contains(".chip", "Concert").click();

    cy.contains(".event-item", "Pure Concert 2025").should("exist");
    cy.contains(".event-item", "Jazz Night").should("exist");

    cy.contains(".event-item", "Biz Talk 2025").should("not.exist");
    cy.contains(".event-item", "Data Science 101").should("not.exist");
  });

  // ---------------------------------------------------------
  it("AE-004: ล้างตัวกรอง", () => {
    cy.get(".input").type("Data");
    cy.get(".clear-btn").click();

    // ต้องกลับมาเห็นครบ 5
    cy.get(".event-item").should("have.length", mockEvents.length);
  });

  // ---------------------------------------------------------
  it("AE-005: View — ต้องไปหน้า detail", () => {
    cy.contains(".event-item", "Pure Concert 2025").click();

    cy.contains(".actions button", "View").click({ force: true });
    cy.location("pathname").should("match", /\/admin\/events\/1\/detail$/);
  });

  // ---------------------------------------------------------
  it("AE-006: Edit — ต้องไปหน้า edit", () => {
    cy.contains(".event-item", "Biz Talk 2025").click();

    cy.contains(".actions button", "Edit").click({ force: true });
    cy.location("pathname").should("match", /\/admin\/events\/2\/edit$/);
  });

  // ---------------------------------------------------------
  it("AE-007: Delete — เรียก DELETE และ item หายจาก list", () => {
    cy.window().then((win) => {
      cy.stub(win, "confirm").returns(true);
      cy.stub(win, "alert").as("alert");
    });

    const targetId = 3; // High School Show

    cy.intercept("DELETE", `**/api/events/${targetId}`, {
      statusCode: 200,
    }).as("deleteEvent");

    cy.contains(".event-item", "High School Show").click();

    cy.contains(".actions button", "Delete").click({ force: true });

    cy.wait("@deleteEvent");

    cy.get("@alert").should("have.been.called");

    cy.contains(".event-item", "High School Show").should("not.exist");
  });

});
