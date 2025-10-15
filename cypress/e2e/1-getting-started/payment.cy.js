// cypress/e2e/payment.cy.js
/// <reference types="cypress" />

const EVENT_ID  = 1;
const PAGE_PATH = `/event/${EVENT_ID}/payment`;

const API_ME             = '**/api/me';
const API_REG_CREATE     = '**/api/registrations';
const API_REG_CONFIRM_WC = '**/api/registrations/**/confirm';

const ORDER_KEY = `order:${EVENT_ID}`;
const DRAFT_KEY = `registrationDraft:${EVENT_ID}`;

const orderSeed = {
  eventId: EVENT_ID,
  title: 'THE MEGA POP FEST 2025',
  poster: '/img/poster-demo.jpg',
  show: 'Tue 28 Oct 2025 20:00',
  items: [
    { zoneLabel: 'A1', unitPrice: 3500, qty: 2 },
    { zoneLabel: 'B2', unitPrice: 2500, qty: 1 },
  ],
  fee: 1150,
};
const draftSeed = { eventId: EVENT_ID, sessionId: 5001, zoneId: 301, quantity: 3 };

function seedStateTo(win, { order = orderSeed, draft = draftSeed } = {}) {
  const stateOrder   = { ...order };
  const historyState = { ...(win.history.state || {}), order: stateOrder, registrationDraft: draft };
  try { win.history.replaceState(historyState, ''); } catch {}
  win.sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
  if (draft) win.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  else win.sessionStorage.removeItem(DRAFT_KEY);
}

function visitPayment({ order = orderSeed, draft = draftSeed } = {}) {
  cy.intercept('GET', API_ME, { statusCode: 200, body: { id: 999, email: 'user@demo.app', role: 'USER' } }).as('getMe');
  cy.visit(PAGE_PATH, {
    onBeforeLoad(win) {
      win.localStorage.setItem('token', 'mock.jwt.token');
      win.localStorage.setItem('user', JSON.stringify({ id: 999, name: 'Mock User' }));
      seedStateTo(win, { order, draft });
    },
  });
}

Cypress.on('uncaught:exception', () => false);

describe('ชำระเงิน (Payment) – E2E', () => {
  it('PAY-001: สร้างการจองจาก Draft สำเร็จ และแสดงสรุปคำสั่งซื้อถูกต้อง', () => {
    cy.intercept('POST', API_REG_CREATE, (req) => {
      const { eventId, sessionId, zoneId, quantity } = req.body || {};
      expect(eventId).to.eq(draftSeed.eventId);
      expect(sessionId).to.eq(draftSeed.sessionId);
      expect(zoneId).to.eq(draftSeed.zoneId);
      expect(quantity).to.eq(draftSeed.quantity);
      req.reply({ statusCode: 201, body: { id: 777 } });
    }).as('createReg');

    visitPayment();
    cy.wait('@createReg');

    // ตรวจสอบชื่ออีเวนต์และโปสเตอร์
    cy.get('.event-title').should('contain.text', orderSeed.title);
    cy.get('.poster')
      .should('have.attr', 'src')
      .and('include', orderSeed.poster);

    // ตรวจสอบรอบการแสดง
    cy.get('select[disabled] option').should('contain.text', orderSeed.show);

    // ตรวจสอบรายการตั๋ว
    cy.contains('.sum-row .sum-text', '2 x A1').should('exist');
    cy.contains('.sum-row .sum-right', (3500).toLocaleString('en-US')).should('exist');
    cy.contains('.sum-row .sum-text', '1 x B2').should('exist');
    cy.contains('.sum-row .sum-right', (2500).toLocaleString('en-US')).should('exist');

    // ตรวจสอบค่าธรรมเนียมและราคารวม
    const itemsTotal = 3500 * 2 + 2500 * 1; // 9500
    const grand      = itemsTotal + orderSeed.fee;

    cy.contains('.sum-row', 'ค่าธรรมเนียม').within(() => {
      cy.contains(orderSeed.fee.toLocaleString('en-US')).should('exist');
    });
    cy.contains('.sum-row.total .sum-right', grand.toLocaleString('en-US')).should('exist');
  });

  it('PAY-002: ไม่มี Draft ระบบแจ้งเตือนและนำกลับหน้าเลือกประเภทบัตร', () => {
    cy.on('window:alert', (txt) => {
      expect(txt).to.match(/ข้อมูลการเลือกไม่ครบ/);
    });

    visitPayment({ draft: null });

    cy.location().should((loc) => {
      expect(loc.pathname).to.match(/\/event\/1\/plan$/);
    });
  });

  it('PAY-003: เริ่มการจองแล้วถูก 401 หรือ 403 ระบบเปลี่ยนเส้นทางไปหน้าแรกพร้อม login=1 และ redirect เดิม', () => {
    cy.intercept('POST', API_REG_CREATE, { statusCode: 401, body: 'unauth' }).as('createReg401');
    visitPayment();
    cy.wait('@createReg401');

    cy.location().should((loc) => {
      expect(loc.pathname).to.eq('/');
      expect(loc.search).to.match(/login=1/);
      expect(decodeURIComponent(loc.search)).to.match(/redirect=\/event\/1\/payment$/);
    });
  });

  it('PAY-004: ยืนยันการชำระสำเร็จ เรียก confirm ล้าง Draft และไปหน้า Ticket Success', () => {
    cy.intercept('POST', API_REG_CREATE, { statusCode: 201, body: { id: 888 } }).as('createReg');

    cy.intercept('PATCH', API_REG_CONFIRM_WC, (req) => {
      expect(req.url).to.match(/\/api\/registrations\/888\/confirm$/);
      expect(req.body?.paymentReference).to.match(/^QR-\d+$/);
      req.reply({ statusCode: 200, body: { id: 888, status: 'CONFIRMED' } });
    }).as('confirmReg');

    visitPayment();
    cy.wait('@createReg');

    cy.contains('button.pay-btn', 'ยืนยันการจ่าย').click();
    cy.wait('@confirmReg');

    cy.window().then((win) => {
      expect(win.sessionStorage.getItem(DRAFT_KEY)).to.be.null;
    });

    cy.location().should((loc) => {
      const ok =
        /\/event\/1\/success$/.test(loc.pathname) ||
        /ticket[-_]?success/i.test(loc.pathname);
      expect(ok, `redirect to success: ${loc.pathname}`).to.be.true;
    });
  });

  it('PAY-005: ปุ่มรายละเอียดต้องชี้ไปหน้า Event Detail ของอีเวนต์เดียวกัน', () => {
    cy.intercept('POST', API_REG_CREATE, { statusCode: 201, body: { id: 999 } }).as('createReg');
    visitPayment();
    cy.wait('@createReg');

    cy.get('a.link-chip')
      .should('have.attr', 'href')
      .then((href) => {
        expect(/\/events?\/1$/.test(href), `detail href: ${href}`).to.be.true;
      });
  });

  it('PAY-006: ส่วนรอบการแสดงและสถานะที่นั่งต้องถูกปิดการใช้งานตามขั้นตอนชำระเงิน', () => {
    cy.intercept('POST', API_REG_CREATE, { statusCode: 201, body: { id: 1001 } }).as('createReg');
    visitPayment();
    cy.wait('@createReg');

    cy.get('select[disabled]').should('exist');
    cy.get('button.status-chip[disabled]').should('exist');
  });
});
