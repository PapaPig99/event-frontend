/// <reference types="cypress" />

Cypress.on('uncaught:exception', () => false)

describe('Seat Zone Page – Step 2', () => {
  const EVENT_ID = 1
  const SEAT_URL = `/event/${EVENT_ID}/seat-zone`
  const VALID_PATH = new RegExp(`/event/${EVENT_ID}/(seat-zone|plan)$`)

  /* =====  Auth Stub ===== */
  const stubAuth = () => {
    cy.intercept('GET', '**/api/**/me*',      { statusCode: 200, body: { id: 1, role: 'USER' } })
    cy.intercept('GET', '**/api/auth/**',     { statusCode: 200, body: { id: 1, role: 'USER' } })
    cy.intercept('GET', '**/api/users/me*',   { statusCode: 200, body: { id: 1, role: 'USER' } })
    cy.intercept('GET', '**/api/**/session*', { statusCode: 200, body: { id: 1, role: 'USER' } })
    cy.intercept('GET', '**/api/**/profile*', { statusCode: 200, body: { id: 1, role: 'USER' } })
  }

  /* =====  Stub Event Data ===== */
  const stubEvent = () => {
    cy.intercept('GET', `**/api/events/${EVENT_ID}`, {
      statusCode: 200,
      body: {
        id: EVENT_ID,
        title: 'Pure Concert 2025',
        posterImageUrl: '/poster-demo.jpg',
        startDate: '2025-12-20',
        sessions: [
          { id: 10, start_time: '19:00', price: 1500 },
          { id: 11, start_time: '21:00', price: 1200 },
        ],
        zones: [
          { id: 1, name: 'VIP Zone', price: 1500, capacity: 50 },
          { id: 2, name: 'Regular Zone', price: 800, capacity: 200 }
        ]
      }
    }).as('event')

    cy.intercept('GET', `**/api/events/${EVENT_ID}/view`, {
      statusCode: 200,
      body: {
        id: EVENT_ID,
        startDate: '2025-12-20',
        sessions: [
          { id: 10, start_time: '19:00' },
          { id: 11, start_time: '21:00' },
        ]
      }
    }).as('view')

    cy.intercept('GET', '**/api/zones/session/**/availability', {
      statusCode: 200,
      body: [
        { zoneId: 1, zoneName: 'VIP Zone', available: 47, capacity: 50 },
        { zoneId: 2, zoneName: 'Regular Zone', available: 200, capacity: 200 }
      ]
    }).as('avail')
  }

  /* ===== Visit Seat-Zone ===== */
  const goToSeatZone = () => {
    cy.clock()
    stubAuth()
    stubEvent()

    cy.visit(SEAT_URL, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'mock.jwt')
      }
    })

    // Allow dynamic import load
    cy.wait(200)

    // validate path
    cy.location('pathname', { timeout: 8000 }).should(p => {
      expect(VALID_PATH.test(p), `Expected seat-zone or plan, got ${p}`).to.be.true
    })

    // wait all 3 APIs
    cy.wait('@event')
    cy.wait('@view')
    cy.wait('@avail')
  }

  beforeEach(goToSeatZone)

  /* ===================== TC ========================= */

  it('SEAT-001: โหลดหน้า seat-zone สำเร็จ + step 2', () => {
    cy.get('.event-title').should('contain.text', 'Pure Concert 2025')
    cy.get('.poster').should('be.visible')
    cy.get('.step.active .ball').should('contain.text', '2')
  })

  it('SEAT-002: เปิด/ปิดโมดัล "ที่นั่งว่าง"', () => {
    cy.contains('button.status-chip', 'ที่นั่งว่าง').click({ force: true })

    cy.get('.avail-card').should('be.visible')
    cy.contains('.avail-head .title', 'โซนที่นั่ง').should('exist')
    cy.contains('.avail-table .col.zone', 'VIP Zone').should('exist')

    cy.get('.avail-card .close').click({ force: true })
    cy.get('.avail-card').should('not.exist')
  })

  it('SEAT-003: ปุ่มย้อนกลับ → กลับไปหน้า event หรือ plan', () => {
    cy.get('button.btn-back').click()

    cy.location('pathname', { timeout: 8000 }).should(p => {
      const ok =
        p === `/event/${EVENT_ID}` ||
        p === `/event/${EVENT_ID}/plan`
      expect(ok, `unexpected redirect to ${p}`).to.be.true
    })
  })
})
