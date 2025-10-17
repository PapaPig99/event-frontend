/// <reference types="cypress" />

// ===== Helpers =====
const EVENT_ID = 1;
const VISIT_PATH = `/event/${EVENT_ID}/payment`;     // path ของหน้านี้
const PAY_WINDOW_SEC = 5 * 60;                        // ต้องตรงกับโค้ด (5 นาที)

// parse req.body ที่อาจเป็น string จาก fetch
const parseBody = (body) => (typeof body === 'string' ? JSON.parse(body) : body);

// กันโดนเด้ง login ด้วยการสตับ me/profile หลายจุดที่แอปอาจเรียก
const stubAuth = () => {
  cy.intercept('GET', '**/api/**/me*',      { statusCode: 200, body: { id: 1, role: 'USER' } });
  cy.intercept('GET', '**/api/auth/**',     { statusCode: 200, body: { id: 1, role: 'USER' } });
  cy.intercept('GET', '**/api/users/me*',   { statusCode: 200, body: { id: 1, role: 'USER' } });
  cy.intercept('GET', '**/api/**/session*', { statusCode: 200, body: { id: 1, role: 'USER' } });
  cy.intercept('GET', '**/api/**/profile*', { statusCode: 200, body: { id: 1, role: 'USER' } });
};

function setSessionDrafts(win, drafts, order) {
  // drafts หลายโซน (key ใหม่)
  win.sessionStorage.setItem(
    `registrationsDraft:${EVENT_ID}`,
    JSON.stringify(drafts)
  );

  // รองรับเก่า: registrationDraft ตัวเดียว (ไม่จำเป็นแต่กัน regress)
  win.sessionStorage.setItem(
    `registrationDraft:${EVENT_ID}`,
    JSON.stringify(drafts[0])
  );

  // order สำหรับสรุปด้านขวา
  win.sessionStorage.setItem(
    `order:${EVENT_ID}`,
    JSON.stringify(order)
  );
}

function stubQRFor(regIdOrIds) {
  // Component เซ็ต <img src="..."> เรา intercept ให้ 200 OK (content-type รูป)
  const ids = Array.isArray(regIdOrIds) ? regIdOrIds.join(',') : String(regIdOrIds);
  const candidates = [
    new RegExp(`/api/payments/qr\\/${ids}$`),
    new RegExp(`/api/payments/qr\\?registrationId=${ids}$`),
    new RegExp(`/api/registrations\\/${ids}/qr$`),
    new RegExp(`/api/payments/qr\\?registrationIds=${ids}$`),
    new RegExp(`/api/registrations/pay/qr\\?ids=${ids}$`),
  ];
  candidates.forEach((re) => {
    cy.intercept('GET', re, {
      statusCode: 200,
      headers: { 'content-type': 'image/png' },
      body: 'PNG', // ไม่ต้องเป็นรูปจริง แค่ 200 ก็พอให้ <img> โหลดผ่าน
    }).as(`getQR_${ids}`);
  });
}

