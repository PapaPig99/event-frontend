/// <reference types="cypress" />

/**
 * Test Suite: Payment Success Page (TicketSuccess.vue)
 * Description:
 *   Verifies that the payment success screen displays correctly with registration details,
 *   proper routing behavior, and navigation links.
 */

describe('Payment Success Page – End-to-End', () => {
  const EVENT_ID = 1
  const SUCCESS_URL = `/event/${EVENT_ID}/success`
  const API_ME = '**/api/me'

  // helper function: mock login + inject registration
  function visitSuccessWithReg(reg = { id: 43210, eventId: EVENT_ID }) {
    cy.intercept('GET', API_ME, {
      statusCode: 200,
      body: { id: 999, email: 'user@demo.app', role: 'USER' },
    }).as('getMe')

    cy.visit(SUCCESS_URL, {
      onBeforeLoad(win) {
        // mock logged-in user
        win.localStorage.setItem('token', 'mock.jwt.token')
        win.localStorage.setItem('user', JSON.stringify({ id: 999, name: 'Mock User' }))

        // inject registration info (for history.state)
        const state = { ...(win.history.state || {}), reg }
        try { win.history.replaceState(state, '', SUCCESS_URL) } catch {}
      },
    })

    cy.wait('@getMe', { timeout: 8000 }).its('response.statusCode').should('eq', 200)
  }

  /* -------------------------------------------------------------------------- */
  /*  TC-001: Display payment success details correctly                         */
  /* -------------------------------------------------------------------------- */
  it('TC-001: แสดงหน้าชำระเงินสำเร็จพร้อมรายละเอียดการจองถูกต้อง', () => {
    visitSuccessWithReg()

    // Should remain on success page
    cy.location('pathname').should('eq', SUCCESS_URL)

    // Check heading and thank-you message
    cy.contains('h1', 'ชำระเงินสำเร็จ!', { timeout: 10000 }).should('be.visible')
    cy.contains('p.desc', 'ขอบคุณสำหรับการจองตั๋วของคุณ').should('exist')

    // Check booking number
    cy.get('.info-box').within(() => {
      cy.contains('หมายเลขการจอง').should('exist')
      cy.get('strong').should('contain.text', '#43210')
    })

    // Check navigation links
    cy.contains('a.back-btn', 'กลับไปดูรายละเอียดงาน')
      .should('have.attr', 'href')
      .and('match', new RegExp(`/event/${EVENT_ID}$`))

    cy.contains('a.secondary-btn', 'ดูตั๋วของฉัน')
      .should('have.attr', 'href')
      .and('include', '/my-event')
  })

  /* -------------------------------------------------------------------------- */
  /*  TC-002: Redirect to home if no registration state found                   */
  /* -------------------------------------------------------------------------- */
  it('TC-002: เปลี่ยนเส้นทางกลับไปหน้าแรกเมื่อไม่พบข้อมูลการจอง', () => {
    cy.intercept('GET', API_ME, {
      statusCode: 200,
      body: { id: 123, email: 'anon@demo.app', role: 'USER' },
    }).as('getMe')

    cy.visit(SUCCESS_URL, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'mock.jwt.token')
        win.localStorage.setItem('user', JSON.stringify({ id: 123 }))
        // intentionally omit history.state.reg
        try { win.history.replaceState({}, '', SUCCESS_URL) } catch {}
      },
    })

    cy.wait('@getMe')
    cy.location('pathname', { timeout: 10000 }).should('eq', '/')
  })
})
