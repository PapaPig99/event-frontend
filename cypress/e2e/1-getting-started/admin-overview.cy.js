/// <reference types="cypress" />
Cypress.on('uncaught:exception', () => false);

describe('Admin - Overview Dashboard', () => {
  beforeEach(() => {
    cy.seedAdminAuth();

    cy.intercept('GET', '**/api/dashboard/summary', {
      statusCode: 200,
      body: {
        activeEvents: 2,
        ticketsSold: 0,
        salesProgress: [
          { id: 1, title: 'MARIAH CAREY The Celebration of Mimi', category: 'Concert', capacity: 2900, sold: 0 },
          { id: 2, title: 'ONE LUMPINEE', category: 'Sport', capacity: 1400, sold: 0 }
        ]
      }
    }).as('getOverview');

    cy.visit('/admin/overview');
    cy.wait('@getOverview');
  });

  it('OV-001: แสดงจำนวน Active Events และ Tickets Sold ได้ถูกต้อง', () => {
    cy.get('[data-testid="card-active-events"]').should('contain.text', '2');
    cy.get('[data-testid="card-tickets-sold"]').should('contain.text', '0');
  });

  it('OV-002: ตาราง Sales Progress แสดงข้อมูลครบถ้วนและรูปแบบถูกต้อง', () => {
    cy.get('[data-testid="sales-progress-table"]').within(() => {
      cy.get('tbody tr').should('have.length', 2);

      cy.get('tbody tr').eq(0).within(() => {
        cy.get('td').eq(0).should('contain.text', 'MARIAH CAREY');
        cy.get('td').eq(1).invoke('text').should('match', /\d+/);
        cy.get('td').eq(2).invoke('text').should('match', /\d+/);
      });
    });
  });

  it('OV-003: เมื่อคลิกเมนู Events ระบบนำไปยังหน้ารายการอีเวนต์', () => {
    cy.get('[data-testid="sidebar-events"]').click();
    cy.url().should('include', '/admin/events');
  });

  it('OV-004: แสดงชื่อผู้ใช้ "Administrator" บนแถบด้านบน (Topbar)', () => {
    cy.get('[data-testid="topbar-username"]').should('contain.text', 'Administrator');
  });

  it('OV-005: เมื่อกดปุ่ม Logout ระบบนำผู้ใช้กลับไปยังหน้าเข้าสู่ระบบ', () => {
    cy.get('[data-testid="topbar-logout"]').click();
    cy.url().should('include', '/admin/login');
  });

  it('OV-006: การแสดงผลแบบ Responsive – การ์ดสรุปสามารถมองเห็นได้ในหน้าจอมือถือ', () => {
    cy.viewport(390, 844); // iPhone 12 ขนาดโดยประมาณ
    cy.get('[data-testid="card-active-events"]').should('be.visible');
    cy.get('[data-testid="card-tickets-sold"]').should('be.visible');
  });

  it('OV-007: เมื่อคลิกแถวในตาราง Sales Progress ระบบนำไปยังหน้าแก้ไขอีเวนต์', () => {
    cy.get('[data-testid="sales-progress-table"] tbody tr')
      .first()
      .click();
    cy.url().should('match', /\/admin\/events\/\d+\/edit$/);
  });
});
