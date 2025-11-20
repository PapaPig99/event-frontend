/// <reference types="cypress" />

const EVENT_ID = 1;
const SESSION_ID = 11;

function mockAdmin(win) {
  const data = {
    token: "test-token",
    role: "ADMIN",
    user: { email: "admin@test.com" }
  };
  win.localStorage.setItem("auth", JSON.stringify(data));
  win.localStorage.setItem("token", "test-token");
}

describe("ADMIN – Registration List", () => {

  beforeEach(() => {

    // STEP 1: login + mock auth
    cy.visit("/admin/login", {
      onBeforeLoad(win) {
        mockAdmin(win);
      }
    });

    // ❗ NEW: intercept list events (sidebar ใช้โหลด)
    cy.intercept("GET", "/api/events", {
      statusCode: 200,
      body: [
        { id: EVENT_ID, title: "Mock Event 1" },
        { id: 999, title: "Mock Event 2" }
      ]
    }).as("getEventList");

    // intercept event detail
    cy.intercept("GET", `/events/${EVENT_ID}`, {
      statusCode: 200,
      body: {
        id: EVENT_ID,
        title: "Test Event",
        sessions: [
          { id: SESSION_ID, name: "Session A", startTime: "19:00" }
        ]
      }
    }).as("getEvent");

    // intercept registrations
    cy.intercept(
      "GET",
      `/registrations/event/${EVENT_ID}/session/${SESSION_ID}`,
      {
        statusCode: 200,
        body: [
          {
            id: 1,
            email: "a@a.com",
            ticketCode: "AAA-001",
            zoneName: "A1",
            price: 1500,
            paymentStatus: "PAID",
            paymentReference: "REF123",
            isCheckedIn: false,
            paidAt: "2025-01-01T10:00"
          },
          {
            id: 2,
            email: "b@b.com",
            ticketCode: "BBB-002",
            zoneName: "B2",
            price: 2000,
            paymentStatus: "UNPAID",
            paymentReference: "REF999",
            isCheckedIn: true,
            paidAt: null
          }
        ]
      }
    ).as("getRegs");

    // STEP 3: go to page
    cy.visit(`/admin/events/${EVENT_ID}/detail`);
  });

  // ------------------------------------------------------------
  it("REG-001: โหลด Sessions และ Registrations สำเร็จ", () => {
    cy.wait("@getEventList");  // ← สำคัญมาก
    cy.wait("@getEvent");
    cy.wait("@getRegs");

    cy.get("table").should("exist");
  });

  // ------------------------------------------------------------
  it("REG-002: ค้นหา ticket code", () => {
    cy.wait("@getEventList");
    cy.wait("@getEvent");
    cy.wait("@getRegs");

    cy.get("input[placeholder='เช่น MAIRA-001']").type("AAA-001");

    cy.contains("AAA-001").should("exist");
    cy.contains("BBB-002").should("not.exist");
  });

  // ------------------------------------------------------------
  it("REG-003: กรอง PAID", () => {
    cy.wait("@getEventList");
    cy.wait("@getEvent");
    cy.wait("@getRegs");

    cy.get("select").eq(2).select("PAID");

    cy.contains("PAID").should("exist");
    cy.contains("UNPAID").should("not.exist");
  });

  // ------------------------------------------------------------
  it("REG-004: กรอง UNCHECKED", () => {
    cy.wait("@getEventList");
    cy.wait("@getEvent");
    cy.wait("@getRegs");

    cy.get("select").eq(3).select("UNCHECKED");

    cy.contains("NOT CHECKED").should("exist");
    cy.contains("CHECKED").should("not.exist");
  });

});
