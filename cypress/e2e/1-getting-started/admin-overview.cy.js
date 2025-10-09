/// <reference types="cypress" />
Cypress.on('uncaught:exception', () => false);

describe('Admin Overview Dashboard E2E', () => {
  beforeEach(() => {
    cy.seedAdminAuth(); // 👈 ปลอมว่า login แล้ว

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

  it('OV-001: แสดงการ์ดสรุป Active Events และ Tickets Sold ถูกต้อง', () => {
    cy.get('[data-testid="card-active-events"]').should('contain.text', '2');
    cy.get('[data-testid="card-tickets-sold"]').should('contain.text', '0');
  });
  
  // ✅ OV-002 ตาราง Sales Progress
  it('OV-002: ตาราง Sales Progress แสดงข้อมูลครบและ format ถูกต้อง', () => {
    cy.get('[data-testid="sales-progress-table"]').within(() => {
      cy.get('tbody tr').should('have.length', 2)

      cy.get('tbody tr').eq(0).within(() => {
        cy.get('td').eq(0).should('contain.text', 'MARIAH CAREY')
        cy.get('td').eq(1).invoke('text').should('match', /\d+/)
        cy.get('td').eq(2).invoke('text').should('match', /\d+/)
      })
    })
  })

  // ✅ OV-003 คลิกเมนู Events
  it('OV-003: คลิกเมนู Events แล้วไปที่หน้ารายการอีเวนต์', () => {
    cy.get('[data-testid="sidebar-events"]').click()
    cy.url().should('include', '/admin/events')
  })

  // ✅ OV-004 แสดงชื่อผู้ใช้บน Topbar
  it('OV-004: ชื่อผู้ใช้บน Topbar แสดง "Administrator"', () => {
    cy.get('[data-testid="topbar-username"]').should('contain.text', 'Administrator')
  })

  // ✅ OV-005 Logout
  it('OV-005: ปุ่ม Logout ทำงานและเด้งไปหน้า Login', () => {
    cy.get('[data-testid="topbar-logout"]').click()
    cy.url().should('include', '/admin/login')
  })

  // ✅ OV-006 Responsive Test
  it('OV-006: Responsive – การ์ดสรุปมองเห็นในจอมือถือ', () => {
    cy.viewport(390, 844) // iPhone 12-ish
    cy.get('[data-testid="card-active-events"]').should('be.visible')
    cy.get('[data-testid="card-tickets-sold"]').should('be.visible')
  })

  // ✅ OV-007 คลิกแถวในตาราง Sales Progress
  it('OV-007: คลิกแถว Sales Progress แล้วเปิดหน้า Edit Event', () => {
    cy.get('[data-testid="sales-progress-table"] tbody tr')
      .first()
      .click()
    cy.url().should('match', /\/admin\/events\/\d+\/edit$/)
  })
})
