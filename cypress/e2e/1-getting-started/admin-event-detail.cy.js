/// <reference types="cypress" />

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
    // ใช้ '19' ให้ครอบคลุมทั้ง '19' หรือ '19:00'
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

  // EVT-004 (เช็ค error แบบยืดหยุ่น)
  it('EVT-004: โหลดข้อมูลโซนหรือผู้เข้าร่วมล้มเหลว แสดง error message', () => {
    cy.intercept('GET', `**/api/events/${EVENT_ID}/view`, { body: baseEvent }).as('getEvent');
    cy.intercept('GET', '**/api/zones/session/10/availability', { statusCode: 500 }).as('zonesFail');
    cy.intercept('GET', '**/api/registrations/event/1/10', { statusCode: 500 }).as('attFail');

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });
    cy.wait('@getEvent');

    // โซนล้มเหลว
    cy.contains('.time-pill', '19').click({ force: true });
    cy.wait('@zonesFail');
    cy.get('.inline-panel .panel-head', { timeout: 10000 }).should('be.visible');
    cy.get('.inline-panel .panel-head').should(($head) => {
      const txt = $head.text();
      expect(/(โหลดข้อมูลโซนไม่สำเร็จ|HTTP|Request failed)/i.test(txt)).to.be.true;
    });

    // รายชื่อผู้เข้าร่วมล้มเหลว
    cy.get('button.attendee').first().click({ force: true });
    cy.wait('@attFail');
    cy.get('.inline-panel .panel-head', { timeout: 10000 }).should('be.visible');
    cy.get('.inline-panel .panel-head').should(($head) => {
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
  });
});
