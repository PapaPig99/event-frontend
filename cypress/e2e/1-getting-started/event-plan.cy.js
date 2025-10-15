// cypress/e2e/event-plan.cy.js
/// <reference types="cypress" />

const PLAN_PATH = '/event/1/plan';
const API_EVENT_1 = '**/api/events/1';
const SEATZONE_PATH_RE = /\/(seat[-_]zone|event\/1\/(seat|zone))/;

const liteBase = {
  id: 1,
  title: 'Concert Lite Title',
  posterImageUrl: '/img/lite-poster.jpg',
  seatmapImageUrl: '/img/lite-seatmap.png',
  startDate: '2025-10-28',
  doorOpenTime: '17:00',
  sessions: [{ id: 5001, name: 'Main Day', start_time: '20:00' }],
  zones: [
    { code: 'A', remaining: 150 },
    { code: 'B', remaining: 0 },
  ],
};

/** visit helper ที่ใส่ auth + eventLite ก่อนโหลดจริง */
function visitWithLiteAndAuth(path = PLAN_PATH, lite = liteBase) {
  // mock /api/me ให้ผ่าน guard ทุกครั้ง
  cy.intercept('GET', '**/api/me', {
    statusCode: 200,
    body: { id: 99, name: 'Mock User', role: 'USER', email: 'mock@demo.dev' },
  }).as('getMe');

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('token', 'mock.jwt.token');
      win.localStorage.setItem('user', JSON.stringify({ id: 99, name: 'Mock User' }));

      try {
        win.history.replaceState({ eventLite: lite }, '');
      } catch {}
      win.sessionStorage.setItem(`eventLite:${lite.id}`, JSON.stringify(lite));
    },
  });
}

