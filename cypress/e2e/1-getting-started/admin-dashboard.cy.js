// cypress/e2e/admin-dashboard.cy.js
/// <reference types="cypress" />

Cypress.on("uncaught:exception", () => false);

describe("Admin Dashboard – Events Overview", () => {
  const PATH = "/admin/dashboard";

  // ============================================================
  //  MOCK DATA
  // ============================================================

  // KPI รวม (บนสุดของหน้า)
  const mockKPI = {
    activeEvents: 5,
    ticketsSold: 1200,
    totalRegistrations: 3500,
  };

  // Summary รวม (ตอนยังไม่เลือก event)
  const mockSummaryAll = {
    totalSignups: 2500,
    dropOffs: 200,
    showRate: 88,
    checkIn: 2100,
  };

  // Summary ของ eventId = 1
  const mockSummaryEvent1 = {
    totalSignups: 300,
    dropOffs: 20,
    showRate: 90,
    checkIn: 270,
  };

  // ตาราง Events
  const mockEvents = [
    {
      eventId: 1,
      title: "Pure Concert",
      category: "concert",
      capacity: 500,
      sold: 420,
    },
    {
      eventId: 2,
      title: "Biz Talk 2024",
      category: "business",
      capacity: 800,
      sold: 500,
    },
    {
      eventId: 3,
      title: "High School Show",
      category: "show",
      capacity: 300,
      sold: 290,
    },
  ];

  // ============================================================
  //  VISIT + INTERCEPT FIXED
  // ============================================================

  function visitDashboard() {
    // -------- Intercept summary (รวม KPI + summary panel) --------
    cy.intercept("GET", "**/api/dashboard/summary*", (req) => {
      const eventId = req.query?.eventId;

      // ไม่ส่ง eventId = summary รวม + KPI รวม
      if (!eventId) {
        return req.reply({
          statusCode: 200,
          body: {
            ...mockKPI,
            ...mockSummaryAll,
          },
        });
      }

      // eventId = 1 → summary event เฉพาะ
      if (Number(eventId) === 1) {
        return req.reply({ statusCode: 200, body: mockSummaryEvent1 });
      }

      // อื่น ๆ fallback → summary รวม
      return req.reply({ statusCode: 200, body: mockSummaryAll });
    }).as("summary");

    // -------- Intercept events table --------
    cy.intercept("GET", "**/api/dashboard/events", {
      statusCode: 200,
      body: mockEvents,
    }).as("events");

    // -------- Visit หน้า Dashboard --------
    cy.visit(PATH, {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", "dummy.token");
        win.localStorage.setItem(
          "user",
          JSON.stringify({ id: 1, role: "ADMIN" })
        );
      },
    });

    // รอ data table + summary รอบแรกโหลด
    cy.wait("@events");
    cy.wait("@summary");
  }

  // ============================================================
  //  TEST SUITE
  // ============================================================

  beforeEach(() => {
    visitDashboard();
  });

  // ------------------------------------------------------------
  it("DASH-001: แสดงหัวข้อ Dashboard", () => {
    cy.contains(".toolbar .title", "Dashboard").should("be.visible");
  });

  // ------------------------------------------------------------
  it("DASH-002: แสดง KPI ทั้ง 3 ตัวถูกต้อง", () => {
    cy.contains("Active Events").should("exist");
    cy.contains(mockKPI.activeEvents).should("exist");

    cy.contains("Tickets Sold").should("exist");
    cy.contains(mockKPI.ticketsSold.toLocaleString()).should("exist");

    cy.contains("Total Registration").should("exist");
    cy.contains(mockKPI.totalRegistrations.toLocaleString()).should("exist");
  });

  // ------------------------------------------------------------
  it("DASH-003: แสดงตาราง Event ถูกต้อง", () => {
    cy.contains(".thead div", "Event").should("exist");
    cy.contains(".thead div", "Capacity").should("exist");
    cy.contains(".thead div", "Sold").should("exist");

    mockEvents.forEach((ev) => {
      cy.contains(".trow", ev.title).should("exist");
      cy.contains(".trow", ev.capacity.toLocaleString()).should("exist");
      cy.contains(".trow", ev.sold.toLocaleString()).should("exist");
    });
  });

  // ------------------------------------------------------------
  it("DASH-004: click event แล้ว summary panel ต้องเปลี่ยนเป็นข้อมูล event นั้น", () => {
    cy.contains(".trow", "Pure Concert").click();

    cy.wait("@summary"); // summary per eventId=1

    cy.contains(".summary-value", mockSummaryEvent1.totalSignups.toLocaleString()).should("exist");
    cy.contains(".summary-value", mockSummaryEvent1.dropOffs.toLocaleString()).should("exist");
    cy.contains(".summary-value", mockSummaryEvent1.showRate + "%").should("exist");
    cy.contains(".summary-value", mockSummaryEvent1.checkIn.toLocaleString()).should("exist");
  });

  // ------------------------------------------------------------
  it("DASH-005: search event ผ่าน search-box ได้ถูกต้อง", () => {
    cy.get(".search-box input").type("Talk");

    cy.contains(".trow", "Biz Talk 2024").should("exist");
    cy.contains(".trow", "Pure Concert").should("not.exist");
  });

  // ------------------------------------------------------------
  it("DASH-006: filter category แบบ dropdown ทำงานถูกต้อง", () => {
    cy.get(".filter-btn").click();
    cy.contains(".filter-item", "concert").click();

    cy.contains(".trow", "Pure Concert").should("exist");
    cy.contains(".trow", "Biz Talk 2024").should("not.exist");
  });

  // ------------------------------------------------------------
  it("DASH-007: เลือก All เพื่อล้าง filter แล้วต้องโชว์ทุก event กลับมา", () => {
    // set filter
    cy.get(".filter-btn").click();
    cy.contains(".filter-item", "concert").click();

    // reset filter
    cy.get(".filter-btn").click();
    cy.contains(".filter-item", "All").click();

    cy.contains(".trow", "Pure Concert").should("exist");
    cy.contains(".trow", "Biz Talk 2024").should("exist");
    cy.contains(".trow", "High School Show").should("exist");
  });
});
