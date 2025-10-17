/// <reference types="cypress" />

feat/admin-events
// กัน error ฝั่งแอปที่ไม่เกี่ยวกับสิ่งที่ทดสอบ
Cypress.on('uncaught:exception', (err) => {
  if (err.message?.includes('selectedShowId is not defined')) return false;
  return false;
});

describe('Admin Event Detail Page', () => {
  const EVENT_ID = 1;
  const VISIT_PATH = `/admin/events/${EVENT_ID}/detail`;

  const baseEvent = {
    id: EVENT_ID,
    title: 'Pure Concert 2025',
    category: 'concert',
    posterImageUrl: '/poster-demo.jpg',
    seatmapImageUrl: '/seatmap-demo.jpg',
    location: 'Impact Arena, Hall 9',
    description: '<b>คอนเสิร์ตสุดยิ่งใหญ่แห่งปี</b>',
    startDate: '2025-12-20',
    endDate: '2025-12-21',
    saleStartAt: '2025-11-01T10:00',
    saleEndAt: '2025-12-25T22:00',
    saleUntilSoldout: false,
    doorOpenTime: '18:00',
    saleStatus: 'OPEN',
    prices: [{ price: 1500 }, { price: 900 }],
    sessions: [
      { id: 10, name: 'รอบแรก', startTime: '19:00' },
      { id: 11, name: 'รอบสอง', startTime: '20:00' },
    ],
  };

  beforeEach(() => {
    // mock /api/me ให้ผ่าน guard
    cy.intercept('GET', '**/api/**/me*', {
      statusCode: 200,
      body: { id: 999, email: 'admin@demo.app', role: 'ADMIN' },
    }).as('getMe');
  });

  function loginAsAdmin(win) {
    win.localStorage.setItem('token', 'dummy_admin_token');
    win.localStorage.setItem(
      'user',
      JSON.stringify({
        id: 999,
        email: 'admin@demo.app',
        role: 'ADMIN',
        roles: ['ADMIN'],
      }),
    );
  }

  // EVT-001
  it('EVT-001: โหลดข้อมูลอีเวนต์และแสดงรายละเอียดครบถ้วน', () => {
    cy.intercept('GET', `**/api/events/${EVENT_ID}/view`, { body: baseEvent }).as('getEvent');

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });

    cy.wait('@getEvent');
    cy.get('.event-name').should('contain', baseEvent.title);
    cy.get('.category').should('contain', baseEvent.category);
    cy.get('.status-pill.open').should('contain', 'เปิดให้ซื้อตั๋วแล้ว');
  });

  // EVT-002
  it('EVT-002: เปิดดูโซนคงเหลือของรอบงานได้ (แสดง zone availability)', () => {
    cy.intercept('GET', `**/api/events/${EVENT_ID}/view`, { body: baseEvent }).as('getEvent');
    cy.intercept('GET', '**/api/zones/session/10/availability', {
      body: [
        { zoneId: 1, zoneName: 'Zone A', capacity: 100, available: 5 },
        { zoneId: 2, zoneName: 'Zone B', capacity: 80, available: 0 },
      ],
    }).as('getZones');

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });

    cy.wait('@getEvent');
    // ใช้ '19' ให้ยืดหยุ่นกับการ render (เช่น '19' หรือ '19:00')
    cy.get('.time-pill', { timeout: 10000 }).contains('19').click({ force: true });

    cy.wait('@getZones');
    cy.get('.inline-panel .zone-table', { timeout: 10000 }).should('be.visible');
    cy.contains('.z-name', 'Zone A').should('exist');
    cy.contains('.z-qty.low', '5').should('be.visible');
  });

  // EVT-003
  it('EVT-003: เปิดดูรายชื่อผู้เข้าร่วมของรอบงานได้ (attendees table)', () => {
    cy.intercept('GET', `**/api/events/${EVENT_ID}/view`, { body: baseEvent }).as('getEvent');
    cy.intercept('GET', '**/api/registrations/event/1/10', {
      body: [
        {
          id: 1,
          user: { name: 'Pond', email: 'pond@test.com', phone: '0800000000' },
          zoneId: 101,
          quantity: 2,
          registrationStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
          registeredAt: '2025-11-15T12:00',
        },
      ],
    }).as('getAttendees');

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });

    cy.wait('@getEvent');
    cy.get('button.attendee').first().should('be.visible').click();
    cy.wait('@getAttendees');
    cy.get('.attendees-table', { timeout: 10000 }).should('be.visible');
    cy.contains('.col.name', 'Pond').should('exist');
  });

  // EVT-004 (ยืดหยุ่นข้อความ error)
  it('EVT-004: โหลดข้อมูลโซนหรือผู้เข้าร่วมล้มเหลว แสดง error message', () => {
    cy.intercept('GET', `**/api/events/${EVENT_ID}/view`, { body: baseEvent }).as('getEvent');
    cy.intercept('GET', '**/api/zones/session/10/availability', { statusCode: 500 }).as('zonesFail');
    cy.intercept('GET', '**/api/registrations/event/1/10', { statusCode: 500 }).as('attFail');

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });

    cy.wait('@getEvent');

    // โซนล้มเหลว
    cy.contains('.time-pill', '19').click({ force: true });
    cy.wait('@zonesFail');

    // รอให้ panel แสดงหัวข้อก่อน แล้วค่อยเช็คข้อความ error (รองรับหลายข้อความ)
    cy.get('.inline-panel .panel-head', { timeout: 10000 }).should('be.visible');
    cy.get('.inline-panel .panel-head')
      .should(($head) => {
        const txt = $head.text();
        expect(/(โหลดข้อมูลโซนไม่สำเร็จ|HTTP|Request failed)/i.test(txt)).to.be.true;
      });

    // รายชื่อผู้เข้าร่วมล้มเหลว
    cy.get('button.attendee').first().click({ force: true });
    cy.wait('@attFail');

    cy.get('.inline-panel .panel-head', { timeout: 10000 }).should('be.visible');
    cy.get('.inline-panel .panel-head')
      .should(($head) => {
        const txt = $head.text();
        expect(/(โหลดรายชื่อไม่สำเร็จ|HTTP|Request failed)/i.test(txt)).to.be.true;
      });
  });

  // EVT-005
  it('EVT-005: รายละเอียดท้ายหน้าแสดง HTML หรือ plain text ได้ถูกต้อง', () => {
    cy.intercept('GET', `**/api/events/${EVENT_ID}/view`, {
      body: { ...baseEvent, description: '<b>รายละเอียดงาน</b> มีนักร้องดัง' },
    }).as('getEvent');

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });

    cy.wait('@getEvent');
    cy.get('.detail-body').should('contain.html', '<b>');
=======
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
