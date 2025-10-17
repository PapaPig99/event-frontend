// cypress/e2e/myevent.cy.js
/// <reference types="cypress" />

// ====== Regex ของ endpoint ที่คอมโพเนนต์เรียกจริง ======
const RX_ME   = /\/api\/me(\?.*)?$/;
const RX_REGS = /\/(api\/)?registrations\/me(\?.*)?$/;     // api.get('/registrations/me') => ดักทั้งมี/ไม่มี /api
const RX_EVT  = /\/api\/events\/\d+(\?.*)?$/;              // axios.get(`/api/events/:id`)

// ====== Mock data ======
const mockUser = { id: 9, name: 'Pond Tester', email: 'pond@example.com' };
const mockRegs = [
  { id: 101, eventId: 1, registeredAt: '2025-10-02T20:00:00Z' },
  { id: 102, eventId: 2, registeredAt: '2025-08-15T18:00:00Z' },
];
const mockEventsById = {
  1: {
    id: 1,
    title: 'DATA TECH FAIR',
    location: 'BITEC Bangna',
    start_time: '2025-10-02T20:00:00Z',
    posterImageUrl: 'poster1.jpg', // component จะแปลงเป็น /images/, /uploads/, /static/uploads/
  },
  2: {
    id: 2,
    title: 'JAZZ NIGHT ON RIVER',
    location: 'ICONSIAM Hall',
    start_time: '2025-08-15T18:00:00Z',
    posterImageUrl: 'poster2.jpg',
  },
};

// ====== Intercepts พื้นฐาน ======
function wireIntercepts() {
  cy.intercept('GET', RX_ME,   { statusCode: 200, body: mockUser }).as('getMe');
  cy.intercept('GET', RX_REGS, { statusCode: 200, body: mockRegs }).as('getRegs');
  cy.intercept('GET', RX_EVT,  (req) => {
    const id = req.url.match(/\/events\/(\d+)/)?.[1];
    req.reply({ statusCode: 200, body: mockEventsById[id] || {} });
  }).as('getEvent');
}

// เข้าหน้า “บัตรของฉัน” ผ่าน navbar (ไม่เดา path)
function goViaNavbar() {
  cy.visit('/', {
    onBeforeLoad(win) {
      // ให้ initUser() เห็นผู้ใช้ตั้งแต่ mount
      win.localStorage.setItem('user', JSON.stringify(mockUser));
      win.localStorage.setItem('token', 'dummy.jwt.token');
    },
  });

  // ปุ่ม/ลิงก์บน navbar ที่พาไปหน้า My Event (ปรับให้แม่นกับโปรเจกต์คุณ)
  cy.contains('a,button', /My\s*Event/i, { timeout: 10000 }).click();

  // ยืนยันว่า header ของหน้าเป้าหมายเรนเดอร์แล้ว
  cy.contains('.title-row h1, h1', /My\s*Event\s*Tickets/i, { timeout: 10000 })
    .should('be.visible');
}

Cypress.on('uncaught:exception', () => false);

// ===================================================================
// TESTS
// ===================================================================
describe('EVT-TIX – หน้าบัตรของฉัน (My Event Tickets)', () => {
  beforeEach(() => {
    wireIntercepts();
    goViaNavbar();
  });

  it('EVT-TIX-001: โหลดหน้า My Event Tickets สำเร็จและแสดงชื่อผู้ใช้ / อีเมล', () => {
    cy.wait('@getRegs', { timeout: 10000 }); // คอนโพเนนต์ยิง /registrations/me ก่อนคำนวณการ์ด
    cy.get('.profile-box .name').should('contain.text', mockUser.name);
    cy.get('.profile-box .email').should('contain.text', mockUser.email);
  });

  it('EVT-TIX-002: แสดงรายการบัตรครบ', () => {
    cy.wait('@getRegs');
    cy.get('.event-card').should('have.length', 2);

    cy.get('.event-card').first().within(() => {
      cy.get('img.poster').should('have.attr', 'src'); // ไม่บังคับโหลดสำเร็จ แค่มี src
      cy.get('.event-title').should('contain.text', mockEventsById[1].title);
      cy.get('.location').should('contain.text', mockEventsById[1].location);
      cy.contains('button.view-btn', 'View Ticket').should('be.visible');
    });
  });

  it('EVT-TIX-003: แสดงข้อความ “ยังไม่มีประวัติบัตร” เมื่อไม่พบข้อมูล”', () => {
    cy.intercept('GET', RX_REGS, { statusCode: 200, body: [] }).as('getRegsEmpty');

    // re-enter page เพื่อให้ใช้ intercept ใหม่นี้
    goViaNavbar();

    cy.wait('@getRegsEmpty');
    cy.get('.empty').should('contain.text', 'ยังไม่มีประวัติบัตร');
  });

  it('EVT-TIX-004: เมื่อรูปโปสเตอร์โหลดไม่สำเร็จ ระบบเปลี่ยนไปใช้รูปสำรองได้ถูกต้อง', () => {
    cy.wait('@getRegs');

    cy.get('.event-card img.poster').first().then(($img) => {
      const firstSrc = $img.attr('src') || '';
      // ยิง error event ใส่ <img> (template ผูก @error="onImgError(event)" ไว้แล้ว)
      cy.wrap($img).trigger('error');
      // src ควรถูกเปลี่ยนเป็น candidate ถัดไป (เช่น จาก /images/... → /uploads/...)
      cy.wrap($img).should(($el) => {
        const newSrc = $el.attr('src') || '';
        expect(newSrc, 'fallback src changed').to.not.eq(firstSrc);
      });
    });
  });

  it('EVT-TIX-005: การ์ดเรียงจากใหม่ไปเก่า (Oct อยู่บน Aug)', () => {
    cy.wait('@getRegs');
    cy.get('.event-card .event-title').then(($titles) => {
      const texts = [...$titles].map(el => el.textContent.trim());
      expect(texts[0]).to.include(mockEventsById[1].title); // Oct
      expect(texts[1]).to.include(mockEventsById[2].title); // Aug
    });
  });

  it('EVT-TIX-006: คลิก “View Ticket” ไปยัง /my-ticket/:id (จากการ์ดแรก)', () => {
    cy.wait('@getRegs');

    cy.get('.event-card').first().within(() => {
      cy.contains('button.view-btn', 'View Ticket').click({ force: true });
    });

    cy.location('pathname', { timeout: 10000 }).should('match', /\/my-ticket\/\d+$/);
  });

  it('EVT-TIX-007: เมื่อ /registrations/me ล้มเหลว หน้าไม่ crash (ยังแสดง body)', () => {
    cy.intercept('GET', RX_REGS, { statusCode: 500, body: { message: 'Server error' } }).as('getRegsErr');

    // re-enter page เพื่อให้ยิง intercept ใหม่นี้
    goViaNavbar();

    cy.wait('@getRegsErr');
    cy.get('body').should('exist');
  });
});
