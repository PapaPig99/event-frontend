// cypress/e2e/event.cy.js
/// <reference types="cypress" />

// รองรับทั้ง /api/events และโดเมนเต็ม
const API_EVENTS = '**/api/events*';

// เส้นทางจริงของหน้า list (จาก router + goSearch)
const PAGE_PATH = '/event';

// ข้อมูลจำลองจาก API
const fxEvents = [
  {
    id: 101,
    title: 'MARIAH CAREY The Celebration of Mimi',
    category: 'concert',
    location: 'Impact Arena',
    startDate: '2025-11-01',
    posterImageUrl: '/images/mariah.jpg',
    status: 'OPEN', // ต้องเป็น OPEN ให้ผ่าน filter
  },
  {
    id: 202,
    name: 'Fin & Growth Summit 2025',
    type: 'business',
    venue: 'QSNCC',
    date: '2025-12-10',
    detail_image_url: '/images/fin.jpg',
    status: 'OPEN',
  },
  {
    id: 303,
    title: 'Tech EDU Bootcamp',
    category: 'education',
    location: 'Bangkok',
    startDate: '2026-01-20',
    poster_image_url: '/images/edu.jpg',
    status: 'OPEN',
  },
];

Cypress.on('uncaught:exception', () => false);

describe('รายการอีเวนต์ (Event List) – E2E', () => {
  beforeEach(() => {
    // กัน layout ที่เรียก /api/me
    cy.intercept('GET', '**/api/me', {
      statusCode: 200,
      body: { id: 1, email: 'user@example.com', role: 'USER' },
    }).as('getMe');
  });

  // EL-001: โหลดข้อมูลสำเร็จและเรนเดอร์การ์ดอีเวนต์ตาม API
  it('EL-001: โหลดข้อมูลสำเร็จและเรนเดอร์การ์ดอีเวนต์ตาม API', () => {
    cy.intercept('GET', API_EVENTS, { statusCode: 200, body: fxEvents }).as('getEvents');

    cy.visit(PAGE_PATH);
    cy.wait('@getEvents', { timeout: 15000 });

    cy.contains('MARIAH CAREY The Celebration of Mimi').should('exist');
    cy.contains('Fin & Growth Summit 2025').should('exist');
    cy.contains('Tech EDU Bootcamp').should('exist');
  });

  // EL-002: พิมพ์คำค้นในช่องค้นหา และอัปเดตพารามิเตอร์ q บน URL
  it('EL-002: พิมพ์คำค้นในช่องค้นหา และอัปเดตพารามิเตอร์ q บน URL', () => {
    cy.intercept('GET', API_EVENTS, { statusCode: 200, body: fxEvents }).as('getEvents');

    cy.visit(PAGE_PATH);
    cy.wait('@getEvents');

    cy.get('form.search input[aria-label="ค้นหาอีเว้นท์"]')
      .clear()
      .type('mariah');

    cy.location().its('search').should('contain', 'q=mariah');

    cy.contains('MARIAH CAREY The Celebration of Mimi').should('exist');
    cy.contains('Fin & Growth Summit 2025').should('not.exist');
  });

  // EL-003: คลิกปุ่มหมวด “ธุรกิจและการลงทุน” แล้วกรองผลลัพธ์ถูกต้อง
  it('EL-003: คลิกปุ่มหมวด “ธุรกิจและการลงทุน” แล้วกรองผลลัพธ์ถูกต้อง', () => {
    cy.intercept('GET', API_EVENTS, { statusCode: 200, body: fxEvents }).as('getEvents');

    cy.visit(PAGE_PATH);
    cy.wait('@getEvents');

    cy.contains('button.pill', 'ธุรกิจและการลงทุน').click();
    cy.location().its('search').should('contain', 'cat=business');

    cy.contains('Fin & Growth Summit 2025').should('exist');
    cy.contains('MARIAH CAREY The Celebration of Mimi').should('not.exist');
    cy.contains('Tech EDU Bootcamp').should('not.exist');
  });

  // EL-004: คลิกซ้ำปุ่มหมวดเดิมเพื่อยกเลิกการกรอง (ลบ cat ออก)
  it('EL-004: คลิกซ้ำปุ่มหมวดเดิมเพื่อยกเลิกการกรอง (ลบ cat ออก)', () => {
    cy.intercept('GET', API_EVENTS, { statusCode: 200, body: fxEvents }).as('getEvents');

    cy.visit(`${PAGE_PATH}?cat=business`);
    cy.wait('@getEvents');

    cy.contains('button.pill', 'ธุรกิจและการลงทุน').click(); // toggle off
    cy.location().its('search').should('not.contain', 'cat=');

    cy.contains('Fin & Growth Summit 2025').should('exist');
    cy.contains('MARIAH CAREY The Celebration of Mimi').should('exist');
    cy.contains('Tech EDU Bootcamp').should('exist');
  });

  // EL-005: เปิดหน้าพร้อมพารามิเตอร์ q และ cat ระบบต้องกรองข้อมูลตั้งแต่เริ่มต้น
  it('EL-005: เปิดหน้าพร้อมพารามิเตอร์ q และ cat ระบบต้องกรองข้อมูลตั้งแต่เริ่มต้น', () => {
    cy.intercept('GET', API_EVENTS, { statusCode: 200, body: fxEvents }).as('getEvents');

    cy.visit(`${PAGE_PATH}?q=boot&cat=education`);
    cy.wait('@getEvents');

    cy.contains('Tech EDU Bootcamp').should('exist');
    cy.contains('Fin & Growth Summit 2025').should('not.exist');
    cy.contains('MARIAH CAREY The Celebration of Mimi').should('not.exist');
  });

  // EL-006: ตรวจสอบข้อความ “กำลังโหลด…” แสดงระหว่างเรียก API
it('EL-006: ตรวจสอบข้อความ “กำลังโหลด…” แสดงระหว่างเรียก API', () => {
  // ให้ API /api/events ช้าแบบบังคับ (2.5s)
  cy.intercept('GET', API_EVENTS, {
    delayMs: 2500,
    statusCode: 200,
    body: fxEvents,
  }).as('getEventsSlow');

  cy.visit(PAGE_PATH);

  // ตรวจว่าข้อความขึ้นระหว่างรอ API (มี exist)
  cy.contains('กำลังโหลด…', { timeout: 2000 }).should('exist');

  cy.wait('@getEventsSlow');

  // หลัง API โหลด → loading ต้องหายไป
  cy.contains('กำลังโหลด…').should('not.exist');
});


  // EL-007: เมื่อ API ล้มเหลว ระบบต้องแสดงข้อความ “โหลดข้อมูลไม่สำเร็จ”
  it('EL-007: เมื่อ API ล้มเหลว ระบบต้องแสดงข้อความ “โหลดข้อมูลไม่สำเร็จ”', () => {
    cy.intercept('GET', API_EVENTS, { statusCode: 500, body: 'Server Error' }).as('getEventsFail');

    cy.visit(PAGE_PATH);
    cy.wait('@getEventsFail');

    cy.contains(/โหลดข้อมูลไม่สำเร็จ/i).should('be.visible');
  });

  // EL-008: คลิกการ์ดอีเวนต์แล้วนำทางไปหน้ารายละเอียด /event/:id
  it('EL-008: คลิกการ์ดอีเวนต์แล้วนำทางไปหน้ารายละเอียด /event/:id', () => {
    cy.intercept('GET', API_EVENTS, { statusCode: 200, body: fxEvents }).as('getEvents');

    cy.visit(PAGE_PATH);
    cy.wait('@getEvents');

    const id = 202;
    const title = 'Fin & Growth Summit 2025';

    cy.get('body').then(($body) => {
      const selTestId = `[data-testid="event-card-${id}"]`;
      const selHref1 = `a[href$="/event/${id}"]`;
      const selHref2 = `a[href$="/events/${id}"]`;

      if ($body.find(selTestId).length) {
        cy.get(selTestId).scrollIntoView().click({ force: true });
        return;
      }
      if ($body.find(selHref1).length) {
        cy.get(selHref1).first().scrollIntoView().click({ force: true });
        return;
      }
      if ($body.find(selHref2).length) {
        cy.get(selHref2).first().scrollIntoView().click({ force: true });
        return;
      }

      cy.contains(title)
        .scrollIntoView()
        .then(($t) => {
          const clickable =
            $t.closest('a,button,[role="button"]')[0] ||
            $t
              .closest(
                '[data-testid^="event-card"], .card, article, li, .event-card, .event, .item'
              )[0];

          if (clickable) {
            cy.wrap(clickable).click({ force: true });
          } else {
            cy.wrap($t.parent()[0]).click({ force: true });
          }
        });
    });

    cy.location().should((loc) => {
      const direct1 = /\/event\/202$/.test(loc.pathname);
      const direct2 = /\/events\/202$/.test(loc.pathname);
      const redir =
        loc.pathname === '/' && /redirect=\/?events?\/202/.test(loc.search);
      expect(
        direct1 || direct2 || redir,
        `went to detail: ${loc.pathname}${loc.search}`
      ).to.be.true;
    });
  });

  // EL-009: ค้นหาพร้อมเลือกหมวด URL ต้องคงค่าพารามิเตอร์ทั้งคู่
  it('EL-009: ค้นหาพร้อมเลือกหมวด URL ต้องคงค่าพารามิเตอร์ทั้งคู่', () => {
    cy.intercept('GET', API_EVENTS, { statusCode: 200, body: fxEvents }).as('getEvents');

    cy.visit(PAGE_PATH);
    cy.wait('@getEvents');

    cy.get('form.search input[aria-label="ค้นหาอีเว้นท์"]')
      .clear()
      .type('summit');
    cy.contains('button.pill', 'ธุรกิจและการลงทุน').click();

    cy.location().its('search').should((s) => {
      expect(s).to.contain('q=summit');
      expect(s).to.contain('cat=business');
    });
  });
});
