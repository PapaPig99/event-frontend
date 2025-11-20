// cypress/e2e/1-getting-started/plan.cy.js
/// <reference types="cypress" />

// ปิด error dynamic import (Vue lazy-load)
Cypress.on("uncaught:exception", (err) => {
  if (err.message.includes("Failed to fetch dynamically imported module")) {
    return false;
  }
  return false;
});

const EVENT_ID = 101;
const PLAN_PATH = `/event/${EVENT_ID}/plan`;

// Mock event detail
const fxEventDetail = {
  id: EVENT_ID,
  title: "MARIAH CAREY The Celebration of Mimi",
  posterImageUrl: "/images/mariah.jpg",
  seatmapImageUrl: "/images/seatmap-mariah.png",
  status: "OPEN",
  sessions: [
    {
      id: 1001,
      name: "Sat 11 Oct 2025 20:00",
      startAt: "2025-10-11T20:00",
      startTime: "20:00",
    },
  ],
};

// Mock avail
const fxAvail = [
  { zoneName: "A1", available: 120 },
  { zoneName: "B1", available: 0 },
];

describe("PLAN - ดูผังและเลือกประเภทที่นั่ง", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/events/*", {
      statusCode: 200,
      body: fxEventDetail,
    }).as("getEventDetail");
  });

  it("PLAN-001: โหลดหน้าผังที่นั่งและแสดงข้อมูลครบถ้วน", () => {
    cy.visit(PLAN_PATH);
    cy.wait("@getEventDetail");

    cy.get(".plan-page").should("exist");

    cy.get(".hero-card .poster")
      .should("have.attr", "src")
      .and("include", fxEventDetail.posterImageUrl);

    cy.contains(".event-title", fxEventDetail.title).should("exist");

    cy.get("select#show")
      .should("exist")
      .find("option")
      .should("have.length.at.least", 1);

    cy.get(".seatmap-img")
      .should("have.attr", "src")
      .and("include", fxEventDetail.seatmapImageUrl);
  });

  it("PLAN-002: เปิดดูที่นั่งว่างและแสดงข้อมูลโซนในโมดัล", () => {
    cy.intercept("GET", "**/api/zones/session/*/availability", {
      statusCode: 200,
      body: fxAvail,
    }).as("getAvail");

    cy.visit(PLAN_PATH);
    cy.wait("@getEventDetail");

    cy.contains("button", "ที่นั่งว่าง").click();
    cy.wait("@getAvail");

    cy.contains(".zone", "A1").should("exist");
    cy.contains(".zone", "B1").should("exist");

    cy.get(".avail-card .close").click();
    cy.get(".avail-card").should("not.exist");
  });

  it("PLAN-003: โหลดข้อมูลที่นั่งว่างล้มเหลวและแสดงข้อความผิดพลาด", () => {
    cy.intercept("GET", "**/api/zones/session/*/availability", {
      statusCode: 500,
    }).as("getAvailErr");

    cy.visit(PLAN_PATH);
    cy.wait("@getEventDetail");

    cy.contains("button", "ที่นั่งว่าง").click();
    cy.wait("@getAvailErr");

    cy.contains("โหลดไม่สำเร็จ").should("exist");
  });

  it("PLAN-004: กดปุ่มถัดไปและนำทางไปหน้า seat-zone", () => {
    cy.visit(PLAN_PATH);
    cy.wait("@getEventDetail");

    cy.contains("button", "ถัดไป").click();

    cy.location("pathname").should(
      "include",
      `/event/${EVENT_ID}/seat-zone`
    );

    // ⬇⬇ เปลี่ยนจาก mock-seat-zone → element จริงของ seat-zone
    cy.get(".event-title").should("exist");
  });

  it("PLAN-005: อีเวนต์ไม่มีผังที่นั่งและนำทางไป seat-zone ทันที", () => {
    const fxNoSeatmap = { ...fxEventDetail, seatmapImageUrl: "" };

    cy.intercept("GET", "**/api/events/*", {
      statusCode: 200,
      body: fxNoSeatmap,
    }).as("getNoSeat");

    cy.visit(PLAN_PATH);
    cy.wait("@getNoSeat");

    cy.location("pathname").should(
      "include",
      `/event/${EVENT_ID}/seat-zone`
    );

    // ⬇⬇ ใช้ element จริงของ seat-zone
    cy.get(".event-title").should("exist");
  });
});
