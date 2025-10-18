/// <reference types="cypress" />

Cypress.on('uncaught:exception', () => false)

describe('Payment Success Page', () => {
  const EVENT_ID = 1
  const SUCCESS_PATH = `/event/${EVENT_ID}/success`      // ปรับตามแอปหากต่าง
  const DETAIL_PATH_RE = new RegExp(`/event/${EVENT_ID}$`)
  const MY_EVENT_PATH_RE = /\/my-?event$/                // รองรับ /my-event และ /myevent

  // ---------- Test data ----------
  const regIds = [5551, 5552, 5553]
  const batchResponse = regIds.map((id, i) => ({ id, paymentReference: `PAY-REF-${i + 1}` }))

  // ---------- Auth stub & guard bypass ----------
  function stubAuth() {
    cy.intercept('GET', '**/api/**/me*',      { statusCode: 200, body: { id: 999, role: 'USER', email: 'user@demo.app' } }).as('getMe')
    cy.intercept('GET', '**/api/auth/**',     { statusCode: 200, body: { id: 999, role: 'USER' } }).as('getAuth')
    cy.intercept('GET', '**/api/**/profile*', { statusCode: 200, body: { id: 999, role: 'USER' } }).as('getProfile')
    cy.intercept('GET', '**/api/**/session*', { statusCode: 200, body: { id: 999, role: 'USER' } }).as('getSession')
  }

  // ---------- Intercepts: registrations ----------
  function interceptBatchOK() {
    cy.intercept('GET', '**/api/registrations*', (req) => {
      if (req.query?.ids) return req.reply({ statusCode: 200, body: batchResponse })
      return req.reply({ statusCode: 200, body: [] })
    }).as('getRegsBatch')
  }

  function interceptBatchFailThenSinglesOK() {
    cy.intercept('GET', '**/api/registrations*', (req) => {
      if (req.query?.ids) return req.reply({ statusCode: 404, body: { message: 'not supported' } })
      return req.reply({ statusCode: 200, body: [] })
    }).as('getRegsBatch404')
    regIds.forEach((id, i) => {
      cy.intercept('GET', `**/api/registrations/${id}`, {
        statusCode: 200,
        body: { id, paymentReference: `PAY-ONE-${i + 1}` },
      }).as(`getReg${id}`)
    })
  }

  function interceptSinglesWithOne401() {
    cy.intercept('GET', '**/api/registrations*', (req) => {
      if (req.query?.ids) return req.reply({ statusCode: 404, body: { message: 'not supported' } })
      return req.reply({ statusCode: 200, body: [] })
    }).as('getRegsBatch404B')
    regIds.forEach((id, i) => {
      if (i === 1) {
        cy.intercept('GET', `**/api/registrations/${id}`, { statusCode: 401, body: {} }).as(`getReg${id}`)
      } else {
        cy.intercept('GET', `**/api/registrations/${id}`, {
          statusCode: 200,
          body: { id, paymentReference: `PAY-ONE-${i + 1}` },
        }).as(`getReg${id}`)
      }
    })
  }

  // ---------- Visit helper: ใส่ token + state + sessionStorage ก่อนโหลด ----------
  function visitWithState(stateRegIds = regIds, useSessionStorageFallback = false) {
    stubAuth()
    cy.visit(SUCCESS_PATH, {
      onBeforeLoad(win) {
        // กัน route-guard
        win.localStorage.setItem('token', 'mock.jwt.token')
        win.localStorage.setItem('user', JSON.stringify({ id: 999, name: 'Mock User', role: 'USER' }))

        // inject history.state.regIds
        const state = { ...(win.history.state || {}), regIds: stateRegIds }
        win.history.replaceState(state, '', win.location.href)

        if (useSessionStorageFallback) {
          win.sessionStorage.setItem(`successRegIds:${EVENT_ID}`, JSON.stringify(stateRegIds))
        } else {
          win.sessionStorage.removeItem(`successRegIds:${EVENT_ID}`)
        }
      },
    })

    // ซิงก์หน้า: รอให้หัวข้อขึ้น (พอแค่ exist เพื่อกัน animation/visibility delay)
    cy.contains('h1.title', 'ชำระเงินสำเร็จ!', { timeout: 10000 }).should('exist')
  }

  // ================== TESTS ==================

  it('SUCCESS-001:  โหลดหน้าและแสดงหัวข้อ สถานะ หมายเลขการจอง และรหัสชำระเงินตัวแรก', () => {
    interceptBatchOK()
    visitWithState([regIds[0]], false)

    cy.contains('.row .label', 'สถานะ').siblings('.value.good').should('contain.text', 'ชำระเงินแล้ว')
    cy.contains('.row .label', 'หมายเลขการจอง').siblings('.value').should('contain.text', `#${regIds[0]}`)
    cy.contains('.row .label', 'รหัสการชำระเงิน').siblings('.value').should('contain.text', 'PAY-REF-1')
  })

  it('SUCCESS-002:ดึงรหัสชำระเงินแบบ batch และแสดงครบทุกใบ', () => {
    interceptBatchOK()
    visitWithState(regIds, false)

    cy.contains('.row .label', 'จำนวนตั๋ว').siblings('.value').should('contain.text', `${regIds.length} ใบ`)
    regIds.forEach((id, i) => {
      cy.get('.list').within(() => {
        cy.contains('.list-row .list-id', `#${id}`).should('be.visible')
        cy.contains('.list-row .list-ref', `PAY-REF-${i + 1}`).should('be.visible')
      })
    })
    cy.contains('.row .label', 'รหัสการชำระเงิน').siblings('.value').should('contain.text', 'PAY-REF-1')
  })

  it('SUCCESS-003: ถ้า batch ใช้ไม่ได้ให้ fallback ยิงทีละใบและแสดงผลถูกต้อง', () => {
    interceptBatchFailThenSinglesOK()
    visitWithState(regIds, false)

    cy.contains('.row .label', 'จำนวนตั๋ว').siblings('.value').should('contain.text', `${regIds.length} ใบ`)
    regIds.forEach((id, i) => {
      cy.get('.list').within(() => {
        cy.contains('.list-row .list-id', `#${id}`).should('be.visible')
        cy.contains('.list-row .list-ref', `PAY-ONE-${i + 1}`).should('be.visible')
      })
    })
    cy.contains('.row .label', 'รหัสการชำระเงิน').siblings('.value').should('contain.text', 'PAY-ONE-1')
  })

  it('SUCCESS-004: บางใบมีสถานะ 401 หรือ 403 ต้องไม่พัง และแสดงขีดกลางสำหรับใบนั้น', () => {
    interceptSinglesWithOne401()
    visitWithState(regIds, false)

    cy.contains('.row .label', 'จำนวนตั๋ว').siblings('.value').should('contain.text', `${regIds.length} ใบ`)
    cy.get('.list').within(() => {
      cy.contains('.list-row .list-id', `#${regIds[1]}`).siblings('.list-ref').should('have.text', '—')
      cy.contains('.list-row .list-id', `#${regIds[0]}`).siblings('.list-ref').should('contain.text', 'PAY-ONE-1')
      cy.contains('.list-row .list-id', `#${regIds[2]}`).siblings('.list-ref').should('contain.text', 'PAY-ONE-3')
    })
  })

  it('SUCCESS-005: ไม่มีหมายเลขการจองใน state และ session ต้องแสดงข้อความแจ้งเตือนและรหัสชำระเงินเป็นขีดกลาง', () => {
    visitWithState([], false) // ไม่ต้อง intercept เพราะเพจจะไม่เรียก /registrations
    cy.contains('.row .label', 'รหัสการชำระเงิน').siblings('.value').should('have.text', '—')
    cy.get('.hint').should('contain.text', 'ไม่พบหมายเลขการจอง')
  })

  it('SUCCESS-006: ปุ่มกลับไปดูรายละเอียดงานต้องนำทางไปยังหน้ารายละเอียดอีเวนต์', () => {
    interceptBatchOK()
    visitWithState([regIds[0]], false)

    // หาแบบข้อความกว้าง ๆ (รองรับทั้ง <a> และ <button>)
    cy.contains(/กลับไปดูรายละเอียดงาน/)
      .should('be.visible')
      .click({ force: true })

    cy.location('pathname', { timeout: 8000 }).should('match', DETAIL_PATH_RE)
  })

  it('SUCCESS-007: ลิงก์ดูตั๋วของฉันต้องนำทางไปยังหน้า my-event', () => {
    interceptBatchOK()
    visitWithState([regIds[0]], false)

    cy.contains(/ดูตั๋วของฉัน/)
      .should('be.visible')
      .click({ force: true })

    cy.location('pathname', { timeout: 8000 }).should('match', MY_EVENT_PATH_RE)
  })
})
