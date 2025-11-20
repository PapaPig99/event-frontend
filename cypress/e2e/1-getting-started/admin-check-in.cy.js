/// <reference types="cypress" />

Cypress.on("uncaught:exception", () => false);

// --------- Helper ---------
function select(label, value) {
  cy.contains("option", label)
    .parent()
    .select(value, { force: true });
}

describe("ADMIN - Check-in Page", () => {
  beforeEach(() => {
    // mock login admin
    cy.window().then((win) => {
      win.localStorage.setItem("token", "dummy_admin_token");
      win.localStorage.setItem(
        "user",
        JSON.stringify({ id: 999, email: "admin@test.com", role: "ADMIN" })
      );
    });
  });

  // --- CEI-001 ---
  it("CEI-001: โหลดหน้า Check-in และโหลดรายการอีเวนต์สำเร็จ", () => {
    cy.intercept("GET", "**/api/events", {
      statusCode: 200,
      body: [
        { id: 1, title: "Concert A" },
        { id: 2, title: "Expo B" },
      ],
    }).as("getEvents");

    cy.visit("/admin/check-in");
    cy.wait("@getEvents");

    cy.get("select").first().children().should("have.length.at.least", 2);
  });

  // --- CEI-002 ---
  it("CEI-002:เลือกอีเวนต์แล้วโหลดข้อมูลรอบการแสดง", () => {
    cy.intercept("GET", "**/api/events", {
      statusCode: 200,
      body: [{ id: 1, title: "Concert A" }],
    }).as("getEvents");

    cy.intercept("GET", "**/api/events/1/sessions", {
      statusCode: 200,
      body: [
        { id: 10, name: "รอบแรก", startTime: "19:00" },
        { id: 11, name: "รอบสอง", startTime: "20:00" },
      ],
    }).as("getSessions");

    cy.visit("/admin/check-in");
    cy.wait("@getEvents");

    // เลือก event
    cy.get("select").first().select("1", { force: true });

    cy.wait("@getSessions");

    cy.get("select").eq(1).children().should("have.length", 3); // include default option
  });

  // --- CEI-003 ---
  it("CEI-003: กรอกโค้ดถูกต้องและทำการ Check-in สำเร็จ พร้อมแสดงข้อความแจ้งเตือนแบบ Toast", () => {
    cy.intercept("GET", "**/api/events", {
      body: [{ id: 1, title: "Concert A" }],
    }).as("getEvents");

    cy.intercept("GET", "**/api/events/1/sessions", {
      body: [{ id: 10, name: "รอบแรก", startTime: "19:00" }],
    }).as("getSessions");

    cy.intercept(
      "PATCH",
      "**/api/registrations/events/1/sessions/10/checkin/ABC123",
      { statusCode: 200, body: {} }
    ).as("checkinOK");

    cy.visit("/admin/check-in");
    cy.wait("@getEvents");

    cy.get("select").first().select("1", { force: true });
    cy.wait("@getSessions");

    cy.get("select").eq(1).select("10", { force: true });

    cy.get("input[type='text']").type("ABC123");

    cy.contains("button", "Check-in").click();

    cy.wait("@checkinOK");

    cy.get(".toast-item.success")
      .should("be.visible")
      .and("contain", "Checked-in successfully");
  });

  // --- CEI-004 ---
  it("CEI-004: กรอกโค้ดไม่ถูกต้องและแสดงข้อความผิดพลาด", () => {
    cy.intercept("GET", "**/api/events", {
      body: [{ id: 1, title: "Concert A" }],
    }).as("getEvents");

    cy.intercept("GET", "**/api/events/1/sessions", {
      body: [{ id: 10, name: "รอบแรก", startTime: "19:00" }],
    }).as("getSessions");

    cy.intercept(
      "PATCH",
      "**/api/registrations/events/1/sessions/10/checkin/WRONG",
      { statusCode: 400, body: { error: "Invalid code" } }
    ).as("checkinFail");

    cy.visit("/admin/check-in");
    cy.wait("@getEvents");

    cy.get("select").first().select("1", { force: true });
    cy.wait("@getSessions");

    cy.get("select").eq(1).select("10", { force: true });

    cy.get("input[type='text']").type("WRONG");

    cy.contains("button", "Check-in").click();
    cy.wait("@checkinFail");

    cy.get(".msg.error").should("contain", "Invalid code");
  });

  // --- CEI-005 ---
  it("CEI-005: ปุ่ม Check-in ถูกปิดใช้งานเมื่อยังไม่เลือกอีเวนต์หรือรอบการแสดง", () => {
    cy.intercept("GET", "**/api/events", {
      body: [{ id: 1, title: "Concert A" }],
    }).as("getEvents");

    cy.visit("/admin/check-in");
    cy.wait("@getEvents");

    cy.get("input[type='text']").type("ABC123");

    cy.contains("button", "Check-in").should("be.disabled");
  });
});
