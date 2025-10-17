/// <reference types="cypress" />

/**
 * ทดสอบหน้า Event details
 * รองรับทั้ง /api/events/:id และ /api/events/:id/view
 * mock availability / attendees ครบ
 */

const baseEvent = {
  id: 1,
  title: 'MARIAH CAREY The Celebration of Mimi',
  category: 'concert',
  posterImageUrl: '/images/poster.jpg',
  detailImageUrl: null,
  seatmapImageUrl: '/images/seatmap.jpg',
  location: 'Impact Arena',
  description: '<p>Only one night!</p>',
  startDate: '2025-10-28',
  endDate: '2025-10-29',
  saleStartAt: '2025-10-19T10:00:00',
  saleEndAt: '2025-10-25T18:00:00',
  saleUntilSoldout: false,
  doorOpenTime: '17:00',
  saleStatus: 'OPEN',
  prices: [{ price: 5500 }, { price: 3500 }, { price: 1500 }],
  sessions: [
    { id: 1, name: 'Day 1', startTime: '18:00:00' },
    { id: 2, name: 'Day 2', startTime: '19:30:00' },
  ],
  zones: [
    { id: 201, name: 'Zone A', capacity: 100, price: 5500 },
    { id: 202, name: 'Zone B', capacity: 200, price: 3500 },
  ],
};

// === Helper intercepts ===
function interceptView(overrides = {}) {
  const body = { ...baseEvent, ...overrides };

  // intercept ทั้ง /view และปกติ
  cy.intercept('GET', '**/api/events/*/view', { statusCode: 200, body });
  cy.intercept('GET', '**/api/events/*', { statusCode: 200, body }).as('getEventView');
}

function interceptZonesWildcard(defaultBody = []) {
  cy.intercept('GET', '**/api/zones/session/*/availability', {
    statusCode: 200,
    body: defaultBody,
  }).as('getZonesAny');
}

function interceptAttendees(eventId, sessionId, attendees = []) {
  cy.intercept(
    'GET',
    `**/registrations/event/${eventId}/${sessionId}`,
    { statusCode: 200, body: attendees }
  ).as(`getAttendees-${sessionId}`);
}

