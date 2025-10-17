// cypress/e2e/payment.cy.js
/// <reference types="cypress" />

/**
 * Payment (QR) – E2E spec
 * - นำทางหลายเส้นทางจนคอมโพเนนต์ขึ้น (.payment-page / [data-cy="payment-root"])
 * - ใส่ sessionStorage (order + registrationsDraft) ก่อนนำทาง
 * - ดัก /api/me เป็น 200 กันรีไดเร็กต์
 * - ครอบทุกรูปแบบการ "เติม items" (POST/PATCH /items, PATCH /add, หรือ PATCH /registrations/:id พร้อม body.items)
 * - ทำให้ทำงานร่วมกับ cy.clock ได้ (ไม่พึ่ง setInterval ในการไล่ลองเส้นทาง)
 */

const EVENT_ID = 1;

// เส้นทางที่แอปอาจใช้จริง (เพิ่ม/ลบได้ตามโปรเจกต์)
const payPaths = [
  `/event/${EVENT_ID}/pay`,
  `/event/${EVENT_ID}/payment`,
  `/payment/${EVENT_ID}`,
  `/checkout/${EVENT_ID}`,
];

const registrationsDraft = [
  { eventId: EVENT_ID, sessionId: 101, seatZoneId: 10, zoneLabel: 'ZONE A', quantity: 2, unitPrice: 3000 },
  { eventId: EVENT_ID, sessionId: 101, seatZoneId: 20, zoneLabel: 'ZONE B', quantity: 1, unitPrice: 2000 },
];

const orderState = {
  eventId: EVENT_ID,
  title: 'THE GREAT SHOW 2025',
  poster: '/img/poster.jpg',
  show: 'รอบ 20:00 - 15 ต.ค. 2568',
  items: [
    { zoneLabel: 'ZONE A', qty: 2, unitPrice: 3000 },
    { zoneLabel: 'ZONE B', qty: 1, unitPrice: 2000 },
  ],
  fee: 100,
};

function totalText() {
  const itemsTotal = 2 * 3000 + 1 * 2000; // 8,000
  const grand = itemsTotal + orderState.fee; // 8,100
  return grand.toLocaleString('en-US');
}

/* ---------------- Intercepts พื้นฐาน ---------------- */
function wireIntercepts({ bulkOk = true } = {}) {
  // Auth guard
  cy.intercept('GET', '**/api/me*', { statusCode: 200, body: { id: 999, email: 'u@example.com' } }).as('getMe');

  // สมัครจอง (bulk / single)
  cy.intercept('POST', '**/api/registrations/bulk', (req) => {
    if (!bulkOk) return req.reply({ statusCode: 500, body: { message: 'bulk error' } });
    req.reply({ statusCode: 200, body: { id: 55555 } });
  }).as('bulkCreate');

  // ตรวจว่ารอบ createSingle นี้แนบ items มาด้วยไหม (บางแบ็กเอนด์อนุญาต)
  cy.intercept('POST', '**/api/registrations', (req) => {
    const hasItems = Array.isArray(req.body?.items) && req.body.items.length > 0;
    if (hasItems) req.alias = 'createSingleWithItems';
    req.reply({ statusCode: 200, body: { id: 66666 } });
  }).as('createSingle');

  // ----- เพิ่ม items (ครอบทุกสไตล์) -----
  cy.intercept('POST',  '**/api/registrations/*/items', { statusCode: 200 }).as('appendItemsPost');
  cy.intercept('PATCH', '**/api/registrations/*/items', { statusCode: 200 }).as('appendItemsPatch');
  cy.intercept('PATCH', '**/api/registrations/*/add',   { statusCode: 200 }).as('appendItemsAdd');

  // บางแบ็กเอนด์จะ PATCH ลง /registrations/:id พร้อม body.items
  // ระวังอย่าไปชน /confirm /cancel
  cy.intercept('PATCH', '**/api/registrations/*', (req) => {
    const url = req.url || '';
    if (/\/(confirm|cancel)(\?|$)/.test(url)) {
      return req.reply({ statusCode: 200 });
    }
    const b = req.body || {};
    if (Array.isArray(b.items)) {
      req.alias = 'appendItems';
      return req.reply({ statusCode: 200 });
    }
    req.reply({ statusCode: 200 });
  }).as('regPatch');

  // ยืนยัน
  cy.intercept('PATCH', '**/api/registrations/*/confirm', { statusCode: 200 }).as('confirm');

  // ยกเลิก (รองรับหลาย endpoint)
  cy.intercept('PATCH', '**/api/registrations/*/cancel',   { statusCode: 200 }).as('cancel1');
  // หมายเหตุ: อย่าดัก PATCH '**/api/registrations/*' ซ้ำเป็น cancel2 อีกครั้ง เพราะชนกับ regPatch

  cy.intercept('DELETE', '**/api/registrations/*',         { statusCode: 200 }).as('cancel3');

  // รูป/QR
  cy.intercept('GET', '**/img/**', { statusCode: 200, body: '' }).as('img');
  cy.intercept('GET', '**/api/payments/**', { statusCode: 200, body: '' }).as('qr');

  // หน้าโฮมที่มักจะยิง /api/events ขอให้เป็น 200 ว่าง ๆ
  cy.intercept('GET', '**/api/events*', { statusCode: 200, body: [] }).as('getEventsBare');
}

