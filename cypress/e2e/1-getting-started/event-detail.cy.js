/// <reference types="cypress" />

const DETAIL_PATH = '/event/1';
const API_EVENT_1 = '**/api/events/1';
const API_EVENT_1_VIEW = '**/api/events/1/view';

// ปลายทางหลังเลือกเวลา
const PLAN_PATH_RE = /\/event\/1\/(plan|seat[-_]?zone|select)/i;

// ข้อมูลปกติ
const fxEvent = {
  id: 1,
  title: 'MARIAH CAREY The Celebration of Mimi',
  category: 'concert',
  startDate: '2025-10-28',
  endDate: '2025-10-29',
  location: 'Impact Arena',
  doorOpenTime: '20:00',
  minPrice: 2500,
  maxPrice: 5500,
  zones: [
    { name: 'A', price: 5500 },
    { name: 'B', price: 3500 },
    { name: 'C', price: 2500 },
  ],
  posterImageUrl: '/img/poster.png',
  seatmapImageUrl: '/img/seatmap.png',
};

// ไม่มีผัง
const fxNoSeatmap = {
  ...fxEvent,
  seatmapImageUrl: '',
};

Cypress.on('uncaught:exception', () => false);

describe('Event Detail – E2E', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/me', {
      statusCode: 200,
      body: { id: 9, email: 'user@example.com', role: 'USER' },
    }).as('getMe');
  });

