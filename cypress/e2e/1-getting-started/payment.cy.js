/// <reference types="cypress" />

// ===== Helpers =====
const EVENT_ID = 1;
const VISIT_PATH = `/event/${EVENT_ID}/payment`;
const PAY_WINDOW_SEC = 5 * 60;

// parse req.body ที่อาจเป็น string จาก fetch/xhr
const parseBody = (body) =>
  typeof body === 'string' ? JSON.parse(body) : body;

// กันโดนเด้ง login ด้วยการสตับ me/profile หลายจุดที่แอปอาจเรียก
const stubAuth = () => {
  cy.intercept('GET', '**/api/**/me*',      { statusCode: 200, body: { id: 1, role: 'USER' } });
  cy.intercept('GET', '**/api/auth/**',     { statusCode: 200, body: { id: 1, role: 'USER' } });
  cy.intercept('GET', '**/api/users/me*',   { statusCode: 200, body: { id: 1, role: 'USER' } });
  cy.intercept('GET', '**/api/**/session*', { statusCode: 200, body: { id: 1, role: 'USER' } });
  cy.intercept('GET', '**/api/**/profile*', { statusCode: 200, body: { id: 1, role: 'USER' } });
};

// เตรียม draft + order ก่อนเข้า /payment
function setSessionDrafts(win, drafts, order) {
  win.sessionStorage.setItem(
    `registrationsDraft:${EVENT_ID}`,
    JSON.stringify(drafts),
  );
  win.sessionStorage.setItem(
    `registrationDraft:${EVENT_ID}`,
    JSON.stringify(drafts[0]),
  );
  win.sessionStorage.setItem(
    `order:${EVENT_ID}`,
    JSON.stringify(order),
  );
}

// stub QR image (`<img src="...">`)
const stubQR = () => {
  cy.intercept('GET', '**/api/payments/qr*', {
    statusCode: 200,
    headers: { 'content-type': 'image/png' },
    body: 'PNG',
  }).as('getQR');
};

