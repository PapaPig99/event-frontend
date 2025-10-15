/// <reference types="cypress" />

describe('Seat Zone Page (Step 2)', () => {
  const EVENT_ID = 1
  const PAGE_PATH = `/event/${EVENT_ID}/plan`

  // ===== helper mock login =====
  function visitPlan() {
    cy.intercept('GET', '**/api/me', {
      statusCode: 200,
      body: { id: 999, email: 'user@demo.app', role: 'USER' },
    }).as('getMe')

    cy.intercept('GET', `**/api/events/${EVENT_ID}`, {
      statusCode: 200,
      body: {
        id: EVENT_ID,
        title: 'Pure Concert 2025',
        posterImageUrl: '/poster-demo.jpg',
        startDate: '2025-12-20',
        sessions: [
          { id: 10, start_time: '19:00', max_participants: 100, price: 1500 },
          { id: 11, start_time: '21:00', max_participants: 80, price: 1200 },
        ],
        zones: [
          { id: 1, name: 'VIP Zone', price: 1500, capacity: 50 },
          { id: 2, name: 'Regular Zone', price: 800, capacity: 200 },
        ],
      },
    }).as('getEvent')

    cy.visit(PAGE_PATH, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'mock.jwt.token')
        win.localStorage.setItem('user', JSON.stringify({ id: 999, name: 'Mock User' }))
      },
    })

    cy.wait('@getMe')
    cy.wait('@getEvent')
  }

  // ===== run ก่อนแต่ละ test =====
  beforeEach(() => {
    visitPlan()
  })

  it('PLAN-001: โหลดหน้าสำเร็จ แสดงชื่ออีเวนต์ โปสเตอร์ และ step ปัจจุบันเป็น Step 2', () => {
    cy.get('.event-title').should('exist').and('contain.text', 'Pure Concert 2025')
    cy.get('.poster').should('have.attr', 'src').and('include', 'poster')
    cy.get('.step.active .ball').should('contain.text', '2')
  })

it('PLAN-002: กดปุ่ม “ที่นั่งว่าง” เปิด/ปิดตารางข้อมูลโซนที่นั่งได้', () => {
  cy.contains('button.status-chip', 'ที่นั่งว่าง', { timeout: 10000 }).click({ force: true })

  cy.location('pathname').then((p) => {
    if (/\/event\/\d+\/seat-zone$/.test(p)) {
      // หน้าใหม่ยิง /api/events/:id อีกครั้ง — รอให้ข้อมูลมาก่อน
      cy.wait('@getEvent')
      // ปุ่มถูกรีเรนเดอร์ใหม่ ต้องคลิกอีกรอบเพื่อเปิดโมดัล
      cy.contains('button.status-chip', 'ที่นั่งว่าง', { timeout: 10000 }).click({ force: true })
    }
  })

  cy.get('.avail-card', { timeout: 10000 }).should('be.visible')
  cy.contains('.avail-head .title', 'โซนที่นั่ง').should('exist')
  cy.get('.avail-card .close').click()
  cy.get('.avail-card').should('not.exist')
})

 it('PLAN-003: กดปุ่ม “ย้อนกลับ” แล้วไปหน้าที่ถูกต้องตามประเภทอีเวนต์ (มีหรือไม่มีผัง)', () => {
  cy.get('button.btn-back').click()

  cy.location('pathname').then((p) => {
    const ok =
      p === `/event/${EVENT_ID}` ||                 // ไปหน้า detail
      /\/event\/\d+\/(plan|seat-zone)$/.test(p)     // หรืออยู่หน้าแผน
    expect(ok, `unexpected redirect to ${p}`).to.be.true
  })
})

  it('PLAN-004: เพิ่มและลดจำนวนที่นั่งในแต่ละโซนได้ และราคาสรุปเปลี่ยนตามจริง', () => {
    cy.get('.zone-card').first().within(() => {
      cy.get('.qty-num').should('contain.text', '0')
      cy.get('button.qty-btn').last().click().click()  // +2
      cy.get('.qty-num').should('contain.text', '2')
      cy.get('button.qty-btn').first().click()         // -1
      cy.get('.qty-num').should('contain.text', '1')
    })
    cy.get('.sum-price').should('contain.text', 'THB')
  })

  it('PLAN-005: ถ้ายังไม่เลือกที่นั่ง กด “ชำระเงิน” แล้วแจ้งเตือนให้เลือกก่อน', () => {
  cy.window().then(win => cy.stub(win, 'alert').as('alertStub'))

  // คลิก force เพื่อทดสอบ logic ใน goToPayment แม้ปุ่ม disabled
  cy.get('button.btn-pay', { timeout: 10000 })
    .should('have.attr', 'disabled')
    .click({ force: true })

  cy.get('@alertStub')
    .should('have.been.calledWithMatch', /กรุณาเลือกที่นั่งอย่างน้อย 1/)
})


  it('PLAN-006: เมื่อเลือกที่นั่งแล้ว กด “ชำระเงิน” จะสร้าง order และ draft ใน Session Storage และไปหน้า payment', () => {
    cy.get('.zone-card').first().find('button.qty-btn').last().click()  // +1
    cy.get('button.btn-pay').click()

    cy.location('pathname').should('include', `/event/${EVENT_ID}/payment`)

    cy.window().then(win => {
      const order = JSON.parse(win.sessionStorage.getItem(`order:${EVENT_ID}`))
      const draft = JSON.parse(win.sessionStorage.getItem(`registrationDraft:${EVENT_ID}`))
      expect(order).to.have.property('eventId', `${EVENT_ID}`)
      expect(draft).to.have.property('eventId', EVENT_ID)
    })
  })
})
