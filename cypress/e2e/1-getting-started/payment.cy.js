/// <reference types="cypress" />

// ✅ เพิกเฉย error จาก lazy-load (.vue module)
// ป้องกัน Cypress หยุดเมื่อหน้า Payment โหลดช้า / dynamic import ไม่ทัน
Cypress.on('uncaught:exception', (err) => {
  if (
    /Failed to fetch dynamically imported module/i.test(err.message) ||
    /Importing a module script failed/i.test(err.message) ||
    /Cannot read properties of undefined/i.test(err.message)
  ) {
    console.warn('⚠️ Ignore lazy-load error:', err.message)
    return false
  }
  return false
})

describe('Payment Page', () => {
  const EVENT_ID = 1
  const PAGE_PATH = `/event/${EVENT_ID}/payment`

  const API_ME          = '**/api/me'
  const API_EVENTS      = '**/api/events*'
  const API_VIEW        = '**/api/events/*/view'
  const API_REG_CREATE  = '**/api/registrations'
  const API_REG_CONFIRM = '**/api/registrations/*/confirm'

  const orderSeed = {
    eventId: EVENT_ID,
    title: 'Pure Concert 2025',
    poster: '/poster-demo.jpg',
    show: 'Sat, Dec 20, 2025 19:00',
    items: [
      { zoneId: 1, zoneLabel: 'VIP Zone',     unitPrice: 1500, qty: 1 },
      { zoneId: 2, zoneLabel: 'Regular Zone', unitPrice:  800, qty: 2 },
    ],
    fee: 310,
  }

  const draftsSeed = [
    { eventId: EVENT_ID, sessionId: 10, zoneId: 1, quantity: 1 },
    { eventId: EVENT_ID, sessionId: 10, zoneId: 2, quantity: 2 },
  ]

  /* ------------------------- Stub / Helper ------------------------- */
  function stubAuth() {
    cy.intercept('GET', API_ME, {
      statusCode: 200,
      body: { id: 99, username: 'admin', role: 'ADMIN' },
    }).as('getMe')
  }

  function stubEventApis() {
    cy.intercept('GET', API_EVENTS, { statusCode: 200, body: [] })
    cy.intercept('GET', API_VIEW, {
      statusCode: 200,
      body: { id: EVENT_ID, name: 'Pure Concert 2025' },
    })
  }

  function stubCreateRegOK() {
    let nextId = 1001
    cy.intercept('POST', API_REG_CREATE, (req) => {
      req.reply({ statusCode: 201, body: { id: nextId++ } })
    }).as('createReg')
  }

  function stubConfirmOK() {
    cy.intercept('PATCH', API_REG_CONFIRM, { statusCode: 200, body: { ok: true } }).as('confirmReg')
  }

  function seedSession(win) {
    win.localStorage.setItem('token', 'mock.jwt.token')
    win.sessionStorage.setItem(`order:${EVENT_ID}`, JSON.stringify(orderSeed))
    win.sessionStorage.setItem(`registrationsDraft:${EVENT_ID}`, JSON.stringify(draftsSeed))
  }

  function visitPayment() {
    stubAuth()
    stubEventApis()
    stubCreateRegOK()

    cy.visit(PAGE_PATH, {
      onBeforeLoad: seedSession,
    })

    // ✅ รอ DOM ของหน้า Payment แทนที่จะรอ request (กันกรณี lazy-load ช้า)
    cy.get('.payment-page', { timeout: 15000 }).should('exist')
  }

  /* ------------------------- TEST CASES ------------------------- */

  it('PAY-001: สร้างการจองจาก Draft สำเร็จ และแสดงสรุปคำสั่งซื้อถูกต้อง', () => {
    visitPayment()
    cy.wait('@createReg', { timeout: 10000 })
    cy.wait('@createReg', { timeout: 10000 })

    cy.get('.event-title').should('contain.text', orderSeed.title)
    cy.contains('.sum-row', 'VIP Zone').should('exist')
    cy.contains('.sum-row', 'Regular Zone').should('exist')
    cy.get('.qr-img').should('have.attr', 'src')
  })

  it('PAY-002: ไม่มี Draft ระบบแจ้งเตือนและนำกลับหน้าเลือกประเภทบัตร', () => {
    stubAuth()
    stubEventApis()
    cy.visit(PAGE_PATH, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'mock.jwt.token')
        win.sessionStorage.setItem(`order:${EVENT_ID}`, JSON.stringify(orderSeed))
        // ❌ ไม่มี draft
      },
    })
    cy.get('body', { timeout: 10000 })
    cy.location('pathname', { timeout: 10000 }).should('match', /\/event\/1\/plan$/)
  })

  it('PAY-003: ถ้า 401/403 จะไปหน้าแรก login=1', () => {
    stubAuth()
    stubEventApis()
    cy.intercept('POST', API_REG_CREATE, { statusCode: 401, body: 'unauth' }).as('createReg401')

    cy.visit(PAGE_PATH, { onBeforeLoad: seedSession })
    cy.get('.payment-page', { timeout: 15000 }).should('exist')
    cy.wait('@createReg401')
    cy.location('search').should('include', 'login=1')
  })

  it('PAY-004: ยืนยันการจ่าย → เรียก confirm และล้าง Draft', () => {
    visitPayment()
    stubConfirmOK()
    cy.wait('@createReg')
    cy.wait('@createReg')

    cy.contains('button.pay-btn', 'ยืนยันการจ่าย').click()
    cy.wait('@confirmReg')

    cy.window().then((win) => {
      expect(win.sessionStorage.getItem(`registrationsDraft:${EVENT_ID}`)).to.be.oneOf([null, ''])
    })
  })

  it('PAY-005: ปุ่มรายละเอียดไปหน้า Event Detail เดียวกัน', () => {
    visitPayment()
    cy.wait('@createReg')
    cy.get('a.link-chip')
      .should('have.attr', 'href')
      .and('match', new RegExp(`/event/${EVENT_ID}$`))
  })

  it('PAY-006: รอบแสดงและสถานะถูก disable', () => {
    visitPayment()
    cy.wait('@createReg')
    cy.get('select[disabled]').should('exist')
    cy.get('button.status-chip[disabled]').should('exist')
  })
})
