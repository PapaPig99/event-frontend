// cypress/e2e/ticket-success.cy.js
/// <reference types="cypress" />

const EVENT_ID    = 1;
const SUCCESS_URL = `/event/${EVENT_ID}/success`;
const API_ME      = '**/api/me';

function visitSuccessWithReg(reg = { id: 43210, eventId: EVENT_ID }) {
  // mock auth ให้ผ่าน guard
  cy.intercept('GET', API_ME, {
    statusCode: 200,
    body: { id: 999, email: 'user@demo.app', role: 'USER' },
  }).as('getMe');

  cy.visit(SUCCESS_URL, {
    onBeforeLoad(win) {
      // ให้ guard มองว่า "ล็อกอินแล้ว"
      win.localStorage.setItem('token', 'mock.jwt.token');
      win.localStorage.setItem('user', JSON.stringify({ id: 999, name: 'Mock User' }));

      // seed history.state.reg ก่อนแอป mount
      const state = { ...(win.history.state || {}), reg };
      try {
        // ใส่ URL ปลายทางเดิมไว้ด้วย เผื่อ router ใช้ตรวจ
        win.history.replaceState(state, '', SUCCESS_URL);
      } catch {}
    },
  });

  // ถ้าแอปมี layout ดึง /api/me ให้รอ
  cy.wait('@getMe', { timeout: 10000 }).its('response.statusCode').should('eq', 200);
}

describe('ยืนยันการชำระเงินสำเร็จ (Ticket Success) – E2E', () => {
  it('TS-001: แสดงหน้าชำระเงินสำเร็จพร้อมรายละเอียดการจอง', () => {
    visitSuccessWithReg();

    // ต้องยังอยู่ที่หน้า success (ไม่ถูกเด้งไป login)
    cy.location('pathname').should('eq', SUCCESS_URL);

    cy.contains('h1', 'ชำระเงินสำเร็จ').should('be.visible');

    cy.contains('p', 'หมายเลขการจอง').within(() => {
      cy.contains('43210').should('exist');
    });

    // ตรวจลิงก์กลับรายละเอียดอีเวนต์ (รองรับ /event/1 หรือ /events/1)
    cy.get('a')
      .contains('กลับไปดูรายละเอียด')
      .should('have.attr', 'href')
      .then((href) => {
        expect(/\/events?\/1$/.test(href), `detail href: ${href}`).to.be.true;
      });

    // คลิกแล้วต้องไปหน้ารายละเอียด
    cy.contains('a', 'กลับไปดูรายละเอียด').click();
    cy.location('pathname').should('match', /\/events?\/1$/);
  });

  it('TS-002: ไม่มีข้อมูลการจองแล้วระบบนำกลับหน้าแรก', () => {
    // mock auth ให้ผ่าน guard เพื่อให้ logic ภายใน component ทำงานต่อ
    cy.intercept('GET', API_ME, { statusCode: 200, body: { id: 123 } }).as('getMe');

    cy.visit(SUCCESS_URL, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'mock.jwt.token');
        win.localStorage.setItem('user', JSON.stringify({ id: 123 }));
        // ไม่ใส่ reg ลง state
        try { win.history.replaceState({ ...(win.history.state || {}) }, '', SUCCESS_URL); } catch {}
      },
    });

    cy.wait('@getMe');
    cy.location('pathname').should('eq', '/'); // ถูก router.replace กลับหน้าแรก
  });
});
