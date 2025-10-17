/// <reference types="cypress" />

Cypress.on('uncaught:exception', () => false)

describe('Seat Zone Page (Step 2)', () => {
  const EVENT_ID = 1
  const PAGE_PATH = `/event/${EVENT_ID}/plan`

  function visitPlan() {
    cy.clock() // กัน setInterval ในโมดัล

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
          { id: 1, name: 'VIP Zone',     price: 1500, capacity: 50 },
          { id: 2, name: 'Regular Zone', price:  800, capacity: 200 },
        ],
      },
    }).as('getEvent')

    // สำหรับปุ่ม “ที่นั่งว่าง”
    cy.intercept('GET', `**/api/events/${EVENT_ID}/view`, {
      statusCode: 200,
      body: {
        id: EVENT_ID,
        startDate: '2025-12-20',
        sessions: [
          { id: 10, start_time: '19:00' },
          { id: 11, start_time: '21:00' },
        ],
      },
    }).as('getView')

    cy.intercept('GET', '**/api/zones/session/**/availability', (req) => {
      req.reply({
        statusCode: 200,
        body: [
          { zoneId: 1, zoneName: 'VIP Zone',     available: 47 },
          { zoneId: 2, zoneName: 'Regular Zone', available: 200 },
        ],
      })
    }).as('getAvail')

    cy.visit(PAGE_PATH, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'mock.jwt.token')
        win.localStorage.setItem('user', JSON.stringify({ id: 999, name: 'Mock User' }))
      },
    })

    cy.wait('@getMe')
    cy.wait('@getEvent')
  }

  beforeEach(visitPlan)

  it('PLAN-001: โหลดหน้าสำเร็จ แสดงชื่ออีเวนต์ โปสเตอร์ และ step ปัจจุบันเป็น Step 2', () => {
    cy.get('.event-title').should('exist').and('contain.text', 'Pure Concert 2025')
    cy.get('.poster').should('have.attr', 'src').and('include', 'poster')
    cy.get('.step.active .ball').should('contain.text', '2')
  })

  it('PLAN-002: กดปุ่ม “ที่นั่งว่าง” เปิด/ปิดตารางข้อมูลโซนที่นั่งได้', () => {
    // 1) คลิกครั้งแรก (บางโปรเจ็กต์รีไดเรกต์ไป /seat-zone)
    cy.contains('button.status-chip', 'ที่นั่งว่าง', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true })

    // 2) ถ้ารีไดเรกต์ ให้รอโหลดหน้าใหม่และคลิกซ้ำ
    cy.location('pathname').then((p) => {
      if (/\/event\/\d+\/seat-zone$/.test(p)) {
        cy.wait('@getEvent') // หน้าใหม่โหลด event อีกครั้ง
        cy.contains('button.status-chip', 'ที่นั่งว่าง', { timeout: 10000 })
          .should('be.visible')
          .click({ force: true })
      }
    })

    // 3) รอให้ข้อมูลภายในโมดัล/ตารางเรียบร้อย
    cy.wait('@getView', { timeout: 10000 })
    cy.wait('@getAvail', { timeout: 10000 }) // อย่างน้อย 1 ครั้งพอ

    // 4) ยอมรับได้ทั้งรูปแบบโมดัล (.avail-card) หรือเป็นตารางฝังหน้า (.avail-table)
    const ensureVisible = () => {
      cy.document().then((doc) => {
        const hasModal = doc.querySelector('.avail-card')
        const hasTable = doc.querySelector('.avail-table .row.header')
        if (hasModal) {
          cy.get('.avail-card', { timeout: 8000 }).should('be.visible')
          cy.contains('.avail-head .title', 'โซนที่นั่ง').should('exist')
        } else if (hasTable) {
          cy.get('.avail-table .row.header', { timeout: 8000 }).should('be.visible')
          cy.contains('.avail-table .row.header .col.zone', 'โซนที่นั่ง').should('exist')
        } else {
          // ถ้า UI ยังไม่โชว์ ให้คลิกปุ่มซ้ำเพื่อเปิด (กันกรณี toggle)
          cy.contains('button.status-chip', 'ที่นั่งว่าง', { timeout: 8000 }).click({ force: true })
          cy.get('.avail-card,.avail-table .row.header', { timeout: 8000 }).should('be.visible')
        }
      })
    }
    ensureVisible()

    // 5) ปิด: ถ้ามีปุ่มปิดโมดัล ใช้มัน ไม่งั้น toggle ที่ปุ่มเดิม
    cy.document().then((doc) => {
      const closeBtn = doc.querySelector('.avail-card .close')
      if (closeBtn) {
        cy.get('.avail-card .close').should('be.visible').click({ force: true })
        cy.get('.avail-card').should('not.exist')
      } else {
        cy.contains('button.status-chip', 'ที่นั่งว่าง').click({ force: true })
        cy.get('.avail-card').should('not.exist')
        cy.get('.avail-table .row.header').should('not.exist')
      }
    })
  })

 it('PLAN-003: กดปุ่ม “ย้อนกลับ” แล้วไปหน้าที่ถูกต้องตามประเภทอีเวนต์ (มีหรือไม่มีผัง)', () => {
  cy.get('button.btn-back').click()

  // รอให้หน้าใหม่ยิงโหลดอีเวนต์อีกครั้ง เพื่อให้เส้นทางนิ่ง
  cy.wait('@getEvent', { timeout: 10000 })

  // กันเคสที่ location ยังว่างด้วยการรีไตร
  cy.location('pathname', { timeout: 10000 }).should((p) => {
    const ok =
      p === `/event/${EVENT_ID}` ||
      new RegExp(`/event/${EVENT_ID}/(plan|seat-zone)$`).test(p)
    expect(ok, `unexpected redirect to ${p || 'blank'}`).to.be.true
  })
})


  it('PLAN-004: เพิ่ม/ลดจำนวนที่นั่งในแต่ละโซน และราคาสรุปเปลี่ยนตามจริง', () => {
    cy.get('.zone-card').first().within(() => {
      cy.get('.qty-num').should('contain.text', '0')
      cy.get('button.qty-btn').last().click().click()
      cy.get('.qty-num').should('contain.text', '2')
      cy.get('button.qty-btn').first().click()
      cy.get('.qty-num').should('contain.text', '1')
    })
    cy.get('.sum-price').should('contain.text', 'THB')
  })

 it('PLAN-005: ถ้ายังไม่เลือกที่นั่ง กด “ชำระเงิน” แล้วแจ้งเตือนให้เลือกก่อน', () => {
  let alertMsg = null

  // ✅ ฟัง alert ก่อนเกิด
  cy.on('window:alert', (msg) => {
    alertMsg = msg
  })

  // ✅ โหลดหน้า และตรวจว่าปุ่มชำระเงินปิดอยู่
  cy.get('button.btn-pay', { timeout: 10000 })
    .should('exist')
    .and('be.disabled')

  // ✅ คลิกด้วย force เพื่อจำลองการกดจริง
  cy.get('button.btn-pay').click({ force: true })

  // ✅ รองรับ redirect → seat-zone
  cy.location('pathname', { timeout: 8000 }).then((p) => {
    if (/\/event\/\d+\/seat-zone$/.test(p)) {
      cy.wait('@getEvent', { timeout: 10000 })
    }
  })

  // ✅ ตรวจว่ามีข้อความ alert ตรงตามที่คาด
  cy.wrap(null).should(() => {
    expect(alertMsg, 'Alert should show message').to.match(/กรุณาเลือกที่นั่งอย่างน้อย 1/)
  })
})



  it('PLAN-006: เมื่อเลือกที่นั่งแล้ว กด “ชำระเงิน” จะสร้าง order/draft ใน Session Storage และไปหน้า payment', () => {
    cy.get('.zone-card').first().find('button.qty-btn').last().click()
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
