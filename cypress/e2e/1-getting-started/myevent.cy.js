/// <reference types="cypress" />

const PAGE_PATH = '/my-tickets'

// ดักให้ครอบทุกแบบ: absolute/relative, มี/ไม่มี /api, มี query, และ preflight
function armMyTicketsIntercept(body) {
  // รูปแบบหลัก (relative/absolute + มี query)
  cy.intercept(
    { method: 'GET', url: /\/api\/events\/my-?tickets(?:\/)?(\?.*)?$/ },
    { statusCode: 200, body }
  ).as('tix_api_regex')

  // กันเคสโปรเจ็กต์ที่ยังเรียกฝั่ง 8080 ตรง ๆ
  cy.intercept(
    'GET',
    'http://localhost:8080/api/events/my-tickets*',
    { statusCode: 200, body }
  ).as('tix_api_abs')

  // กันเคสลืมใส่ /api
  cy.intercept(
    'GET',
    '**/events/my-tickets*',
    { statusCode: 200, body }
  ).as('tix_api_loose')

  // กัน preflight (ถ้ามี CORS)
  cy.intercept('OPTIONS', '**/my-tickets*', { statusCode: 200 }).as('tix_preflight')

  // Tap เครือข่ายเพื่อ debug ว่ามี request ออกไหม
  cy.intercept('**', (req) => {
    if (req.url.includes('my-tickets')) {
      // ให้เห็นใน log ของ Cypress
      // eslint-disable-next-line no-console
      console.log('[NET] my-tickets →', req.method, req.url)
    }
  }).as('net_tap')
}

const FIXED_NOW = new Date('2025-01-15T12:00:00.000Z')
const mockUser  = { name: 'Jane Ticketlover', email: 'jane@example.com' }

const fxTickets = [
  { id: 1001, title: 'Future Concert A', date: '2025-01-16T20:00:00.000Z', location: 'Impact Arena', image: '/img/future-a.jpg' },
  { id: 1002, title: 'Future Concert B', date: '2025-02-01T19:30:00.000Z', location: 'QSNCC',        image: '/img/future-b.jpg' },
  { id: 9001, title: 'Past Festival X',   date: '2024-12-25T18:00:00.000Z', location: 'ICONSIAM',    image: '/img/past-x.jpg' },
]

Cypress.on('uncaught:exception', () => false)

function visitWithUser(body = fxTickets) {
  cy.clock(FIXED_NOW.getTime(), ['Date'])

  // intercept /api/me (ถ้ามี layout ยิง)
  cy.intercept('GET', '**/api/me', {
    statusCode: 200,
    body: { id: 999, email: 'user@demo.app', role: 'USER' },
  }).as('getMe')

  // เตรียม intercept สำหรับ my-tickets ให้ครบทุก variation
  armMyTicketsIntercept(body)

  cy.visit(PAGE_PATH, {
    onBeforeLoad(win) {
      // กัน auth-guard
      win.localStorage.setItem('token', 'mock.jwt')
      // ใส่ user ตามหน้าที่ใช้งานจริง
      win.localStorage.setItem('user', JSON.stringify(mockUser))
    },
  })

  // ยืนยันว่าไม่ได้หลุดไปหน้าอื่น
  cy.location('pathname').should('eq', PAGE_PATH)

  // รอ request ใด ๆ ใน 3 alias หลัก (อย่างน้อย 1 อันต้องมา)
  // ใช้แบบ "race": ถ้าอันแรกไม่มา แต่อีกอันมาก็ผ่าน
  cy.wait(['@tix_api_regex', '@tix_api_abs', '@tix_api_loose'], { timeout: 15000, log: false }).then(
    () => {},
    () => {
      // ถ้า 3 อันนี้ไม่มาจริง ให้เช็กว่าแอปยิงไป URL อะไร (ดูจาก net_tap ในคอนโซล)
      throw new Error('ไม่มี request มาที่ /api/events/my-tickets – ตรวจ URL ในแอปอีกครั้ง')
    }
  )
}