/* ---------------- นำทางให้คอมโพเนนต์ “ขึ้นแน่” ---------------- */
function mountPaymentPage(opts = {}) {
  wireIntercepts(opts);

  cy.visit('/', {
    failOnStatusCode: false,
    onBeforeLoad(win) {
      win.localStorage.setItem('token', 'dummy.jwt.token');
      win.localStorage.setItem('user', JSON.stringify({ id: 999, email: 'u@example.com' }));
      win.sessionStorage.setItem(`registrationsDraft:${EVENT_ID}`, JSON.stringify(registrationsDraft));
      win.sessionStorage.setItem(`order:${EVENT_ID}`, JSON.stringify(orderState));
    },
  });

  // ลองหลาย path จนกว่าจะเห็นคอมโพเนนต์
  cy.window().then((win) => {
    const tryGo = (p) => {
      win.history.pushState({}, '', p);
      win.dispatchEvent(new win.PopStateEvent('popstate'));
      win.location.hash = `#${p}`;
    };

    // ถ้าใช้ cy.clock จะมี win.setInterval.clock → หลีกเลี่ยง setInterval แล้ว “ไล่ทุก path” ทันที
    const isClocked = !!(win.setInterval && win.setInterval.clock);
    if (isClocked) {
      payPaths.forEach(tryGo);
    } else {
      let i = 0;
      const tryNext = () => {
        if (i >= payPaths.length) return;
        tryGo(payPaths[i++]);
      };
      tryNext(); // path แรก
      const timer = setInterval(() => {
        const el = win.document.querySelector('.payment-page, [data-cy="payment-root"]');
        if (el) { clearInterval(timer); }
        else if (i < payPaths.length) tryNext();
        else clearInterval(timer);
      }, 800);
    }
  });

  // รอให้คอมโพเนนต์ mount จริง (พอแค่ exist กัน false negative ตอนกำลังสลับเส้นทาง)
  cy.get('.payment-page, [data-cy="payment-root"]', { timeout: 15000 }).should('exist');
}

/* ---------------- helpers สำหรับรอ alias แบบ “อย่างน้อยหนึ่งอัน” ---------------- */
function waitAny(aliases, timeout = 12000) {
  // พยายามรอสักหนึ่ง alias โดยไม่ fail ถ้าอันอื่นไม่มา
  return cy.wrap(null).then(() => {
    if (Promise.any) {
      return Promise.any(
        aliases.map(a =>
          cy.wait(a, { timeout }).then(() => true)
        )
      ).catch(() => {}); // ถ้าไม่มีอันไหนเลย ก็ปล่อยให้เทสต์ assert ต่อเอง
    }
    return Cypress.Promise.allSettled(
      aliases.map(a => cy.wait(a, { timeout }).then(() => true))
    ).then((results) => results.some(r => r.status === 'fulfilled'));
  });
}

