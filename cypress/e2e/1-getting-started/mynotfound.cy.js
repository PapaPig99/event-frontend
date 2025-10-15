// cypress/e2e/notfound.cy.js
/// <reference types="cypress" />

// เส้นทางที่ไม่มีอยู่จริง เพื่อให้ router แสดงหน้า NotFound
const UNKNOWN_PATH = '/__path-that-does-not-exist__';

Cypress.on('uncaught:exception', () => false);

describe('หน้าไม่พบ (Not Found) – E2E', () => {
  beforeEach(() => {
    // กันกรณีแอปมี layout เรียก /api/me เสมอ
    cy.intercept('GET', '**/api/me', {
      statusCode: 200,
      body: { id: 1, email: 'user@example.com', role: 'GUEST' },
    }).as('getMe');
  });

  it('NF-001: ตรวจการแสดงผลหน้า 404 เมื่อลิงก์ไม่ถูกต้อง', () => {
    cy.visit(UNKNOWN_PATH, { failOnStatusCode: false }); // กัน dev server ตอบ 404 จริง
    cy.get('main').should('exist');
    cy.contains('h1', '404').should('be.visible');
    cy.contains('p', 'Page not found').should('be.visible');
    cy.contains('a', 'Go Home').should('have.attr', 'href', '/');
  });

  it('NF-002: ทดสอบการนำทางกลับหน้าหลักผ่านลิงก์ “Go Home”', () => {
    cy.visit(UNKNOWN_PATH, { failOnStatusCode: false });
    cy.contains('a', 'Go Home').click();
    cy.location('pathname').should('eq', '/');
  });

  it('NF-003: ตรวจความคงอยู่ของหน้า 404 หลังรีเฟรช', () => {
    cy.visit(UNKNOWN_PATH, { failOnStatusCode: false });
    cy.reload();
    cy.contains('h1', '404').should('be.visible');
    cy.contains('p', 'Page not found').should('be.visible');
  });

  it('NF-004: ตรวจการทำงานของหน้า 404 เมื่อมี Query String หรือ Hash', () => {
    cy.visit(`${UNKNOWN_PATH}?ref=test#section`, { failOnStatusCode: false });
    cy.contains('h1', '404').should('be.visible');
    cy.location().should((loc) => {
      expect(loc.pathname).to.eq(UNKNOWN_PATH);
      expect(loc.search).to.eq('?ref=test');
      expect(loc.hash).to.eq('#section');
    });
  });
});
