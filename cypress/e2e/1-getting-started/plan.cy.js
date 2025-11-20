// cypress/e2e/1-getting-started/plan.cy.js
/// <reference types="cypress" />

const EVENT_ID = 101;

// ❗ ให้ใช้ path ให้ตรงกับ router จริงของหน้าแผนที่นั่ง
// ถ้า router เป็น path: '/event/:id/plan' → ใช้แบบนี้
const PLAN_PATH = `/event/${EVENT_ID}/plan`;
// ถ้าของจริงไม่ใช่แบบนี้ ให้เปลี่ยนเฉพาะบรรทัดนี้ให้ตรง URL ที่เปิดหน้าได้จริง

const fxEventDetail = {
  id: EVENT_ID,
  title: 'MARIAH CAREY The Celebration of Mimi',
  posterImageUrl: '/images/mariah.jpg',
  seatmapImageUrl: '/images/seatmap-mariah.png',
  status: 'OPEN',
  sessions: [
    {
      id: 1001,
      name: 'Sat 11 Oct 2025 20:00',
      startAt: '2025-10-11T20:00:00',
      startTime: '20:00'
    }
  ],
};

const fxAvail = [
  { zoneName: 'A1', available: 120 },
  { zoneName: 'B1', available: 0 },
];

describe('PLAN - ดูผังและเลือกประเภทที่นั่ง', () => {
  beforeEach(() => {
    // ดักทุก request GET /api/events/{id}
    cy.intercept('GET', '**/api/events/*', {
      statusCode: 200,
      body: fxEventDetail,
    }).as('getEventDetail');
  });

  it('PLAN-001: โหลดหน้าผังที่นั่ง แสดงโปสเตอร์ ชื่ออีเวนต์ รอบการแสดง และ seatmap', () => {
    cy.visit(PLAN_PATH);
    cy.wait('@getEventDetail');

    cy.get('.plan-page').should('exist');

    cy.get('.hero-card .poster')
      .should('have.attr', 'src')
      .and('include', fxEventDetail.posterImageUrl);

    cy.contains('.event-title', fxEventDetail.title).should('exist');

    cy.get('select#show')
      .should('exist')
      .find('option')
      .should('have.length.at.least', 1);

    cy.get('.seatmap-img')
      .should('have.attr', 'src')
      .and('include', fxEventDetail.seatmapImageUrl);

    cy.contains('button', 'ย้อนกลับ').should('exist');
    cy.contains('button', 'ถัดไป').should('exist');
  });

  it('PLAN-002: กดปุ่ม "ที่นั่งว่าง" แล้วแสดงโมดัลโซนที่นั่งจาก API availability', () => {
    cy.intercept('GET', '**/api/zones/session/*/availability', {
      statusCode: 200,
      body: fxAvail,
    }).as('getAvail');

    cy.visit(PLAN_PATH);
    cy.wait('@getEventDetail');

    cy.contains('button', 'ที่นั่งว่าง').click();

    cy.get('.avail-card').should('exist');

    cy.wait('@getAvail');

    cy.contains('.avail-card .row .zone', 'A1').should('exist');
    cy.contains('.avail-card .row .zone', 'B1').should('exist');

    cy.get('.avail-card .close').click();
    cy.get('.avail-card').should('not.exist');
  });

  it('PLAN-003: ถ้าโหลด availability แล้ว error จะแสดงข้อความ "โหลดไม่สำเร็จ"', () => {
    cy.intercept('GET', '**/api/zones/session/*/availability', {
      statusCode: 500,
      body: {},
    }).as('getAvailError');

    cy.visit(PLAN_PATH);
    cy.wait('@getEventDetail');

    cy.contains('button', 'ที่นั่งว่าง').click();
    cy.wait('@getAvailError');

    cy.contains('โหลดไม่สำเร็จ').should('exist');
  });

  it('PLAN-004: กดปุ่ม "ถัดไป" แล้วไปหน้า seat-zone ของอีเวนต์นั้น', () => {
    cy.visit(PLAN_PATH);
    cy.wait('@getEventDetail');

    cy.contains('button', 'ถัดไป').click();

    cy.location().should((loc) => {
      expect(loc.pathname).to.match(/seat-zone/);
      expect(loc.pathname).to.include(String(EVENT_ID));
    });
  });

  it('PLAN-005: ถ้าอีเวนต์ไม่มี seatmap จะ redirect ไป seat-zone ทันที', () => {
    const fxNoSeatmap = {
      ...fxEventDetail,
      seatmapImageUrl: '',
    };

    cy.intercept('GET', '**/api/events/*', {
      statusCode: 200,
      body: fxNoSeatmap,
    }).as('getEventNoSeat');

    cy.visit(PLAN_PATH);
    cy.wait('@getEventNoSeat');

    cy.location().should((loc) => {
      expect(loc.pathname).to.match(/seat-zone/);
      expect(loc.pathname).to.include(String(EVENT_ID));
    });
  });
});