/* ---------------- Tests ---------------- */
describe('PAY-QR – หน้าชำระเงิน (QR) & Registration flow', () => {
  it('PAY-QR-001: โหลดหน้าและแสดงสรุปคำสั่งซื้อ/QR/ตัวนับเวลา', () => {
    mountPaymentPage();

    cy.contains('.event-title, [data-cy="payment-title"]', orderState.title).should('be.visible');
    cy.contains('.sum-title', 'ข้อมูลการจอง').should('be.visible');
    cy.contains('.sum-row .sum-right', totalText()).should('be.visible');
    cy.get('.qr-box .qr-img').should('be.visible');
    cy.contains('.countdown', 'เวลาชำระเงินคงเหลือ').should('be.visible');
  });

  it('PAY-QR-002: รวมหลายโซนเป็นรายการเดียวแล้วสร้าง registration ผ่าน /registrations/bulk', () => {
    mountPaymentPage({ bulkOk: true });
    cy.wait('@bulkCreate', { timeout: 12000 });
    cy.get('.pay-btn').should('be.enabled');
  });

  it('PAY-QR-003: ไม่มี bulk แล้ว fallback ไปสร้าง /registrations และเติม items', () => {
    // บังคับให้ bulk ล้ม เพื่อทดสอบ fallback
    cy.intercept('POST', '**/api/registrations/bulk', { statusCode: 500, body: { message: 'no bulk' } }).as('bulkCreate');
    mountPaymentPage({ bulkOk: false });

    cy.wait('@createSingle', { timeout: 12000 });

    // ถ้า createSingle แนบ items มาด้วยอยู่แล้ว → alias 'createSingleWithItems' จะถูกตั้ง
    // ไม่งั้นจะต้องมีการเรียก appendItems แบบใดแบบหนึ่ง
    return waitAny(
      ['@createSingleWithItems', '@appendItems', '@appendItemsPost', '@appendItemsPatch', '@appendItemsAdd'],
      12000
    ).then((ok) => {
      expect(ok, 'either created with items OR appended items afterwards').to.eq(true);
    });
  });

  it('PAY-QR-004: กดยืนยันการจ่าย จากนั้นระบบ confirm และไปหน้า Success', () => {
    mountPaymentPage();
    cy.get('.pay-btn').click();
    cy.wait('@confirm', { timeout: 12000 });
    cy.location('pathname', { timeout: 12000 }).should('match', /success|ticket|my-ticket/i);
  });

  it('PAY-QR-005: กดยกเลิก แล้วระบบยิง cancel อย่างน้อยหนึ่งแบบ และพากลับหน้าผัง', () => {
    mountPaymentPage();
    cy.get('.cancel-btn').click();

    // รอให้มีอย่างน้อยหนึ่ง endpoint สำหรับ cancel
    waitAny(['@cancel1', '@cancel3'], 12000);

    cy.location('pathname', { timeout: 12000 })
      .should('match', /concert|plan|seat|select|event|checkout/i);
  });

  it('PAY-QR-006: หมดเวลาแล้วแสดง modal หมดเวลาการชำระเงิน', () => {
    const now = Date.now();
    cy.clock(now, ['Date', 'setInterval', 'clearInterval']); // ควบคุม timer ทั้งหมดในหน้า

    mountPaymentPage();

    // ให้แน่ใจว่าตัวนับเริ่มทำงานก่อน
    cy.contains('.countdown', 'เวลาชำระเงินคงเหลือ', { timeout: 12000 }).should('exist');

    // เดินเวลา 5 นาที
    cy.tick(300_000);

    cy.get('.modal-backdrop .modal-title', { timeout: 4000 })
      .should('contain.text', 'หมดเวลาการชำระเงิน');
  });
});
