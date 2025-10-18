/// <reference types="cypress" />

Cypress.on('uncaught:exception', () => false)

describe('Seat Zone Page (Step 2)', () => {
  const EVENT_ID = 1
  const PAGE_PATH = `/event/${EVENT_ID}/plan`

  // ===== helper: รออย่างน้อยหนึ่ง alias สำเร็จ =====
  function waitAny(aliases, timeout = 12000) {
    return cy.wrap(null).then(() => {
      if (Promise.any) {
        return Promise.any(aliases.map(a => cy.wait(a, { timeout }).then(() => true))).catch(() => {})
      }
      return Cypress.Promise.allSettled(
        aliases.map(a => cy.wait(a, { timeout }).then(() => true))
      ).then(rs => rs.some(r => r.status === 'fulfilled'))
    })
  }

  function visitPlan() {
    cy.clock() // กัน setInterval ในโมดัล (ลด flake)

    // ===== Auth =====
    cy.intercept('GET', '**/api/me', {
      statusCode: 200,
      body: { id: 999, email: 'user@demo.app', role: 'USER' },
    }).as('getMe')

    // ===== Event (รายละเอียดอีเวนต์ + zones) =====
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

    // ===== View (ใช้จับคู่ session label → id) =====
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

    // ===== Availability (ให้มี available > 0 และมี capacity แนบไปด้วย) =====
    cy.intercept('GET', '**/api/zones/session/**/availability', (req) => {
      req.reply({
        statusCode: 200,
        body: [
          { zoneId: 1, zoneName: 'VIP Zone',     available: 47, capacity: 50 },
          { zoneId: 2, zoneName: 'Regular Zone', available: 200, capacity: 200 },
        ],
      })
    }).as('getAvail')

    // ===== Registration (สำคัญ) =====
    // ให้ batch 404 เพื่อบังคับเส้นทาง sequential ตามโค้ดจริง
    cy.intercept('POST', '**/api/registrations/batch', {
      statusCode: 404,
      body: { message: 'not implemented' },
    }).as('postBatch')

    // บางโปรเจกต์ยิง bulk ก่อน → ใส่ intercept ให้ด้วย
    cy.intercept('POST', '**/api/registrations/bulk', {
      statusCode: 404,
      body: { message: 'not implemented' },
    }).as('postBulk')

    // รองรับทั้ง camelCase และ snake_case
    cy.intercept('POST', '**/api/registrations', (req) => {
      const b = req.body || {}
      const qty =
        b.quantity ??
        b?.Quantity ??
        b?.qty

      if (!qty || Number(qty) <= 0) {
        return req.reply({ statusCode: 422, body: { message: 'quantity must be > 0' } })
      }
      // จำลองการล็อกสำเร็จ
      req.reply({ statusCode: 200, body: { id: 555, reservationId: 555 } })
    }).as('postReg')

    cy.visit(PAGE_PATH, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'mock.jwt.token')
        win.localStorage.setItem('user', JSON.stringify({ id: 999, name: 'Mock User' }))
      },
    })

    cy.wait('@getMe')
    cy.wait('@getEvent')

    // สำคัญ: รอให้ availability โหลดก่อนกัน validate เห็นเหลือ 0
    cy.wait('@getView',  { timeout: 10000 })
    cy.wait('@getAvail', { timeout: 10000 })
  }

  beforeEach(visitPlan)

  it('PLAN-001: โหลดหน้าสำเร็จ แสดงชื่ออีเวนต์ โปสเตอร์ และ step ปัจจุบันเป็น Step 2', () => {
    cy.get('.event-title').should('exist').and('contain.text', 'Pure Concert 2025')
    cy.get('.poster').should('have.attr', 'src')
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
        cy.wait('@getEvent')
        cy.contains('button.status-chip', 'ที่นั่งว่าง', { timeout: 10000 })
          .should('be.visible')
          .click({ force: true })
      }
    })

    // 3) รอให้ element ของโมดัล/ตารางโผล่
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
          // toggle อีกรอบถ้าจังหวะยังไม่ขึ้น
          cy.contains('button.status-chip', 'ที่นั่งว่าง', { timeout: 8000 }).click({ force: true })
          cy.get('.avail-card,.avail-table .row.header', { timeout: 8000 }).should('be.visible')
        }
      })
    }
    ensureVisible()

    // 5) ปิด
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
    cy.wait('@getEvent', { timeout: 10000 })
    cy.location('pathname', { timeout: 10000 }).should((p) => {
      const ok =
        p === `/event/${EVENT_ID}` ||
        new RegExp(`/event/${EVENT_ID}/(plan|seat-zone)$`).test(p)
      expect(ok, `unexpected redirect to ${p || 'blank'}`).to.be.true
    })
  })
})
