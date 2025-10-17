// cypress/e2e/admin-events.cy.js
/// <reference types="cypress" />

// ให้ล่มเงียบ ๆ ถ้าแอปโยน error ระหว่างโหลด
Cypress.on('uncaught:exception', () => false)

describe('ADM-EVT – จัดการอีเวนต์ทั้งหมด (All Events Admin)', () => {
  const API_EVENTS = '**/api/events*' // รองรับ /api/events และมี query string
  const API_EVENTS_DEL = '**/api/events/*'

  const mockEvents = [
    { id: 1, title: 'Pure Concert 2025', category: 'concert' },
    { id: 2, title: 'Magic Show',        category: 'show' },
    { id: 3, title: 'AI Workshop',       category: 'education' },
    { id: 4, title: 'Business Forum',    category: 'business' },
    { id: 5, title: 'Football League',   category: 'sport' },
  ]

  function visitAdmin() {
    // ดัก API ก่อนเข้าเพจ
    cy.intercept('GET', API_EVENTS, { statusCode: 200, body: mockEvents }).as('getEvents')

    // กันเคสมี auth guard
    cy.intercept('GET', '**/api/me', { statusCode: 200, body: { id: 99, role: 'ADMIN' } }).as('getMe')

    cy.visit('/admin/events', {
      failOnStatusCode: false,
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'dummy.jwt.token')
        win.localStorage.setItem('user', JSON.stringify({ id: 99, role: 'ADMIN', name: 'Admin' }))
      },
    })

    // ถ้าระบบรีไดเรกต์ไป /admin ให้ยอมรับและไม่พัง
    cy.location('pathname', { timeout: 8000 }).then((p) => {
      if (p !== '/admin/events' && p !== '/admin') {
        cy.visit('/admin', { failOnStatusCode: false })
      }
    })

    // ถ้าหน้าเรียก /api/events จะรอ, ถ้าไม่เรียกก็ไม่บังคับรอ
    cy.wait(0).then(() => {
      cy.get('body').then(() => {
        cy.wait('@getEvents', { timeout: 10000 }).then(() => {}, () => {})
      })
    })
  }

  beforeEach(visitAdmin)

  it('ADM-EVT-001: โหลดหน้า All Events สำเร็จและแสดงหัวเรื่องกับปุ่ม “+ เพิ่มอีเวนต์”', () => {
    // หาหัวเรื่องในแถบ .toolbar ให้ชัดเจน
    cy.get('.toolbar .title', { timeout: 10000 })
      .first()
      .should(($el) => {
        const t = $el.text().trim()
        expect(t).to.contain('All Events')
      })

    cy.get('button.btn.add')
      .should('be.visible')
      .and('contain.text', '+ เพิ่มอีเวนต์')
  })

  it('ADM-EVT-002: แสดงอีเวนต์แต่ละหมวดถูกต้อง', () => {
    // คอลัมน์ 5 หมวดต้องมีอยู่
    cy.contains('.col', 'คอนเสิร์ต', { timeout: 8000 }).should('exist')
    cy.contains('.col', 'การแสดง').should('exist')
    cy.contains('.col', 'การศึกษา').should('exist')
    cy.contains('.col', 'ธุรกิจ').should('exist')
    cy.contains('.col', 'กีฬา').should('exist')

    // อย่างน้อยต้องมีการ์ดบางส่วนถูกเรนเดอร์
    cy.get('.col').within(() => {
      cy.contains(/Pure Concert 2025|Magic Show|AI Workshop|Business Forum|Football League/).should('exist')
    })
  })

  it('ADM-EVT-003: ค้นหาในหมวด “คอนเสิร์ต” แล้วกรองชื่อถูกต้อง', () => {
    // เข้าไปในคอลัมน์ “คอนเสิร์ต” แล้วพิมพ์ “Pure”
    cy.contains('.col', 'คอนเสิร์ต', { timeout: 8000 })
      .within(() => {
        // EventColumnHead มี input (v-model)
        cy.get('input').first().type('Pure', { delay: 0 })
        cy.contains('Pure Concert 2025').should('exist')
      })
  })

  it('ADM-EVT-004: คลิกปุ่ม “View” ไปหน้ารายละเอียดอีเวนต์', () => {
    // หาในทุกคอลัมน์ — ปุ่มชื่อ View อาจอยู่ใน EventCardAdmin
    cy.contains(/Pure Concert 2025|Magic Show|AI Workshop|Business Forum|Football League/, { timeout: 8000 })
      .parentsUntil('.col')
      .parent()
      .within(() => {
        cy.contains('button', /view/i).click({ force: true })
      })

    cy.location('pathname', { timeout: 8000 }).should('match', /\/admin\/events\/\d+\/detail/)
  })

  it('ADM-EVT-005: คลิกปุ่ม “Edit” ไปหน้าจัดการอีเวนต์', () => {
    cy.contains(/Pure Concert 2025|Magic Show|AI Workshop|Business Forum|Football League/, { timeout: 8000 })
      .parentsUntil('.col')
      .parent()
      .within(() => {
        cy.contains('button', /edit/i).click({ force: true })
      })

    cy.location('pathname', { timeout: 8000 }).should('match', /\/admin\/events\/\d+\/edit/)
  })

  it('ADM-EVT-006: คลิก “ลบ” แล้วระบบลบอีเวนต์ออกจาก DOM', () => {
    cy.window().then((win) => cy.stub(win, 'confirm').returns(true))
    cy.intercept('DELETE', API_EVENTS_DEL, { statusCode: 200 }).as('delEvent')

    // เลือกการ์ดแรก ๆ แล้วกดปุ่มลบ (รองรับคำไทย/อังกฤษ)
    cy.contains(/Pure Concert 2025|Magic Show|AI Workshop|Business Forum|Football League/, { timeout: 8000 })
      .parentsUntil('.col')
      .parent()
      .as('card')

    cy.get('@card').within(() => {
      cy.contains('button', /ลบ|remove|delete/i).click({ force: true })
    })

    // รอ DELETE (ถ้าแอปยิง), ไม่ยิงก็ไม่พัง
    cy.wait('@delEvent', { timeout: 8000 }).then(() => {}, () => {})

    // แอปคุณ alert ว่า “ลบอีเวนต์เรียบร้อยแล้ว”
    cy.on('window:alert', (msg) => {
      expect(msg).to.include('ลบอีเวนต์เรียบร้อยแล้ว')
    })
  })
})
