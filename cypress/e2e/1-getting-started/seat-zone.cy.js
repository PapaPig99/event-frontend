/// <reference types="cypress" />

Cypress.on('uncaught:exception', () => false)

describe('E2E – Seat Zone Page Flow (CI Safe Version)', () => {
  const EVENT_ID = 1
  const SEAT_URL = `/event/${EVENT_ID}/seat-zone`

  /* ============================================
     FORCE FRONTEND AUTH ก่อน FE mount จริง
  ============================================ */
  const forceAuthEarly = (win) => {
    win.localStorage.setItem('token', 'mock.jwt')
    win.isAuthed = () => true
    win.currentUser = () => ({ id: 1, role: 'USER' })
  }

  /* ============================================
     STUB BACKEND APIs
  ============================================ */
  const stubBackend = () => {

    cy.intercept('GET', '**/api/**/me*', {
      statusCode: 200,
      body: { id: 1, role: 'USER' }
    })

    cy.intercept('GET', '**/api/users/me*', {
      statusCode: 200,
      body: { id: 1, role: 'USER' }
    })

    // Event
    cy.intercept('GET', `**/api/events/${EVENT_ID}`, {
      statusCode: 200,
      body: {
        id: EVENT_ID,
        title: 'Pure Concert 2025',
        posterImageUrl: '/poster.jpg',
        startDate: '2025-12-20',
        sessions: [
          { id: 10, start_time: '19:00', price: 1500 }
        ],
        zones: [
          { id: 1, name: 'VIP Zone', price: 1500, capacity: 50 }
        ]
      }
    }).as('event')

    // Availability
    cy.intercept('GET', '**/api/zones/session/**/availability', {
      statusCode: 200,
      body: [
        { zoneId: 1, zoneName: 'VIP Zone', available: 47, capacity: 50 }
      ]
    }).as('avail')

    // Reservation (Draft)
    cy.intercept('POST', '**/api/registrations*', {
      statusCode: 201,
      body: {
        registrationId: 999,
        eventId: EVENT_ID,
        sessionId: 10,
        zoneId: 1,
        quantity: 2,
        totalPrice: 3000
      }
    }).as('reserve')
  }

  /* ============================================
     VISIT + STUB
  ============================================ */
  const goToSeatZone = () => {

    stubBackend()

    cy.visit(SEAT_URL, {
      onBeforeLoad(win) {
        forceAuthEarly(win)   // 👈 บังคับ FE ว่า "ล็อกอินแล้ว" ตั้งแต่ก่อน mount
      }
    })

    cy.wait('@event')
    cy.wait('@avail')
  }

  beforeEach(goToSeatZone)

  /* ============================================
     TEST
  ============================================ */
  it('SEAT-001: ผู้ใช้เลือกที่นั่งและไปหน้าชำระเงิน', () => {

    // HERO LOADED
    cy.get('.event-title').should('contain.text', 'Pure Concert 2025')

    // SELECT SESSION
    cy.get('select#show').select(0)

    // SELECT ZONE
    cy.contains('.zone-title', 'VIP Zone')
      .parents('.zone-item')
      .within(() => {
        cy.contains('+').click()
        cy.contains('+').click()
      })

    cy.contains('จำนวน 2 ที่นั่ง')

    // CLICK NEXT
    cy.contains('button', 'ไปหน้าชำระเงิน').click()

    cy.wait('@reserve')

    // ASSERT PAYMENT PAGE
    cy.location('pathname', { timeout: 8000 })
      .should('include', `/event/${EVENT_ID}/payment`)
  })
})
