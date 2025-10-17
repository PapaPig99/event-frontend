// cypress/e2e/ticketsuccess.cy.js
/// <reference types="cypress" />

const EVENT_ID = 1
const SUCCESS_URL = `/event/${EVENT_ID}/success`
const API_ME = '**/api/me'

function visitSuccessWithReg(reg = { id: 43210, eventId: EVENT_ID }) {
  cy.intercept('GET', API_ME, {
    statusCode: 200,
    body: { id: 999, email: 'user@demo.app', role: 'USER' },
  }).as('getMe')

  cy.visit(SUCCESS_URL, {
    onBeforeLoad(win) {
      win.localStorage.setItem('token', 'mock.jwt.token')
      win.localStorage.setItem('user', JSON.stringify({ id: 999, name: 'Mock User' }))
      // seed history.state.reg
      const state = { ...(win.history.state || {}), reg }
      try {
        win.history.replaceState(state, '', SUCCESS_URL)
      } catch {}
    },
    failOnStatusCode: false,
  })

  cy.wait('@getMe', { timeout: 10000 }).its('response.statusCode').should('eq', 200)
}

describe('Payment Success Page – End-to-End', () => {
  it('TC-001: แสดงหน้าชำระเงินสำเร็จพร้อมรายละเอียดการจองถูกต้อง', () => {
    visitSuccessWithReg()

    // ยังอยู่หน้า success
    cy.location('pathname').should('eq', SUCCESS_URL)

    // หัวข้อ / คำอธิบาย (รองรับอีโมจิ)
    cy.contains('h1', 'ชำระเงินสำเร็จ!').should('be.visible')
    cy.get('p.desc').should('contain.text', 'ขอบคุณสำหรับการจองตั๋วของคุณ')

    // หมายเลขการจอง
    cy.get('.info-box').within(() => {
      cy.contains(/หมายเลขการจอง/i).should('exist')
      cy.get('strong').invoke('text').then(t => t.trim()).should('match', /^#?43210$/)
    })

    // ลิงก์กลับรายละเอียดอีเวนต์ (ยอมรับทั้ง /event/1 และ /events/1)
    cy.contains('a.back-btn', 'กลับไปดูรายละเอียดงาน')
      .should('have.attr', 'href')
      .then((href) => {
        expect(/\/events?\/1$/i.test(href), `detail href invalid: ${href}`).to.be.true
      })

    // ลิงก์ "ดูตั๋วของฉัน" — รองรับหลายรูปแบบเส้นทาง: /myevent, /my-event, /my-events
    cy.contains('a.secondary-btn', 'ดูตั๋วของฉัน')
      .should('have.attr', 'href')
      .then((href) => {
        expect(/\/my-?events?$/i.test(href), `tickets href invalid: ${href}`).to.be.true
      })
  })

  it('TC-002: ไม่มีข้อมูลการจองแล้วระบบนำกลับหน้าแรก', () => {
    // mock auth ให้ผ่าน guard
    cy.intercept('GET', API_ME, { statusCode: 200, body: { id: 123 } }).as('getMe')

    cy.visit(SUCCESS_URL, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'mock.jwt.token')
        win.localStorage.setItem('user', JSON.stringify({ id: 123 }))
        // ไม่ใส่ reg ลง state
        try { win.history.replaceState({ ...(win.history.state || {}) }, '', SUCCESS_URL) } catch {}
      },
      failOnStatusCode: false,
    })

    cy.wait('@getMe')
    cy.location('pathname', { timeout: 10000 }).should('eq', '/')
  })
})