// === MAIN TEST ===
describe('Event details page', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    // ต้อง intercept ก่อน visit เสมอ
    interceptView();
    interceptZonesWildcard([]); // กันหน้า fetch zone เองตั้งแต่ mount

    cy.visit('/event/1');
    cy.wait('@getEventView'); // คราวนี้จะชนแน่นอน
  });

  it('DET-001: โหลดข้อมูลแล้วแสดง Title, Venue, Sessions, Sale period ถูกต้อง', () => {
    cy.get('.event-name').should('contain', baseEvent.title);
    cy.get('.place').should('contain', baseEvent.location);

    const expectedShow = baseEvent.sessions.map(s => s.name).join(' / ');
    cy.contains('.info-item .label', 'วันที่เริ่มงาน')
      .parent()
      .find('.value')
      .should('contain', expectedShow);

    cy.contains('.info-item .label', 'วันเปิดจำหน่าย')
      .parent()
      .find('.value')
      .should('contain', 'ถึง');
  });

  it('DET-002: แสดงราคาเรียงจากมากไปน้อยและคั่นด้วย " / "', () => {
    interceptView({ prices: [{ price: 1000 }, { price: 5000 }, { price: 2500 }] });
    cy.visit('/event/1');
    cy.wait('@getEventView');

    const prices = [5000, 2500, 1000].map(n => n.toLocaleString());
    cy.get('.price-line').should('contain', prices.join(' / '));
  });

  it('DET-003: Ticket Status แสดงข้อความและ class ถูกต้อง (UPCOMING/OPEN/CLOSED)', () => {
    interceptView({ saleStatus: 'UPCOMING' });
    cy.visit('/event/1');
    cy.wait('@getEventView');
    cy.get('.status-pill').should('have.class', 'soon').and('contain', 'เร็ว ๆ นี้');

    interceptView({ saleStatus: 'OPEN' });
    cy.visit('/event/1');
    cy.wait('@getEventView');
    cy.get('.status-pill').should('have.class', 'open').and('contain', 'เปิดให้ซื้อตั๋วแล้ว');

    interceptView({ saleStatus: 'CLOSED' });
    cy.visit('/event/1');
    cy.wait('@getEventView');
    cy.get('.status-pill').should('have.class', 'closed').and('contain', 'ปิดการขายแล้ว');
  });

  it('DET-004: กดปุ่มเวลาเพื่อดู "โซนคงเหลือ" แล้วโหลด availability มาแสดง', () => {
    interceptView();
    interceptZonesWildcard([]);
    cy.intercept('GET', '**/api/zones/session/1/availability', {
      statusCode: 200,
      body: [
        { zoneId: 201, zoneName: 'Zone A', capacity: 100, available: 40 },
        { zoneId: 202, zoneName: 'Zone B', capacity: 200, available: 5 },
        { zoneId: 203, zoneName: 'Zone C', capacity: 150, available: 0 },
      ],
    }).as('getZones-1');

    cy.visit('/event/1');
    cy.wait('@getEventView');

    cy.get('.session-block').first().within(() => {
      cy.get('.time-pill').click();
    });
    cy.wait('@getZones-1');

    cy.get('.inline-panel .z-row').should('have.length', 3);
    cy.contains('.z-row', 'Zone A').find('.z-qty').should('have.class', 'ok').and('contain', '40');
    cy.contains('.z-row', 'Zone B').find('.z-qty').should('have.class', 'low').and('contain', '5');
    cy.contains('.z-row', 'Zone C').find('.z-qty').should('have.class', 'soldout').and('contain', '0');
  });

  it('DET-005: กด "รายชื่อผู้เข้าร่วม" แล้วดึงรายการมาแสดง', () => {
    interceptView();
    interceptZonesWildcard([]);
    interceptAttendees(1, 1, [
      {
        id: 'R-01',
        user: { name: 'Alice', email: 'alice@example.com', phone: '0811111111' },
        zoneId: 201,
        quantity: 2,
        registrationStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        registeredAt: '2025-10-20T12:34:00',
        paymentReference: 'PAY-AAA',
      },
      {
        id: 'R-02',
        user: { name: 'Bob', email: 'bob@example.com', phone: '0822222222' },
        zoneId: 202,
        quantity: 1,
        registrationStatus: 'HOLD',
        paymentStatus: 'UNPAID',
        registeredAt: '2025-10-20T13:00:00',
        paymentReference: 'PAY-BBB',
      },
    ]);

    cy.visit('/event/1');
    cy.wait('@getEventView');

    cy.get('.session-block').first().within(() => {
      cy.contains('button.btn.attendee', 'รายชื่อผู้เข้าร่วม').click();
    });
    cy.wait('@getAttendees-1');

    cy.get('.attendees-table .t-row').should('have.length', 2);
    cy.contains('.t-row', 'Alice').within(() => {
      cy.get('.status-chip').eq(0).should('have.class', 'ok');
      cy.get('.status-chip').eq(1).should('have.class', 'ok');
    });
    cy.contains('.t-row', 'Bob').within(() => {
      cy.get('.status-chip').eq(0).should('have.class', 'warn');
      cy.get('.status-chip').eq(1).should('have.class', 'bad');
    });
  });

  it('DET-006: แสดงข้อความ error เมื่อโหลด availability/attendees ล้มเหลว', () => {
    interceptView();
    cy.intercept('GET', '**/api/zones/session/1/availability', { statusCode: 500 }).as('zonesFail');
    cy.intercept('GET', '**/registrations/event/1/1', { statusCode: 500, body: { message: 'boom' } }).as('attFail');

    cy.visit('/event/1');
    cy.wait('@getEventView');

    cy.get('.session-block').first().within(() => {
      cy.get('.time-pill').click();
    });
    cy.wait('@zonesFail');
    cy.get('.inline-panel .panel-head small').should('contain', 'โหลดข้อมูลโซนไม่สำเร็จ');

    cy.get('.session-block').first().within(() => {
      cy.contains('button.btn.attendee', 'รายชื่อผู้เข้าร่วม').click();
    });
    cy.wait('@attFail');
    cy.get('.inline-panel .panel-head .error').should('exist');
  });
});