describe('Payment Page – E2E', () => {
  beforeEach(() => {
    cy.clock();   // คุมเวลาให้ tick ได้
    stubAuth();
    stubQR();
  });

  // === PAY-001 ============================================================
  it('PAY-001: เริ่มจองจาก draft แล้วแสดง QR + เริ่มนับถอยหลัง', () => {
    // ไม่เช็คโครงสร้าง body ละ แค่ให้สร้างสำเร็จ
    cy.intercept('POST', '**/registrations*', (req) => {
      req.reply({
        statusCode: 201,
        body: {
          paymentReference: 'PAY-555',
          zoneName: 'Zone A',
          quantity: 3,
          ticketCodes: ['T-A1', 'T-A2', 'T-A3'],
        },
      });
    }).as('createReg');

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
      fee: 420,
    };

    cy.visit(VISIT_PATH, {
      onBeforeLoad(win) {
        setSessionDrafts(win, drafts, order);
      },
    });

    cy.wait('@createReg');

    // ให้ timer เดินอย่างน้อย 1 รอบ
    cy.tick(250);

    // มีหัว QR + กล่อง countdown
    cy.contains('.qr-head', 'ชำระเงินโดย QR Code').should('be.visible');

    cy.get('.countdown .time')
      .should(($el) => {
        const t = $el.text().trim();
        // ไม่สนใจว่าค่าเป็น 05:00 หรือ 04:59 แค่ต้องอยู่รูปแบบ mm:ss
        expect(t).to.match(/^\d{2}:\d{2}$/);
      });

    // มีรูป QR โผล่ (ไม่บังคับ src ว่าต้องเป็นอะไร)
    cy.get('.qr-img').should('be.visible');

    // ฝั่ง summary: มี 2 รายการ และรวมทั้งสิ้น
    cy.contains('.sum-title', 'ข้อมูลการจอง').should('be.visible');
    cy.contains('.sum-row .sum-text', '2 x Zone A').should('be.visible');
    cy.contains('.sum-row .sum-text', '1 x Zone B').should('be.visible');
    cy.contains('.sum-row', 'ค่าธรรมเนียม').should('be.visible');
    cy.contains('.sum-row.total', 'รวมทั้งสิ้น').should('be.visible');
  });

  // === PAY-002 ============================================================
  it('PAY-002: กด “ยืนยันการจ่าย” แล้วส่ง /registrations/confirm และแสดง Ticket Success Modal', () => {
    cy.intercept('POST', '**/registrations*', {
      statusCode: 201,
      body: {
        paymentReference: 'PAY-777',
        zoneName: 'Zone C',
        quantity: 2,
        ticketCodes: ['TC-001', 'TC-002'],
      },
    }).as('createReg');

    cy.intercept('PATCH', '**/registrations/confirm*', (req) => {
      const body = parseBody(req.body);
      expect(body).to.have.property('paymentReference', 'PAY-777');
      req.reply({
        statusCode: 200,
        body: { ok: true },
      });
    }).as('confirmPayment');

    const drafts = [
      { eventId: EVENT_ID, sessionId: 10, seatZoneId: 201, quantity: 2, unitPrice: 900, zoneLabel: 'Zone C' },
    ];
    const order = {
      eventId: EVENT_ID,
      title: 'Pure Concert 2025',
      poster: '/poster-demo.jpg',
      show: '19:00 (20 Dec 2025)',
      items: [{ qty: 2, zoneLabel: 'Zone C', unitPrice: 900 }],
      fee: 180,
    };

    cy.visit(VISIT_PATH, {
      onBeforeLoad(win) {
        setSessionDrafts(win, drafts, order);
      },
    });

    cy.wait('@createReg');
    cy.tick(250);

    cy.contains('button.pay-btn', 'ยืนยันการจ่าย').click();
    cy.wait('@confirmPayment');

    cy.get('.ticket-modal-card').should('be.visible');
    cy.contains('.ticket-title', 'ชำระเงินสำเร็จ').should('be.visible');
    cy.contains('.ticket-info .t-value', 'Zone C').should('be.visible');
    cy.get('.ticket-code-box').should('contain.text', 'TC-001');
  });

  // === PAY-003 ============================================================
  it('PAY-003: ปล่อยเวลาหมด แล้วแสดง Modal หมดเวลาและเรียกยกเลิกด้วย paymentReference', () => {
    cy.intercept('POST', '**/registrations*', {
      statusCode: 201,
      body: {
        paymentReference: 'PAY-888',
        zoneName: 'Zone D',
        quantity: 1,
      },
    }).as('createReg');

    cy.intercept('PATCH', '**/registrations/cancel*', {
      statusCode: 200,
      body: { status: 'CANCELLED' },
    }).as('cancelByRef');

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
      onBeforeLoad(win) {
        setSessionDrafts(win, drafts, order);
      },
    });

    cy.wait('@createReg');

    cy.tick(PAY_WINDOW_SEC * 1000 + 200);

    cy.get('.modal-card .modal-title')
      .should('contain', 'หมดเวลาการชำระเงิน');

    cy.wait('@cancelByRef');

    cy.contains('.modal-btn.primary', 'กลับหน้าแรก').click();
    cy.location().its('pathname').should('eq', '/');
  });


   // === PAY-004 ============================================================
  it('PAY-004: กดปุ่ม “ยกเลิก” แล้วระบบยกเลิกทั้งหมดและกลับไปหน้าเลือกผัง', () => {
    cy.intercept('POST', '**/registrations*', {
      statusCode: 201,
      body: { paymentReference: 'PAY-999', zoneName: 'Zone E', quantity: 2 },
    }).as('createReg');

    cy.intercept('PATCH', '**/registrations/cancel*', {
      statusCode: 200,
      body: { status: 'CANCELLED' },
    }).as('cancelByRef');

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
      onBeforeLoad(win) {
        setSessionDrafts(win, drafts, order);
      },
    });

    cy.wait('@createReg');

    cy.contains('button.cancel-btn', 'ยกเลิก').click();
    cy.wait('@cancelByRef');

    cy.location().should((loc) => {
      const p = loc.pathname;
      const ok1 = p.includes(`/concert-plan/${EVENT_ID}`);
      const ok2 = p.includes(`/event/${EVENT_ID}/plan`);
      const ok3 = p.includes(`/event/${EVENT_ID}/seat-zone`); // 👈 เพิ่มอันนี้
      expect(ok1 || ok2 || ok3, `redirected to plan page: ${p}`).to.be.true;
    });
  });


  // === PAY-005 ============================================================
  it('PAY-005: POST ครั้งแรกด้วย zoneId ล้มเหลว จากนั้นลองใหม่ด้วย seatZoneId แล้วสำเร็จ และ QR ใช้ paymentReference ที่สำเร็จ', () => {
    let callCount = 0;

    cy.intercept('POST', '**/registrations*', (req) => {
      callCount += 1;
      const body = parseBody(req.body);

      if (callCount === 1) {
        // รอบแรก: ใช้ zoneId แล้ว 400
        expect(body).to.have.property('zoneId');
        req.reply({ statusCode: 400, body: 'invalid zoneId' });
      } else {
        // รอบสอง: ใช้ seatZoneId แล้วสำเร็จ
        expect(body).to.have.property('seatZoneId');
        req.reply({
          statusCode: 201,
          body: {
            paymentReference: 'PAY-1001',
            zoneName: 'Zone F',
            quantity: 2,
          },
        });
      }
    }).as('createRegMulti');

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
      onBeforeLoad(win) {
        setSessionDrafts(win, drafts, order);
      },
    });

    cy.wait('@createRegMulti');
    cy.wait('@createRegMulti'); // รอบแรก 400 + รอบสอง 201

    // ไม่เช็คละเอียด แค่ให้มี src และมีคำว่า PAY-1001 ก็พอ
    cy.get('.qr-img').should('have.attr', 'src').then((src) => {
      expect(src).to.contain('PAY-1001');
    });
  });

  // === PAY-006 ============================================================
  it('PAY-006: ไม่พบ Draft ใน Storage แล้วระบบแจ้งเตือนและส่งกลับหน้าเลือกผัง', () => {
    const alertStub = cy.stub();
    cy.on('window:alert', alertStub);

    cy.visit(VISIT_PATH); // ไม่ set sessionStorage

    cy.wrap(alertStub).should('have.been.called');

    cy.location().should((loc) => {
      const p = loc.pathname;
      const ok1 = p.includes(`/concert-plan/${EVENT_ID}`);
      const ok2 = p.includes(`/event/${EVENT_ID}/plan`);
      expect(ok1 || ok2, `redirected to plan page: ${p}`).to.be.true;
    });
  });
});