it('DET-001: โหลดข้อมูลสำเร็จและแสดงหัวข้อ โปสเตอร์ รายละเอียดเบื้องต้น พร้อมราคาที่คำนวณจากโซน', () => {
  cy.intercept('GET', API_EVENT_1, { statusCode: 200, body: fxEvent }).as('getEvent');
  cy.intercept('GET', `${API_EVENT_1}/view`, { statusCode: 200, body: fxEvent }).as('getEventView');

  // กันเคสหน้าเรียก sessions เพิ่ม
  cy.intercept('GET', '**/api/events/1/sessions*', { statusCode: 200, body: [] }).as('getSessions1');
  cy.intercept('GET', '**/api/event_sessions*', { statusCode: 200, body: [] }).as('getEventSessions');

  cy.visit(DETAIL_PATH);
  cy.wait('@getEvent');
  cy.wait('@getEventView');
  cy.wait('@getSessions1');
  cy.wait('@getEventSessions');

  // ===== หัวข้อ (อยู่ที่ .main-info .title) =====
  cy.get('.main-info .title', { timeout: 10000 })
    .should('exist')
    .and('contain.text', fxEvent.title);

  // ===== โปสเตอร์ =====
  cy.get('img.poster', { timeout: 10000 })
    .should('have.attr', 'src')
    .then(src => {
      // รวมกรณีเป็น absolute URL ของ dev server
      expect(String(src)).to.include(fxEvent.posterImageUrl);
    });

  // ===== รายละเอียด (labels/values ตามหน้า: "วันงาน", "สถานที่งาน", "ประตูเปิด") =====
  cy.contains('.fact-list .label, .info-item .label', 'วันงาน', { timeout: 10000 })
    .parent()
    .find('.value, .val')
    .should('exist')
    .invoke('text')
    .then(t => {
      // มี endDate แล้ว → ควรมีปีไทย 2568
      expect(t).to.match(/2568/);
    });

  cy.contains('.fact-list .label, .info-item .label', 'สถานที่งาน')
    .parent()
    .find('.value, .val')
    .should('contain.text', fxEvent.location);

  cy.contains('.fact-list .label, .info-item .label', 'ประตูเปิด')
    .parent()
    .find('.value, .val')
    .should('contain.text', '20:00');

  // ===== ราคา (แสดงใน .price-line หรือ .price-box .price-text) =====
  cy.get('.price-line, .price-box .price-text', { timeout: 10000 })
    .invoke('text')
    .then((t) => {
      const clean = (t || '').replace(/\s+/g, ' ');
      expect(clean).to.match(/5,?500/);
      expect(clean).to.match(/3,?500/);
      expect(clean).to.match(/2,?500/);
    });
});

  it('DET-002: เมื่อ API คืนค่า 404 ระบบแสดงข้อความ "ไม่พบงานนี้"', () => {
    cy.intercept('GET', API_EVENT_1, { statusCode: 404, body: { message: 'not found' } }).as('getEvent');
    cy.visit(DETAIL_PATH);
    cy.wait('@getEvent');
    cy.contains('ไม่พบงานนี้').should('be.visible');
  });

  it('DET-003: เมื่อ API คืนค่า 401/403 ระบบเปลี่ยนเส้นทางไปหน้าแรกพร้อมพารามิเตอร์เข้าสู่ระบบและ redirect เดิม', () => {
    cy.intercept('GET', API_EVENT_1, { statusCode: 401, body: 'unauth' }).as('getEvent401');
    cy.visit(DETAIL_PATH);
    cy.wait('@getEvent401');

    cy.location().should((loc) => {
      expect(loc.pathname).to.eq('/');
      expect(loc.search).to.match(/login=1/);
      expect(decodeURIComponent(loc.search)).to.match(/redirect=\/event\/1$/);
    });
  });

  it('DET-004: แสดงผังที่นั่ง เปิดหน้าต่างแสดงผังแบบขยายได้ และปิดได้', () => {
    cy.intercept('GET', API_EVENT_1, { statusCode: 200, body: fxEvent }).as('getEvent');
    cy.visit(DETAIL_PATH);
    cy.wait('@getEvent');

    cy.get('img.seatmap')
      .should('have.attr', 'src', fxEvent.seatmapImageUrl)
      .click();

    cy.get('.modal-backdrop .modal-content').should('be.visible');
    cy.get('.modal-content .modal-img').should('have.attr', 'src', fxEvent.seatmapImageUrl);
    cy.get('.modal-content .modal-close').click();
    cy.get('.modal-backdrop').should('not.exist');
  });

  // ✅ DET-005: ไม่มีผัง
  it('DET-005: ไม่มีผังที่นั่ง ระบบแสดงสถานะไม่มีผังและไม่แสดงภาพผัง', () => {
    cy.intercept('GET', API_EVENT_1, { statusCode: 200, body: fxNoSeatmap }).as('getEvent');
    cy.intercept('GET', API_EVENT_1_VIEW, { statusCode: 200, body: fxNoSeatmap }).as('getEventView');

    cy.visit(DETAIL_PATH);
    cy.wait('@getEvent');
    cy.wait('@getEventView');

    cy.get('img.seatmap').should('not.exist');
    cy.get('.stage-card').should('have.class', 'noimg');
  });

  it('DET-006: ปุ่ม "เลือกรอบ/ประเภทบัตร" เลื่อนหน้าไปยังส่วนผังการแสดง', () => {
    cy.intercept('GET', API_EVENT_1, { statusCode: 200, body: fxEvent }).as('getEvent');
    cy.visit(DETAIL_PATH);
    cy.wait('@getEvent');

    cy.window().then((win) => {
      const before = win.scrollY;
      cy.contains('button.choose-btn', 'เลือกรอบ/ประเภทบัตร').click();
      cy.get('#stage-section').then(($el) => {
        const top = $el[0].getBoundingClientRect().top;
        expect(win.scrollY > before || top < 140).to.be.true;
      });
    });
  });

  // ✅ DET-007: ปุ่มเวลา + Session Storage
  it('DET-007: ปุ่มเวลาในตารางนำทางไปหน้าแผน/เลือกประเภทบัตร และบันทึก eventLite ลง Session Storage', () => {
    cy.intercept('GET', API_EVENT_1, { statusCode: 200, body: fxEvent }).as('getEvent');
    cy.intercept('GET', API_EVENT_1_VIEW, {
      statusCode: 200,
      body: {
        id: 1,
        startDate: fxEvent.startDate,
        sessions: [
          { id: 100, start_time: '19:00' },
          { id: 101, start_time: '21:00' },
        ],
      },
    }).as('getView');

    cy.intercept('GET', '**/api/me', { statusCode: 200, body: { id: 9, role: 'USER' } }).as('getMe');

    cy.visit(DETAIL_PATH);
    cy.wait('@getEvent');
    cy.wait('@getView');

    cy.get('.date-table', { timeout: 10000 }).should('exist').scrollIntoView();
    cy.get('button.time-pill', { timeout: 10000 }).should('have.length.at.least', 1);
    cy.get('button.time-pill').first().click({ force: true });

    cy.location().should((loc) => {
      const directPlan = PLAN_PATH_RE.test(loc.pathname);
      const redirected =
        loc.pathname === '/' &&
        /(?:\?|&)login=1(?:&|$)/.test(loc.search) &&
        /redirect=\/event\/1\/(plan|seat[-_]?zone|select)/i.test(decodeURIComponent(loc.search));
      expect(directPlan || redirected).to.be.true;
    });

    cy.window().then((win) => {
      const raw = win.sessionStorage.getItem('eventLite:1');
      expect(raw).to.be.a('string').and.not.empty;

      const lite = JSON.parse(raw);
      expect(String(lite.id)).to.eq('1');
      expect(lite.title).to.eq(fxEvent.title);
      expect(lite.location).to.eq(fxEvent.location);
      expect(lite.posterImageUrl).to.be.a('string').and.not.empty;
      expect(lite.seatmapImageUrl).to.be.a('string');
      if (lite.doorOpenTime) expect(lite.doorOpenTime).to.match(/^\d{2}:\d{2}$/);
    });
  });
});
