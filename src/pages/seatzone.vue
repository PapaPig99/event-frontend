/// <reference types="cypress" />

Cypress.on('uncaught:exception', () => false)

describe('Seat Zone Page – Step 2', () => {
  const EVENT_ID = 1
  const PLAN_PATH = `/event/${EVENT_ID}/plan` // บางโปรเจกต์ใช้ path นี้แล้ว redirect ไป /seat-zone
  const SEAT_PATH_REGEX = new RegExp(`/event/${EVENT_ID}/(plan|seat-zone)$`)

  // ===== auth stub แบบเดียวกับ payment =====
  const stubAuth = () => {
    cy.intercept('GET', '**/api/**/me*',      { statusCode: 200, body: { id: 1, role: 'USER' } }).as('me1')
    cy.intercept('GET', '**/api/auth/**',     { statusCode: 200, body: { id: 1, role: 'USER' } }).as('me2')
    cy.intercept('GET', '**/api/users/me*',   { statusCode: 200, body: { id: 1, role: 'USER' } }).as('me3')
    cy.intercept('GET', '**/api/**/session*', { statusCode: 200, body: { id: 1, role: 'USER' } }).as('me4')
    cy.intercept('GET', '**/api/**/profile*', { statusCode: 200, body: { id: 1, role: 'USER' } }).as('me5')
  }

  function interceptEventData () {
    // Event หลัก + zones
    cy.intercept('GET', `**/api/events/${EVENT_ID}`, {
      statusCode: 200,
      body: {
        id: EVENT_ID,
        title: 'Pure Concert 2025',
        posterImageUrl: '/poster-demo.jpg',
        startDate: '2025-12-20',
        sessions: [
          { id: 10, start_time: '19:00', max_participants: 100, price: 1500 },
          { id: 11, start_time: '21:00', max_participants: 80,  price: 1200 },
        ],
        zones: [
          { id: 1, name: 'VIP Zone',     price: 1500, capacity: 50 },
          { id: 2, name: 'Regular Zone', price:  800, capacity: 200 },
        ],
      },
    }).as('getEvent')

    // view สำหรับ map label → sessionId
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

    // availability ของแต่ละโซน
    cy.intercept('GET', '**/api/zones/session/**/availability', (req) => {
      req.reply({
        statusCode: 200,
        body: [
          { zoneId: 1, zoneName: 'VIP Zone',     available: 47, capacity: 50 },
          { zoneId: 2, zoneName: 'Regular Zone', available: 200, capacity: 200 },
        ],
      })
    }).as('getAvail')
  }

  function visitSeatZone ({ authed = true } = {}) {
    cy.clock()
    stubAuth()
    interceptEventData()

    cy.visit(PLAN_PATH, {
      onBeforeLoad (win) {
        if (authed) {
          win.localStorage.setItem('token', 'mock.jwt.token')
          win.localStorage.setItem('user', JSON.stringify({ id: 999, name: 'Mock User' }))
        } else {
          win.localStorage.removeItem('token')
          win.localStorage.removeItem('user')
        }
      },
    })

    cy.location('pathname', { timeout: 10000 }).should((p) => {
      expect(SEAT_PATH_REGEX.test(p), `should be on seat-zone/plan page, got ${p}`).to.be.true
    })

    cy.wait('@getEvent')
    cy.wait('@getView',  { timeout: 10000 })
    cy.wait('@getAvail', { timeout: 10000 })
  }

  // default: เทสต์แบบ user ล็อกอินแล้ว
  beforeEach(() => visitSeatZone({ authed: true }))

  // === PLAN-001 ============================================================
  it('PLAN-001: โหลดหน้าสำเร็จ แสดงชื่ออีเวนต์ โปสเตอร์ และ Step ปัจจุบันเป็น Step 2', () => {
    cy.get('.event-title')
      .should('exist')
      .and('contain.text', 'Pure Concert 2025')

    cy.get('.poster').should('have.attr', 'src')
    cy.get('.step.active .ball').should('contain.text', '2')
  })

  // === PLAN-002 ============================================================
  it('PLAN-002: กดปุ่ม “ที่นั่งว่าง” แล้วเห็นข้อมูลโซนที่นั่งในโมดัล และปิดได้', () => {
    // คลิกปุ่มครั้งแรก
    cy.contains('button.status-chip', 'ที่นั่งว่าง', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true })

    // รองรับกรณีอยู่ในโมดัล
    cy.get('.avail-card', { timeout: 8000 }).should('be.visible')
    cy.contains('.avail-head .title', 'โซนที่นั่ง').should('exist')

    // แถวหัวตาราง
    cy.get('.avail-table .row.header').within(() => {
      cy.contains('.col.zone', 'โซนที่นั่ง').should('exist')
      cy.contains('.col.left', 'ที่นั่งว่าง').should('exist')
    })

    // แถวข้อมูลอย่างน้อย 1 แถว เช่น VIP Zone
    cy.contains('.avail-table .row .col.zone', 'VIP Zone').should('exist')

    // ปิดโมดัล
    cy.get('.avail-card .close').click({ force: true })
    cy.get('.avail-card').should('not.exist')
  })

  // === PLAN-003 ============================================================
  it('PLAN-003: เลือกจำนวนที่นั่งแล้ว summary ด้านล่างอัปเดตตาม (โซนหลัก / จำนวน / ยอดรวม)', () => {
    // เพิ่ม VIP Zone 2 ที่นั่ง
    cy.contains('.zone-item .zone-title', 'VIP Zone')
      .parents('.zone-item')
      .within(() => {
        cy.get('.btn').contains('+').click()
        cy.get('.btn').contains('+').click()
      })

    // ตรวจสรุป
    cy.get('.sum-zone').should('contain.text', 'VIP Zone')
    cy.get('.sum-qty').should('contain.text', '2 ที่นั่ง')
    cy.get('.sum-price').should('contain.text', '3,000 THB') // 1500 * 2
  })

  // === PLAN-004 ============================================================
  it('PLAN-004: เมื่อเลือกที่นั่งแล้วกด “ไปหน้าชำระเงิน” → สร้าง draft/order ใน sessionStorage และ redirect ไปหน้า Payment', () => {
    // เพิ่ม VIP Zone 2 ที่นั่ง
    cy.contains('.zone-item .zone-title', 'VIP Zone')
      .parents('.zone-item')
      .within(() => {
        cy.get('.btn').contains('+').click().click()
      })

    cy.get('.proceed').should('not.be.disabled').click()

    // ตรวจ path → /event/1/payment
    cy.location('pathname', { timeout: 10000 }).should('include', `/event/${EVENT_ID}/payment`)

    // ตรวจ sessionStorage
    cy.window().then((win) => {
      const draftsRaw = win.sessionStorage.getItem(`registrationsDraft:${EVENT_ID}`)
      expect(draftsRaw, 'drafts in sessionStorage').to.be.a('string')

      const drafts = JSON.parse(draftsRaw)
      expect(drafts).to.have.length(1)

      const d0 = drafts[0]
      expect(d0.eventId).to.eq(EVENT_ID)
      expect(d0.sessionId).to.eq(10)   // session แรก 19:00
      expect(d0.seatZoneId).to.eq(1)
      expect(d0.zoneId).to.eq(1)
      expect(d0.zoneLabel).to.eq('VIP Zone')
      expect(d0.quantity).to.eq(2)
      expect(d0.unitPrice).to.eq(1500)

      const orderRaw = win.sessionStorage.getItem(`order:${EVENT_ID}`)
      expect(orderRaw, 'order in sessionStorage').to.be.a('string')

      const order = JSON.parse(orderRaw)
      expect(order.eventId).to.eq(EVENT_ID)
      expect(order.title).to.eq('Pure Concert 2025')
      expect(order.show).to.contain('19:00')        // show แรกถูกเลือก
      expect(order.items).to.have.length(1)
      expect(order.items[0].zoneLabel).to.eq('VIP Zone')
      expect(order.items[0].qty).to.eq(2)
      expect(order.items[0].unitPrice).to.eq(1500)
    })
  })

  // === PLAN-005 (optional): Guest ต้องกรอกข้อมูลก่อนถึงจะไป Payment =================
  it('PLAN-005: ถ้าไม่ล็อกอิน → กด “ไปหน้าชำระเงิน” จะเด้ง guest modal ให้กรอก แล้วค่อยไปหน้า Payment', () => {
    // โหลดหน้าใหม่แบบ guest
    visitSeatZone({ authed: false })

    // เลือก VIP 1 ที่นั่ง
    cy.contains('.zone-item .zone-title', 'VIP Zone')
      .parents('.zone-item')
      .within(() => {
        cy.get('.btn').contains('+').click()
      })

    // กดไปหน้าชำระเงิน → ต้องยังไม่ redirect แต่ขึ้นโมดัล Guest
    cy.get('.proceed').should('not.be.disabled').click()

    cy.get('.avail-card .title')
      .should('contain.text', 'กรอกข้อมูลผู้จอง')

    // กรอกข้อมูล guest แล้วกดดำเนินการต่อ
    cy.get('input[placeholder="ชื่อ-นามสกุล"]').type('Guest User')
    cy.get('input[placeholder="name@example.com"]').type('guest@example.com')
    cy.get('input[placeholder="080-xxx-xxxx"]').type('0812345678')
    cy.contains('button.btn-pay', 'ดำเนินการต่อ').click()

    // ตอนนี้ต้องอยู่หน้า payment
    cy.location('pathname', { timeout: 10000 }).should('include', `/event/${EVENT_ID}/payment`)

    // buyerEmail ต้องถูกเซฟ
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('buyerEmail')).to.eq('guest@example.com')
      expect(win.localStorage.getItem('buyerEmail')).to.eq('guest@example.com')
    })
  })
})
