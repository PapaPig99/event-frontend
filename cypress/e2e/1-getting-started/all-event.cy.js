/// <reference types="cypress" />

/**
 * E2E: Admin – All Events (/admin/allevents)
 * - intercept เฉพาะ API ที่หน้า AllEvents ใช้จริง: GET/DELETE /api/events*
 * - หา card จากชื่อ mock แล้วคลิกปุ่มด้วย fallback หลายแบบ (data-cy, aria-label, title, class, ลำดับปุ่ม/ลิงก์)
 * - เลี่ยง selector รูปแบบ [attr*="..." i] และ :has() ที่ jQuery ไม่รองรับ
 * - ไม่ใช้ .within() ในเคส 4–6
 */

Cypress.on('uncaught:exception', () => false)

/* ===== Mock data ===== */
const mockEvents = [
  { id: 1, title: 'Pure Concert 2025', category: 'concert'   },
  { id: 2, title: 'Magic Show',        category: 'show'      },
  { id: 3, title: 'AI Workshop',       category: 'education' },
  { id: 4, title: 'Business Forum',    category: 'business'  },
  { id: 5, title: 'Football League',   category: 'sport'     },
]

/* ===== Intercepts ===== */
function stubApis() {
  cy.intercept(
    { method: 'GET', url: '**/api/events*' },
    (req) => req.reply({ statusCode: 200, body: mockEvents })
  ).as('getEvents')

  cy.intercept(
    { method: 'DELETE', url: '**/api/events/*' },
    (req) => req.reply({ statusCode: 200 })
  ).as('delEvent')
}

/* ===== Navigation ===== */
function visitAllEvents() {
  stubApis()

  cy.visit('/admin/allevents', {
    failOnStatusCode: false,
    onBeforeLoad(win) {
      win.localStorage.setItem('token', 'dummy.jwt.token')
      win.localStorage.setItem('user', JSON.stringify({ id: 99, role: 'ADMIN', name: 'Admin' }))
    },
  })

  cy.location('pathname', { timeout: 15000 }).should('match', /\/admin\/allevents$/)
  cy.wait('@getEvents', { timeout: 15000 })

  // ใช้ exist เพื่อลด false negative
  cy.get('.all-events', { timeout: 15000 }).should('exist')
  cy.get('.columns',    { timeout: 15000 }).should('exist')
}

/* ===== Helpers ===== */

// หา “การ์ดแรก” ของรายการจากชื่ออีเวนต์ที่เราม็อคไว้ (กันหลายตัวด้วย .first())
function getFirstEventCardByAnyTitle() {
  return cy.contains(
    /Pure Concert 2025|Magic Show|AI Workshop|Business Forum|Football League/,
    { timeout: 15000 }
  )
    .first()
    .then(($title) => {
      const $ = Cypress.$
      const $el = $($title)
      const candidates = [
        $el.closest('[data-event-card]'),
        $el.closest('.event-card'),
        $el.closest('article'),
        $el.closest('.card'),
        $el.closest('.box'),
        $el.closest('.panel'),
        $el.closest('.tile'),
        $el.closest('.col').length ? $el.closest('.col').children().has($el).first() : null,
      ].filter(Boolean).filter(($c) => $c.length)

      if (candidates.length) return cy.wrap(candidates[0])

      // fallback: ไต่ parent ขึ้นไป
      const fallbacks = [$el.parent(), $el.parents().eq(0), $el.parents().eq(1), $el.parents().eq(2)]
        .filter(($c) => $c && $c.length)
      return cy.wrap((fallbacks[0] || $el))
    })
}

