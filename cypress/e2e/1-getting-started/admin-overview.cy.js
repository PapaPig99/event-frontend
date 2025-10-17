// cypress/e2e/admin-overview.cy.js
/// <reference types="cypress" />

/**
 * ทดสอบหน้า Admin › Overview
 * - mock /api/dashboard/summary
 * - ตรวจ KPI (Active Events, Tickets Sold)
 * - ตรวจการ์ด Sales Progress แสดง 3 รายการแรกเท่านั้น
 * - ตรวจ layout: surface มี max-width 780px และชิดซ้าย (margin: 0)
 */

Cypress.on('uncaught:exception', () => false)

const RX_SUMMARY = /\/api\/dashboard\/summary(\?.*)?$/;

const mockSummary = {
  activeEvents: 5,
  ticketsSold: 1234,
  salesProgress: [
    { title: 'Alpha Expo',   category: 'business',  capacity: 2000, sold:  980 },
    { title: 'Beta Concert', category: 'concert',   capacity: 5000, sold: 3200 },
    { title: 'Gamma Talk',   category: 'education', capacity:  800, sold:  650 },
    { title: 'Delta Show',   category: 'show',      capacity: 1500, sold: 1200 }, // รายการที่ 4 (ต้องไม่แสดง)
  ],
};

function goOverview() {
  // mock auth เบา ๆ กันกรณีมี guard
  cy.intercept('GET', '**/api/me', { statusCode: 200, body: { id: 99, role: 'ADMIN' } }).as('getMe');

  // ดักสรุปแดชบอร์ด
  cy.intercept('GET', RX_SUMMARY, { statusCode: 200, body: mockSummary }).as('getSummary');

  // เข้า /admin (หรือ /admin/overview ถ้าโปรเจ็กต์คุณแยก route)
  cy.visit('/admin', {
    failOnStatusCode: false,
    onBeforeLoad(win) {
      win.localStorage.setItem('user', JSON.stringify({ id: 99, role: 'ADMIN', name: 'Admin' }));
      win.localStorage.setItem('token', 'dummy.jwt.token');
    },
  });

  // ถ้าระบบเด้งไป /admin/overview ให้ยอมรับทั้งสองแบบ
  cy.location('pathname', { timeout: 10000 }).should((p) => {
    expect(p).to.match(/\/admin(\/overview)?$/);
  });

  cy.wait('@getSummary', { timeout: 10000 });
}

describe('OVW – Admin Overview', () => {
  beforeEach(goOverview);

  it('OVW-001: โหลดหน้า Overview สำเร็จและแสดงหัวเรื่อง', () => {
    // หัวเรื่อง “Overview” (จาก <h2 class="title">Overview</h2>)
    cy.contains('.toolbar .title, h1, h2', /^Overview$/).should('be.visible');
  });

  it('OVW-002: แสดง KPI จากสรุปแดชบอร์ด (Active Events, Tickets Sold)', () => {
    // ตัวเลขอาจไปซ้ำในตารางได้ จึงโฟกัสที่บล็อก KPI ที่อยู่บนสุดของ surface
    // อย่างน้อยต้องมีตัวเลขรวมปรากฏบนหน้า
    cy.contains(String(mockSummary.activeEvents)).should('exist');
    cy.contains(mockSummary.ticketsSold.toLocaleString()).should('exist');

    // และมี label ครบ
    cy.contains(/Active\s*Events/i).should('exist');
    cy.contains(/Tickets\s*Sold/i).should('exist');
  });

  it('OVW-003: การ์ด Sales Progress แสดงเฉพาะ 3 รายการแรก', () => {
    // หัวการ์ด
    cy.contains(/Sales\s*Progress/i).should('be.visible');

    // ต้องเห็น 3 รายการแรก
    cy.contains('Alpha Expo').should('exist');
    cy.contains('Beta Concert').should('exist');
    cy.contains('Gamma Talk').should('exist');

    // และ "Delta Show" (ลำดับ 4) ต้องไม่ถูกเรนเดอร์
    cy.contains('Delta Show').should('not.exist');

    // มีหัวคอลัมน์ Event / Capacity / Sold
    cy.contains(/^Event$/).should('exist');
    cy.contains(/^Capacity$/).should('exist');
    cy.contains(/^Sold$/).should('exist');

    // มีตัวเลขความจุ/ขายของรายการแรก ๆ ปรากฏ
    cy.contains('2,000').should('exist'); // capacity Alpha Expo
    cy.contains('980').should('exist');   // sold Alpha Expo
  });

  it('OVW-004: พื้นผิวสรุปชิดซ้ายและไม่กินเต็มหน้าจอ (max-width 780px + margin 0)', () => {
    // surface ถูกเรนเดอร์เป็น <div> ที่มี inline style max-width: 780px; margin: 0;
    cy.get('[style*="max-width: 780px"][style*="margin: 0"]').should('exist');

    // ตรวจจริง ๆ ว่ามีคุณสมบัติ 2 อย่างพร้อมกัน
    cy.get('[style*="max-width: 780px"][style*="margin: 0"]').first().then($el => {
      const style = getComputedStyle($el[0]);
      // max-width: 780px
      expect(style.maxWidth.replace(/\s/g, '')).to.eq('780px');
      // margin-left/right = 0px
      expect(style.marginLeft).to.eq('0px');
      expect(style.marginRight).to.eq('0px');
    });
  });
});