Cypress.on('uncaught:exception', () => false);
// ===================================================
describe('Event Plan – E2E', () => {
  it('PLAN-001: แสดงข้อมูลพื้นฐาน (ชื่อ/โปสเตอร์) จาก eventLite ทันที แล้วอัปเดตจาก API', () => {
    // หน่วง API ให้เห็นว่า lite render มาก่อน
    cy.intercept('GET', API_EVENT_1, (req) => {
      req.on('response', (res) => res.setDelay(700));
      req.reply({
        statusCode: 200,
        body: {
          ...liteBase,
          title: 'MARIAH CAREY The Celebration of Mimi',
          posterImageUrl: '/img/api-poster.jpg',
          seatmapImageUrl: '/img/api-seatmap.png',
          status: 'OPEN',
        },
      });
    }).as('getEvent');

    visitWithLiteAndAuth();

    // ค่า lite ต้องขึ้นก่อน
    cy.get('.event-title', { timeout: 10000 }).should('contain.text', liteBase.title);
    cy.get('.poster').should('have.attr', 'src', liteBase.posterImageUrl);

    // แล้วอัปเดตด้วยค่าจาก API
    cy.wait('@getEvent');
    cy.get('.event-title').should('contain.text', 'MARIAH CAREY The Celebration of Mimi');
    cy.get('.poster').should('have.attr', 'src', '/img/api-poster.jpg');
    cy.get('select#show option').its('length').should('be.greaterThan', 0);
  });

  it('PLAN-002: ปุ่ม “ที่นั่งว่าง” เปิด Modal/Dropdown และแสดงรายการโซนพร้อมจำนวนคงเหลือ', () => {
    cy.intercept('GET', API_EVENT_1, {
      statusCode: 200,
      body: {
        ...liteBase,
        seatmapImageUrl: '/img/api-seatmap.png',
        zones: [
          { code: 'A1', remaining: 156 },
          { code: 'B1', remaining: 0 },
          { code: 'C1', remaining: 45 },
        ],
      },
    }).as('getEvent');

    visitWithLiteAndAuth();
    cy.wait('@getEvent');

    cy.contains('button', 'ที่นั่งว่าง').click();
    cy.get('.avail-backdrop .avail-card').should('be.visible');
    cy.get('.avail-table .row.header').should('exist');
    cy.get('.avail-table .row:not(.header)').its('length').should('be.greaterThan', 0);
    cy.contains('.avail-table .row', 'A1').should('contain.text', '156');
    cy.contains('.avail-head .close', '✕').click();
    cy.get('.avail-backdrop').should('not.exist');
  });

  it('PLAN-003: ถ้ามี seatmap แสดงรูปผังและปุ่ม “ถัดไป” ทำงาน', () => {
    cy.intercept('GET', API_EVENT_1, {
      statusCode: 200,
      body: { ...liteBase, seatmapImageUrl: '/img/api-seatmap.png' },
    }).as('getEvent');

    visitWithLiteAndAuth();
    cy.wait('@getEvent');

    cy.get('.seatmap-img').should('have.attr', 'src', '/img/api-seatmap.png');
    cy.contains('button.next-btn', 'ถัดไป').click();
    cy.location().should((loc) => {
      expect(SEATZONE_PATH_RE.test(loc.pathname), `went to seat-zone: ${loc.pathname}`).to.be.true;
    });
  });

  it('PLAN-004: ถ้าไม่มี seatmap (หรือเป็นรูป fallback) ระบบข้ามไปหน้าเลือกโซนอัตโนมัติ', () => {
    const liteNoMap = { ...liteBase, seatmapImageUrl: '' };
    cy.intercept('GET', API_EVENT_1, {
      statusCode: 200,
      body: { ...liteBase, seatmapImageUrl: '' },
    }).as('getEvent');

    visitWithLiteAndAuth(PLAN_PATH, liteNoMap);
    cy.wait('@getEvent');
    cy.location().should((loc) => {
      expect(SEATZONE_PATH_RE.test(loc.pathname), `auto-redirect to seat-zone: ${loc.pathname}`).to.be.true;
    });
  });

  it('PLAN-005: ลิงก์ “รายละเอียด” ชี้ไปหน้า event detail ของ id เดียวกัน', () => {
    cy.intercept('GET', API_EVENT_1, { statusCode: 200, body: liteBase }).as('getEvent');

    visitWithLiteAndAuth();
    cy.wait('@getEvent');

    cy.get('a.link-chip')
      .should('have.attr', 'href')
      .then((href) => {
        expect(/\/events?\/1/.test(href), `detail href: ${href}`).to.be.true;
      });
  });

  it('PLAN-006: ปุ่ม “ย้อนกลับ” เรียก history.back() และนำทางกลับหน้าก่อนหน้า', () => {
    cy.visit('/'); // หน้าเดิมก่อนกดย้อนกลับ

    cy.intercept('GET', API_EVENT_1, { statusCode: 200, body: liteBase }).as('getEvent');
    visitWithLiteAndAuth();
    cy.wait('@getEvent');

    cy.contains('button.btn-back', 'ย้อนกลับ').click();
    cy.location('pathname').should('eq', '/');
  });

  it('PLAN-007: เซฟ state plan ลง sessionStorage เมื่อกด “ถัดไป”', () => {
    cy.intercept('GET', API_EVENT_1, {
      statusCode: 200,
      body: { ...liteBase, seatmapImageUrl: '/img/api-seatmap.png' },
    }).as('getEvent');

    visitWithLiteAndAuth();
    cy.wait('@getEvent');

    cy.contains('button.next-btn', 'ถัดไป').click();

    cy.window().then((win) => {
      const raw = win.sessionStorage.getItem('plan:1');

      // รองรับทั้งกรณีได้สตริง และ (เผื่อ) เคยถูกเซ็ตเป็นอ็อบเจ็กต์
      const plan = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw;

      expect(plan, 'plan object').to.be.an('object');

      // อนุญาตให้มีคีย์อื่น ๆ ได้ แต่ต้องมีคีย์หลักครบ
      expect(plan).to.include.all.keys([
        'id',
        'title',
        'poster',
        'shows',
        'selectedShow',
        'statusText',
        'sessions',
        'zones',
      ]);

      // id อาจเป็นสตริงจาก route param → normalize ก่อน
      expect(Number(plan.id)).to.eq(1);

      expect(plan.title).to.be.a('string').and.not.empty;
      expect(plan.poster).to.be.a('string').and.not.empty;
      expect(plan.shows).to.be.an('array').and.not.empty;
      expect(plan.sessions).to.be.an('array');
      expect(plan.zones).to.be.an('array');
      expect(plan.shows).to.include(plan.selectedShow);
    });

    // ตรวจปลายทางหลัง “ถัดไป” (รองรับหลายรูปแบบ)
    cy.location().should((loc) => {
      const ok =
        /\/event\/1\/seat[-_]zone$/.test(loc.pathname) ||
        (loc.pathname === '/' && /redirect=\/event\/1\/seat[-_]zone/.test(loc.search));
      expect(ok, `arrived at seat-zone: ${loc.pathname}${loc.search}`).to.be.true;
    });
  });
});
