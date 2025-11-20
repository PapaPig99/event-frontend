/// <reference types="cypress" />

Cypress.on("uncaught:exception", () => false);

describe("Admin Event Detail Page", () => {
  const EVENT_ID = 1;
  const VISIT_PATH = `/admin/events/${EVENT_ID}/detail`;

  const baseEvent = {
    id: EVENT_ID,
    title: "Pure Concert 2025",
    category: "concert",
    posterImageUrl: "/poster-demo.jpg",
    seatmapImageUrl: "/seatmap-demo.jpg",
    location: "Impact Arena, Hall 9",
    description: "<b>คอนเสิร์ตสุดยิ่งใหญ่แห่งปี</b>",
    startDate: "2025-12-20",
    endDate: "2025-12-21",
    saleStartAt: "2025-11-01T10:00",
    saleEndAt: "2025-12-25T22:00",
    saleUntilSoldout: false,
    doorOpenTime: "18:00",
    saleStatus: "OPEN",
    prices: [{ price: 1500 }, { price: 900 }],
    sessions: [
      { id: 10, name: "รอบแรก", startTime: "19:00" },
      { id: 11, name: "รอบสอง", startTime: "20:00" },
    ],
  };

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
  });

  // ---------------------------------------------------
  // EVT-001
  // ---------------------------------------------------
  it("EVT-001 โหลดข้อมูลอีเวนต์และแสดงรายละเอียดครบถ้วน", () => {
    cy.intercept("GET", `**/api/events/${EVENT_ID}/view`, baseEvent).as(
      "getEvent"
    );

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });
    cy.wait("@getEvent");

    cy.get(".event-name").should("contain", baseEvent.title);
    cy.get(".category").should("contain", baseEvent.category);

    // ticket status
    cy.get(".status-pill.open").should("contain", "เปิดให้ซื้อตั๋วแล้ว");
  });

  // ---------------------------------------------------
  // EVT-002
  // ---------------------------------------------------
  it("EVT-002 เปิดดูโซนคงเหลือของรอบงานได้ (zone availability)", () => {
    cy.intercept("GET", `**/api/events/${EVENT_ID}/view`, baseEvent).as(
      "getEvent"
    );

    cy.intercept("GET", "**/api/zones/session/10/availability", {
      body: [
        { zoneId: 1, zoneName: "Zone A", capacity: 100, available: 5 },
        { zoneId: 2, zoneName: "Zone B", capacity: 80, available: 0 },
      ],
    }).as("getZones");

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });
    cy.wait("@getEvent");

    cy.contains(".time-btn", "19").click({ force: true });

    cy.wait("@getZones");

    cy.get(".inline-panel .zone-table").should("be.visible");
    cy.contains(".z-name", "Zone A").should("exist");
    cy.contains(".z-qty.low", "5").should("be.visible");
  });

  // ---------------------------------------------------
  // EVT-003 (ลบทิ้ง เพราะหน้าไม่มี attendee panel)
  // ---------------------------------------------------

  // ---------------------------------------------------
  // EVT-004
  // ---------------------------------------------------
  it("EVT-004 โหลดข้อมูลโซนล้มเหลว แสดง error message", () => {
    cy.intercept("GET", `**/api/events/${EVENT_ID}/view`, baseEvent).as(
      "getEvent"
    );

    cy.intercept("GET", "**/api/zones/session/10/availability", {
      statusCode: 500,
    }).as("zonesFail");

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });
    cy.wait("@getEvent");

    cy.contains(".time-btn", "19").click({ force: true });
    cy.wait("@zonesFail");

    // ข้อความ error อยู่ใน panel-head small
    cy.get(".inline-panel .panel-head small")
      .invoke("text")
      .should((txt) => {
        expect(txt.trim().length).to.be.greaterThan(0);
      });
  });

  // ---------------------------------------------------
  // EVT-005
  // ---------------------------------------------------
  it("EVT-005 รายละเอียดท้ายหน้าแสดง HTML ได้ถูกต้อง", () => {
    cy.intercept("GET", `**/api/events/${EVENT_ID}/view`, {
      ...baseEvent,
      description: "<b>รายละเอียดงาน</b> เพิ่มเติม",
    }).as("getEvent");

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });
    cy.wait("@getEvent");

    cy.get(".detail-body").should("contain.html", "<b>");
  });
});
