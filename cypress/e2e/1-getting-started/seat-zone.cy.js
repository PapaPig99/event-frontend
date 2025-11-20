/// <reference types="cypress" />

Cypress.on('uncaught:exception', () => false)

describe('E2E – Seat Zone Page Flow (No Project Modification)', () => {
  const EVENT_ID = 1
  const SEAT_URL = `/event/${EVENT_ID}/seat-zone`

  /* ============================================
     1) FORCE FRONTEND ให้คิดว่า user ล็อกอินเสมอ
  ============================================ */
  const stubFrontendAuth = () => {
    cy.window().then(win => {
      // mock isAuthed() = true
      win.isAuthed = () => true

      // mock currentUser() = USER
      win.currentUser = () => ({ id: 1, role: 'USER' })
    })
  }

  /* ============================================
     2) STUB backend APIs
  ============================================ */
  const stubBackend = () => {

    // Auth APIs
    cy.intercept('GET', '**/api/**/me*',    { statusCode: 200, body: { id: 1, role: 'USER' }})
    cy.intercept('GET', '**/api/users/me*', { statusCode: 200, body: { id: 1, role: 'USER' }})

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

    // Booking
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
     3) GO TO SEAT-ZONE PAGE
  ============================================ */
  const goToSeatZone = () => {
    stubBackend()

    cy.visit(SEAT_URL, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'mock.jwt')
      }
    })

    cy.wait(300)

    // override auth functions
    stubFrontendAuth()

    // ✔ รอเฉพาะ API ที่ถูกยิงจริง
    cy.wait('@event')
    cy.wait('@avail')
  }

  beforeEach(goToSeatZone)

  /* ============================================
     4) TEST: Full seat selection
  ============================================ */
  it('SEAT-001: User selects seat and goes to payment', () => {

    // HERO LOADED
    cy.get('.event-title').should('contain.text', 'Pure Concert 2025')

    // SELECT SESSION (มีแค่ 1 ตัว)
    cy.get('select#show').select(0)

    // SELECT ZONE: VIP Zone
    cy.contains('.zone-title', 'VIP Zone')
      .parents('.zone-item')
      .within(() => {
        cy.contains('+').click()
        cy.contains('+').click()
      })

    cy.contains('จำนวน 2 ที่นั่ง')

    // NEXT STEP → PAYMENT
    cy.contains('button', 'ไปหน้าชำระเงิน').click()

    cy.wait('@reserve')

    // Validate payment page
    cy.location('pathname').should('include', `/event/${EVENT_ID}/payment`)
  })
})