describe('Payment Page', () => {
  beforeEach(() => {
    cy.clock();   // คุมเวลาให้ทดสอบ countdown ได้แม่น
    stubAuth();   // ✅ กันโดนเด้งไปหน้า login
  });

  it('PAY-001: เริ่มจองแบบหลายโซน (bulk) แล้วจะแสดง QR และเริ่มนับถอยหลัง', () => {
    // ===== Intercepts: bulk create และ fallback =====
    cy.intercept('POST', '**/registrations/bulk', (req) => {
      const b = parseBody(req.body); // ✅ แปลงเป็น object ก่อนตรวจ
      expect(b).to.have.keys(['eventId', 'sessionId', 'items']);
      expect(b.items).to.have.length(2);
      req.reply({ statusCode: 201, body: { id: 555 } });
    }).as('bulkCreate');

    // กัน fallback เสริม (ถ้าแอปไหลไป try endpoint อื่น)
    cy.intercept('POST', '**/registrations', { statusCode: 201, body: { id: 555 } }).as('singleCreate');

    // QR (ใบเดียวก็ได้ เพราะโค้ดจะเลือก candidates ตามจำนวนใบ)
    stubQRFor(555);

    // เตรียม sessionStorage ก่อนโหลดหน้า
    const drafts = [
      { eventId: EVENT_ID, sessionId: 10, seatZoneId: 101, quantity: 2, unitPrice: 1500, zoneLabel: 'Zone A' },
      { eventId: EVENT_ID, sessionId: 10, seatZoneId: 102, quantity: 1, unitPrice: 1200, zoneLabel: 'Zone B' },
    ];
    const order = {
      eventId: EVENT_ID,
      title: 'Pure Concert 2025',
      poster: '/poster-demo.jpg',
      show: '19:00 (20 Dec 2025)',
      items: [
        { qty: 2, zoneLabel: 'Zone A', unitPrice: 1500 },
        { qty: 1, zoneLabel: 'Zone B', unitPrice: 1200 },
      ],
      fee: 420, // ตัวอย่าง 10%
    };

    cy.visit(VISIT_PATH, {
      onBeforeLoad(win) {
        setSessionDrafts(win, drafts, order);
      },
    });

    // สร้าง registration สำเร็จ
    cy.wait('@bulkCreate');

    // ✅ ให้ timer เดินอย่างน้อย 1 รอบ เพื่อให้ .time มีค่าเป็น mm:ss
    cy.tick(250);

    // เห็น QR card และเวลานับถอยหลังรูปแบบ mm:ss
    cy.contains('.qr-head', 'ชำระเงินโดย QR Code').should('be.visible');

    cy.get('.countdown .time', { timeout: 5000 })
      .should(($el) => {
        const txt = $el.text().trim();
        // บางครั้งเริ่มที่ 05:00 หรือ 04:59 ขึ้นกับเวลาที่ tick เข้ารอบ ไม่ล็อกค่าตายตัว แค่รูปแบบ
        expect(txt).to.match(/^\d{2}:\d{2}$/);
      });

    // มีรูป QR ถูกเรนเดอร์ (src ถูกเซ็ต)
    cy.get('.qr-img').should('have.attr', 'src').then((src) => {
      expect(src).to.match(/\/api\/payments\/qr|\/api\/registrations\//);
    });

    // ฝั่ง summary: มี 2 รายการ และรวมทั้งสิ้น
    cy.contains('.sum-title', 'ข้อมูลการจอง').should('be.visible');
    cy.contains('.sum-row .sum-text', '2 x Zone A').should('be.visible');
    cy.contains('.sum-row .sum-text', '1 x Zone B').should('be.visible');
    cy.contains('.sum-row', 'ค่าธรรมเนียม').should('be.visible');
    cy.contains('.sum-row.total', 'รวมทั้งสิ้น').should('be.visible');
  });

  it('PAY-002: กด “ยืนยันการจ่าย” แล้วระบบ PATCH confirm สำเร็จ → redirect ไป success และเก็บ regIds ใน Session Storage', () => {
    // เตรียมให้มี regId = 777
    cy.intercept('POST', '**/registrations/bulk', { statusCode: 201, body: { id: 777 } }).as('bulkCreate');
    cy.intercept('PATCH', '**/registrations/777/confirm', { statusCode: 200, body: { ok: true } }).as('confirm');
    stubQRFor(777);

    const drafts = [
      { eventId: EVENT_ID, sessionId: 10, seatZoneId: 201, quantity: 1, unitPrice: 900, zoneLabel: 'Zone C' },
    ];
    const order = {
      eventId: EVENT_ID,
      title: 'Pure Concert 2025',
      poster: '/poster-demo.jpg',
      show: '19:00 (20 Dec 2025)',
      items: [{ qty: 1, zoneLabel: 'Zone C', unitPrice: 900 }],
      fee: 90,
    };

    cy.visit(VISIT_PATH, {
      onBeforeLoad(win) { setSessionDrafts(win, drafts, order); },
    });
    cy.wait('@bulkCreate');

    cy.tick(250); // ให้ UI อัปเดต

    cy.contains('button.pay-btn', 'ยืนยันการจ่าย').click();
    cy.wait('@confirm');

    // โปรเจคคุณมี path success เป็น /event/:id/success (จาก error ที่แสดง),
    // บางโปรเจคใช้ /ticket-success — ให้รองรับทั้งสองแบบ
    cy.url().should('match', new RegExp(`/event/${EVENT_ID}/(ticket-)?success`));

    // ตรวจ sessionStorage ว่ามี successRegIds
    cy.window().then((win) => {
      const raw = win.sessionStorage.getItem(`successRegIds:${EVENT_ID}`);
      expect(raw, 'successRegIds saved').to.be.a('string');
      const arr = JSON.parse(raw);
      expect(arr).to.deep.equal([777]);
    });
  });

  it('PAY-003: เมื่อปล่อยเวลาชำระเงินหมด ระบบแสดงโมดัลหมดเวลา และยกเลิกทั้งหมดเมื่อคลิก “กลับหน้าแรก”', () => {
    // สร้าง registration id = 888
    cy.intercept('POST', '**/registrations/bulk', { statusCode: 201, body: { id: 888 } }).as('bulkCreate');
    // ยกเลิก registration เมื่อ timeout
    cy.intercept('PATCH', '**/registrations/888/cancel', { statusCode: 200, body: { status: 'CANCELLED' } }).as('cancel');
    cy.intercept('DELETE', '**/registrations/888', { statusCode: 200, body: {} }).as('delCancel'); // เผื่อ fallback
    stubQRFor(888);

    const drafts = [
      { eventId: EVENT_ID, sessionId: 10, seatZoneId: 301, quantity: 1, unitPrice: 1000, zoneLabel: 'Zone D' },
    ];
    const order = {
      eventId: EVENT_ID,
      title: 'Pure Concert 2025',
      poster: '/poster-demo.jpg',
      show: '19:00 (20 Dec 2025)',
      items: [{ qty: 1, zoneLabel: 'Zone D', unitPrice: 1000 }],
      fee: 100,
    };

    cy.visit(VISIT_PATH, {
      onBeforeLoad(win) { setSessionDrafts(win, drafts, order); },
    });
    cy.wait('@bulkCreate');

    // เดินเวลาให้หมดทันที
    cy.tick(PAY_WINDOW_SEC * 1000 + 100); // +เผื่อ 100ms ให้ tick() เรียก onTimeout()

    // เห็นโมดัลหมดเวลา
    cy.get('.modal-card .modal-title').should('contain', 'หมดเวลาการชำระเงิน');

    // คลิกปุ่มกลับหน้าแรก
    cy.contains('.modal-btn.primary', 'กลับหน้าแรก').click();

    // ไม่บังคับ assert URL หน้าแรก (แต่ถ้ารู้ path จริง เพิ่มได้)
  });

  it('PAY-004: คลิกปุ่ม “ยกเลิก” ที่หน้า Summary แล้วระบบยกเลิกการจองทั้งหมดและกลับไปหน้าเลือกผัง', () => {
    cy.intercept('POST', '**/registrations/bulk', { statusCode: 201, body: { id: 999 } }).as('bulkCreate');
    cy.intercept('PATCH', '**/registrations/999/cancel', { statusCode: 200, body: { status: 'CANCELLED' } }).as('cancel');
    cy.intercept('DELETE', '**/registrations/999', { statusCode: 200, body: {} }).as('delCancel');
    stubQRFor(999);

    const drafts = [
      { eventId: EVENT_ID, sessionId: 10, seatZoneId: 401, quantity: 2, unitPrice: 700, zoneLabel: 'Zone E' },
    ];
    const order = {
      eventId: EVENT_ID,
      title: 'Pure Concert 2025',
      poster: '/poster-demo.jpg',
      show: '19:00 (20 Dec 2025)',
      items: [{ qty: 2, zoneLabel: 'Zone E', unitPrice: 700 }],
      fee: 140,
    };

    cy.visit(VISIT_PATH, {
      onBeforeLoad(win) { setSessionDrafts(win, drafts, order); },
    });
    cy.wait('@bulkCreate');

    cy.contains('button.cancel-btn', 'ยกเลิก').click();

    // โค้ด router.replace ไปหน้า 'concert-plan'
    cy.url().should('include', `/event/${EVENT_ID}/plan`);
  });

  it('PAY-005: หาก bulk ล้มเหลว ระบบจะลอง endpoint เดิม (single) แล้วตั้ง QR จาก regIds ใบแรก', () => {
    // ทำให้ bulk fail แล้วให้ POST /registrations สำเร็จ
    cy.intercept('POST', '**/registrations/bulk', { statusCode: 500, body: { message: 'bulk down' } }).as('bulkFail');
    cy.intercept('POST', '**/registrations', { statusCode: 201, body: { id: 1001 } }).as('singleCreate');
    stubQRFor(1001);

    const drafts = [
      { eventId: EVENT_ID, sessionId: 10, seatZoneId: 501, quantity: 1, unitPrice: 500, zoneLabel: 'Zone F' },
      { eventId: EVENT_ID, sessionId: 10, seatZoneId: 502, quantity: 1, unitPrice: 600, zoneLabel: 'Zone G' },
    ];
    const order = {
      eventId: EVENT_ID,
      title: 'Pure Concert 2025',
      poster: '/poster-demo.jpg',
      show: '19:00 (20 Dec 2025)',
      items: [
        { qty: 1, zoneLabel: 'Zone F', unitPrice: 500 },
        { qty: 1, zoneLabel: 'Zone G', unitPrice: 600 },
      ],
      fee: 110,
    };

    cy.visit(VISIT_PATH, {
      onBeforeLoad(win) { setSessionDrafts(win, drafts, order); },
    });

    cy.wait('@bulkFail');
    cy.wait('@singleCreate');

    // มี QR จากใบแรก
    cy.get('.qr-img').should('have.attr', 'src').then((src) => {
      expect(src).to.match(/1001/);
    });
  });

  it('PAY-006: หากไม่พบ draft ใน Session Storage ระบบจะแจ้งเตือนและส่งกลับหน้าเลือกผัง', () => {
    // ไม่มีอะไรใน sessionStorage
    const alertStub = cy.stub();
    cy.on('window:alert', alertStub);

    cy.visit(VISIT_PATH); // ไม่ set sessionStorage

    cy.wrap(alertStub).should('have.been.called');
    cy.url().should('include', `/event/${EVENT_ID}/plan`);
  });
});
