// cypress/e2e/event-detail.cy.js
/// <reference types="cypress" />

const DETAIL_PATH = '/event/1';
const API_EVENT_1 = '**/api/events/1';

// ปลายทางหลังเลือกเวลา: แผน/เลือกที่นั่ง (ยืดหยุ่นชื่อเส้นทาง)
const PLAN_PATH_RE = /\/event\/1\/(plan|seat[-_]?zone|select)/i;

// ชุดข้อมูลปกติ
const fxEvent = {
  id: 1,
  title: 'MARIAH CAREY The Celebration of Mimi',
  category: 'concert',
  startDate: '2025-10-28',
  location: 'Impact Arena',
  doorOpenTime: '20:00',
  // ไม่กำหนด priceText เพื่อทดสอบ buildPriceText()
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

// กรณีไม่มีผัง
const fxNoSeatmap = {
  ...fxEvent,
  seatmapImageUrl: '',
};

Cypress.on('uncaught:exception', () => false);

describe('Event Detail – E2E', () => {
  beforeEach(() => {
    // ปิด guard login (กรณีโปรเจ็กต์มี /api/me ฝังใน layout)
    cy.intercept('GET', '**/api/me', {
      statusCode: 200,
      body: { id: 9, email: 'user@example.com', role: 'USER' },
    }).as('getMe');
  });

  it('DET-001: โหลดข้อมูลสำเร็จและแสดงหัวข้อ โปสเตอร์ รายละเอียดเบื้องต้น พร้อมราคาที่คำนวณจากโซน', () => {
    cy.intercept('GET', API_EVENT_1, { statusCode: 200, body: fxEvent }).as('getEvent');

    cy.visit(DETAIL_PATH);
    cy.wait('@getEvent');

    // หัวเรื่อง + โปสเตอร์
    cy.get('.main-info .title').should('contain.text', fxEvent.title);
    cy.get('img.poster').should('have.attr', 'src', fxEvent.posterImageUrl);

    // รายละเอียด fact
    cy.contains('.fact-list .label', 'วันที่แสดง').siblings('.val').should('contain.text', '2568'); // ปีไทย
    cy.contains('.fact-list .label', 'สถานที่แสดง').siblings('.val').should('contain.text', fxEvent.location);
    cy.contains('.fact-list .label', 'ประตูเปิด').siblings('.val').should('contain.text', '20:00');

    // ราคาบัตร (มาจาก buildPriceText) — ควรมี 5500/3500/2500 บาท (รูปแบบไทย)
    cy.get('.price-box .price-text')
      .invoke('text')
      .then((t) => {
        const clean = t.replace(/\s+/g, ' ');
        expect(clean).to.match(/5,?500/);
        expect(clean).to.match(/3,?500/);
        expect(clean).to.match(/2,?500/);
        expect(clean).to.match(/บาท|THB/i);
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

    cy.get('img.seatmap').should('have.attr', 'src', fxEvent.seatmapImageUrl).click();
    cy.get('.modal-backdrop .modal-content').should('be.visible');
    cy.get('.modal-content .modal-img').should('have.attr', 'src', fxEvent.seatmapImageUrl);
    cy.get('.modal-content .modal-close').click();
    cy.get('.modal-backdrop').should('not.exist');
  });

  it('DET-005: ไม่มีผังที่นั่ง ระบบแสดงป้าย "งานนี้ไม่ได้ระบุผัง" และไม่แสดงภาพผัง', () => {
    cy.intercept('GET', API_EVENT_1, { statusCode: 200, body: fxNoSeatmap }).as('getEvent');
    cy.visit(DETAIL_PATH);
    cy.wait('@getEvent');

    cy.get('img.seatmap').should('not.exist');
    cy.contains('.no-seatmap-banner', 'งานนี้ไม่ได้ระบุผัง').should('be.visible');
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

it('DET-007: ปุ่มเวลาในตารางนำทางไปหน้าแผน/เลือกประเภทบัตร และบันทึก eventLite ลง Session Storage', () => {
  cy.intercept('GET', API_EVENT_1, { statusCode: 200, body: fxEvent }).as('getEvent');
  // กันกรณี route ปลายทางมี guard เรียก /api/me อีก
  cy.intercept('GET', '**/api/me', { statusCode: 200, body: { id: 9, role: 'USER' } }).as('getMe');

  cy.visit(DETAIL_PATH);
  cy.wait('@getEvent');

  // รอ section ตารางขึ้นก่อน
  cy.get('.date-table', { timeout: 10000 }).should('exist').scrollIntoView();

  // ปุ่มอาจแสดง "20:00 น." -> normalize แล้วคลิก
  cy.get('button.time-pill', { timeout: 10000 })
    .should('exist')
    .should(($btn) => {
      const txt = $btn.text().replace(/\s+/g, ' ').trim().replace(' น.', '');
      expect(txt).to.contain('20:00');
    })
    .click({ force: true });

  // ✅ ยอมรับทั้งเข้าเพจแผนโดยตรง หรือโดน redirect guard ไปหน้าแรกพร้อมพารามิเตอร์ถูกต้อง
  cy.location().should((loc) => {
    const directPlan = PLAN_PATH_RE.test(loc.pathname);
    const redirected =
      loc.pathname === '/' &&
      /(?:\?|&)login=1(?:&|$)/.test(loc.search) &&
      /redirect=\/event\/1\/(plan|seat[-_]?zone|select)/i.test(decodeURIComponent(loc.search));

    expect(directPlan || redirected, `navigated to plan or redirected with login flag: ${loc.pathname}${loc.search}`)
      .to.be.true;
  });

  // ตรวจ eventLite ใน Session Storage ว่าบันทึกไว้แล้ว
  cy.window().then((win) => {
    const raw = win.sessionStorage.getItem('eventLite:1');
    expect(raw, 'eventLite:1 stored').to.be.a('string').and.not.empty;

    const lite = JSON.parse(raw);
    expect(String(lite.id)).to.eq('1');                // ยอมรับได้ทั้ง string/number
    expect(lite.title).to.eq(fxEvent.title);
    expect(lite.posterImageUrl).to.be.a('string').and.not.empty;
    expect(lite.seatmapImageUrl).to.be.a('string');     // อาจว่างถ้าไม่มีผัง
    expect(lite.location).to.eq(fxEvent.location);
    expect(lite.doorOpenTime).to.match(/^\d{2}:\d{2}$/);
  });
});


});