describe('บัตรงานอีเวนต์ของฉัน (My Event Tickets) – E2E', () => {
  it('TIX-001: โหลดหน้าสำเร็จและแสดงข้อมูลผู้ใช้จาก Local Storage พร้อมหัวเรื่อง/ไอคอน', () => {
    visitWithUser()

    cy.contains('h2', 'My Event Tickets').should('be.visible')
    cy.get('.title-row .title-icon').should('exist')
    cy.get('.profile-box .name').should('contain.text', mockUser.name)
    cy.get('.profile-box .email').should('contain.text', mockUser.email)
    cy.contains('button.edit-btn', 'Edit Profile').should('exist')
  })

  it('TIX-002: แยกระหว่าง Upcoming/History ถูกต้อง พร้อม badge จำนวน', () => {
    visitWithUser()

    cy.get('.tabs .tab').contains(/^Upcoming/).should('have.class', 'active')
    cy.get('.tabs .tab').contains(/^Upcoming/).find('.badge').should('contain.text', '2')
    cy.get('.tabs .tab').contains(/^History/).find('.badge').should('contain.text', '1')
  })

  it('TIX-003: แท็บว่าง แสดงข้อความ “No …”', () => {
    // ให้เหลือแค่ past → upcoming ว่าง
    const onlyPast = [{ ...fxTickets[2] }]
    visitWithUser(onlyPast)

    cy.contains('.tab', 'Upcoming').click()
    cy.get('[role="tabpanel"]:visible').contains('No upcoming events').should('be.visible')

    cy.contains('.tab', 'History').click()
    cy.get('[role="tabpanel"]:visible .event-card').should('have.length.at.least', 1)
  })

  it('TIX-004: สลับแท็บด้วย Arrow ซ้าย/ขวา และ aria ถูกต้อง', () => {
    visitWithUser()

    cy.contains('.tab', 'Upcoming').focus().trigger('keydown', { key: 'ArrowRight' })
    cy.contains('.tab', 'History').should('have.class', 'active')

    cy.contains('.tab', 'History').focus().trigger('keydown', { key: 'ArrowLeft' })
    cy.contains('.tab', 'Upcoming').should('have.class', 'active')

    cy.contains('.tab', 'Upcoming').should('have.attr', 'aria-selected', 'true')
    cy.contains('.tab', 'History').should('have.attr', 'aria-selected', 'false')
  })

  it('TIX-005: การ์ดมีข้อมูลพื้นฐานครบ (alt ชื่อ สถานที่ วันที่)', () => {
    visitWithUser()

    cy.contains('.tab', 'Upcoming').click()
    cy.get('[role="tabpanel"]:visible .event-card').first().within(() => {
      cy.get('img.poster').should('have.attr', 'alt', 'Event Poster')
      cy.get('.event-title').should('not.be.empty')
      cy.get('.location').should('not.be.empty')
      cy.get('.date').invoke('text').should('match', /[A-Za-z]{3}\s\d{2}\s[A-Za-z]{3}\s\d{4}\s\d{2}:\d{2}/)
    })
  })

  it('TIX-006: คลิก “View Ticket” → ไป /ticket/:id ถูกการ์ด', () => {
    visitWithUser()

    cy.contains('.tab', 'Upcoming').click()
    cy.contains('.event-card .event-title', 'Future Concert B')
      .parents('.event-card')
      .within(() => cy.contains('button.view-btn', 'View Ticket').click())

    cy.location('pathname').should('eq', '/ticket/1002')
  })

  it('TIX-007: ไปแท็บ History แล้วคลิก “View Ticket” → ไป /ticket/:id ของอดีต', () => {
    visitWithUser()

    cy.contains('.tab', 'History').click()
    cy.contains('.event-card .event-title', 'Past Festival X')
      .parents('.event-card')
      .within(() => cy.contains('button.view-btn', 'View Ticket').click())

    cy.location('pathname').should('eq', '/ticket/9001')
  })
})