// คลิกปุ่ม action (view|edit|delete) ภายในการ์ด — ไม่พึ่งข้อความบนปุ่ม และไม่ใช้ [attr*="..." i] / :has()
function clickActionInCard($card, action /* 'view' | 'edit' | 'delete' */) {
  const $ = Cypress.$
  const $$card = $($card)

  // 1) data-cy ตรงตัว
  const dataCyMap = {
    view:   '[data-cy="btn-view"]',
    edit:   '[data-cy="btn-edit"]',
    delete: '[data-cy="btn-delete"]',
  }
  const byDataCy = $$card.find(dataCyMap[action])
  if (byDataCy.length) return cy.wrap(byDataCy.first()).click({ force: true })

  // 2) หา button/a ที่มี aria-label หรือ title ตรงคำเป้าหมาย (case-insensitive ด้วย .filter())
  const targets = {
    view:   [/view/i, /ดู/i],
    edit:   [/edit/i, /แก้/i],
    delete: [/delete/i, /ลบ/i],
  }[action]

  const byAria = $$card.find('button[aria-label], a[aria-label]').filter((_, el) => {
    const v = (el.getAttribute('aria-label') || '').trim().toLowerCase()
    return targets.some((rx) => rx.test(v))
  })
  if (byAria.length) return cy.wrap(byAria.first()).click({ force: true })

  const byTitle = $$card.find('button[title], a[title]').filter((_, el) => {
    const v = (el.getAttribute('title') || '').trim().toLowerCase()
    return targets.some((rx) => rx.test(v))
  })
  if (byTitle.length) return cy.wrap(byTitle.first()).click({ force: true })

  // 3) หาไอคอนยอดนิยม แล้ว .closest('button,a')
  const iconClasses = {
    view:   ['fa-eye', 'mdi-eye', 'icon-eye', 'el-icon-view'],
    edit:   ['fa-pen', 'fa-edit', 'mdi-pencil', 'icon-edit', 'el-icon-edit'],
    delete: ['fa-trash', 'mdi-delete', 'icon-delete', 'el-icon-delete'],
  }[action]

  const iconSel = iconClasses.map((c) => `.${c}`).join(', ')
  // หาได้ทั้ง i และ svg
  const $icons = $$card.find(`i${iconSel.split(',').join(', i')}, svg${iconSel.split(',').join(', svg')}`)
  if ($icons.length) {
    const $btnOrLink = $icons.first().closest('button, a')
    if ($btnOrLink.length) return cy.wrap($btnOrLink).click({ force: true })
  }

  // 4) fallback: ปุ่ม/ลิงก์ตามลำดับ 0/1/2
  const fallbackIndex = action === 'view' ? 0 : action === 'edit' ? 1 : 2
  const $buttons = $$card.find('button')
  if ($buttons.length > fallbackIndex) {
    return cy.wrap($buttons.eq(fallbackIndex)).click({ force: true })
  }
  const $links = $$card.find('a')
  if ($links.length) {
    const idx = Math.min(fallbackIndex, $links.length - 1)
    return cy.wrap($links.eq(idx)).click({ force: true })
  }

  throw new Error(`ไม่พบปุ่มสำหรับ action="${action}" ภายในการ์ด`)
}

/* ===== Tests ===== */
describe('ADM-EVT – จัดการอีเวนต์ทั้งหมด (All Events Admin)', () => {
  beforeEach(visitAllEvents)

  it('ADM-EVT-001: โหลดหน้า All Events สำเร็จและแสดงหัวเรื่องกับปุ่ม “+ เพิ่มอีเวนต์”', () => {
    cy.contains('.title', 'All Events').should('be.visible')
    cy.contains('button', '+ เพิ่มอีเวนต์').should('be.visible')
  })

  it('ADM-EVT-002: แสดงคอลัมน์ครบ 5 หมวด', () => {
    cy.get('.columns .col').should('have.length.at.least', 5)
    cy.contains('.col', 'คอนเสิร์ต').should('exist')
    cy.contains('.col', 'การแสดง').should('exist')
    cy.contains('.col', 'การศึกษา').should('exist')
    cy.contains('.col', 'ธุรกิจ').should('exist')
    cy.contains('.col', 'กีฬา').should('exist')
  })

  it('ADM-EVT-003: ค้นหาในหมวด “คอนเสิร์ต” แล้วเจอ “Pure Concert 2025”', () => {
    cy.contains('.col', 'คอนเสิร์ต', { timeout: 12000 }).within(() => {
      cy.get('input').first().type('Pure', { delay: 0 })
    })
    cy.contains('Pure Concert 2025', { timeout: 12000 }).should('exist')
  })

  it('ADM-EVT-004: กดปุ่ม View แล้วไปหน้ารายละเอียดอีเวนต์', () => {
    getFirstEventCardByAnyTitle().then(($card) => {
      clickActionInCard($card, 'view')
    })
    cy.location('pathname', { timeout: 15000 })
      .should('match', /\/admin\/events\/\d+\/detail/)
  })

  it('ADM-EVT-005: กดปุ่ม Edit แล้วไปหน้าจัดการอีเวนต์', () => {
    visitAllEvents()
    getFirstEventCardByAnyTitle().then(($card) => {
      clickActionInCard($card, 'edit')
    })
    cy.location('pathname', { timeout: 15000 })
      .should('match', /\/admin\/events\/\d+\/edit/)
  })

  it('ADM-EVT-006: ลบอีเวนต์สำเร็จเมื่อเรียก API DELETE และแสดงข้อความยืนยัน', () => {
    visitAllEvents()
    cy.window().then((win) => cy.stub(win, 'confirm').returns(true))
    cy.on('window:alert', (msg) => expect(msg).to.include('ลบอีเวนต์เรียบร้อยแล้ว'))

    getFirstEventCardByAnyTitle().then(($card) => {
      clickActionInCard($card, 'delete')
    })
    cy.wait('@delEvent', { timeout: 10000 })
  })
})
