/// <reference types="cypress" />

// ========== 1) ป้องกัน Error จาก Vue runtime ==========
Cypress.on('uncaught:exception', () => false);

// ========== 2) ข้อมูลจำลอง ==========
const buildEvent = () => ({
  id: 1,
  title: "MAJOR CONCERT 2025",
  category: "คอนเสิร์ต",
  posterImageUrl: "https://picsum.photos/seed/poster/600/900",
  seatmapImageUrl: "https://picsum.photos/seed/seat/800/400",
  location: "Impact Arena, Muang Thong Thani",
  description: "<p>คอนเสิร์ตใหญ่ประจำปี</p><ul><li>แขกรับเชิญพิเศษ</li></ul>",
  sessions: [
    { id: 1, name: "ศุกร์ 7 พ.ย. 2025 • 19:00", startTime: "19:00" },
    { id: 2, name: "เสาร์ 8 พ.ย. 2025 • 18:00", startTime: "18:00" },
  ],
  startDate: "2025-11-07",
  endDate: "2025-11-08",
  saleStartAt: "2025-10-25T10:00",
  saleEndAt: "2025-11-06T23:59",
  saleUntilSoldout: false,
  doorOpenTime: "17:00",
  saleStatus: "OPEN",
  prices: [{ price: 4500 }, { price: 3500 }, { price: 2000 }],
});

const zonesBySid = (sid) =>
  sid === 1
    ? [
        { zoneId: 1, zoneName: "VIP A", capacity: 100, available: 7 },
        { zoneId: 2, zoneName: "VIP B", capacity: 120, available: 15 },
      ]
    : [
        { zoneId: 1, zoneName: "VIP A", capacity: 100, available: 0 },
        { zoneId: 2, zoneName: "Standard", capacity: 300, available: 220 },
      ];

const attendeesBySid = (sid) => [
  {
    id: `${sid}-a1`,
    user: { name: "Alice", email: "alice@example.com", phone: "0812345678" },
    zoneId: 1,
    quantity: 2,
    registrationStatus: "CONFIRMED",
    paymentStatus: "PAID",
    registeredAt: "2025-10-26T09:30:00",
    paymentReference: "QR-001-ABC",
  },
];

// ========== 3) Stub Network ==========
function stubNetwork() {
  cy.intercept('GET', '**/api/**/me*', { statusCode: 200, body: { username: 'guest' } }).as('getMe');

  // ✅ รองรับทั้ง /api/events (list) และ /api/events/1/view
  cy.intercept('GET', '**/api/events', { statusCode: 200, body: [buildEvent()] }).as('getEventsList');
  cy.intercept('GET', '**/api/events/1**', { statusCode: 200, body: buildEvent() }).as('getEvent');

  cy.intercept('GET', '**/api/zones/session/**/availability', (req) => {
    const sid = +req.url.match(/session\/(\d+)/)[1];
    req.reply({ statusCode: 200, body: zonesBySid(sid) });
  }).as('getZones');

  cy.intercept('GET', '**/api/registrations/event/**', (req) => {
    const sid = +req.url.match(/event\/\d+\/(\d+)/)[1];
    req.reply({ statusCode: 200, body: attendeesBySid(sid) });
  }).as('getAttendees');
}

// ========== 4) Mount EventDetail โดยไม่แตะซอร์ส ==========
function mountEventDetailDirect() {
  cy.visit('/'); // ✅ ใช้ origin จริงจาก Vite

  cy.window().then((win) => {
    const doc = win.document;
    const mount = doc.createElement('div');
    mount.id = 'cy-mount';
    doc.body.appendChild(mount);

    const script = doc.createElement('script');
    script.type = 'module';
    script.text = `
      import { createApp, h } from '/node_modules/vue/dist/vue.esm-bundler.js';
      import { createRouter, createWebHashHistory, RouterView } from '/node_modules/vue-router/dist/vue-router.esm-bundler.js';
      import EventDetail from '/src/pages/admin/EventDetail.vue';

      const routes = [{ path: '/event/:id', component: EventDetail }];
      const router = createRouter({ history: createWebHashHistory(), routes });

      const Root = { render: () => h(RouterView) };
      const app = createApp(Root);
      app.use(router);

      router.push('/event/1');
      router.isReady().then(() => app.mount('#cy-mount'));
    `;
    doc.body.appendChild(script);
  });

  // ✅ อนุโลมทั้ง getEventsList และ getEvent
  cy.wait(['@getEventsList', '@getEvent'], { timeout: 20000 }).then(() => {
    cy.get('.event-detail-page', { timeout: 20000 }).should('exist');
  });
}

// ========== 5) Test Cases ==========
describe('Admin Event Detail Page (E2E)', () => {
  beforeEach(() => {
    stubNetwork();
  });

  it('แสดงข้อมูลพื้นฐานของอีเวนต์', () => {
    mountEventDetailDirect();

    cy.get('.category').should('contain.text', 'คอนเสิร์ต');
    cy.get('h1.event-name').should('contain.text', 'MAJOR CONCERT 2025');
    cy.contains('.info-item .label', 'สถานที่งาน')
      .parent()
      .should('contain.text', 'Impact Arena');
    cy.contains('.info-item .label', 'ราคาบัตร')
      .parent()
      .invoke('text')
      .should((t) => expect(t).to.match(/4,500/));
  });

  it('กดเวลารอบ แล้วแสดงโซนคงเหลือได้', () => {
    mountEventDetailDirect();

    cy.get('.session-block').first().within(() => {
      cy.get('.time-pill').click();
    });
    cy.wait('@getZones');
    cy.get('.inline-panel .zone-table').should('be.visible');
  });

  it('กดรายชื่อผู้เข้าร่วม แล้วแสดงตารางได้', () => {
    mountEventDetailDirect();

    cy.get('.session-block').eq(1).within(() => {
      cy.contains('button', 'รายชื่อผู้เข้าร่วม').click();
    });
    cy.wait('@getAttendees');
    cy.get('.attendees-table').should('be.visible');
  });

  it('แสดงรายละเอียด description HTML ได้', () => {
    mountEventDetailDirect();

    cy.get('.detail-body').should('exist').and('not.have.class', 'plain');
    cy.get('.detail-body').contains('คอนเสิร์ตใหญ่ประจำปี').should('be.visible');
  });
});
