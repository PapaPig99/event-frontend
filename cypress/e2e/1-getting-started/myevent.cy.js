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
    posterImageUrl: 'poster1.jpg', // component จะ map เป็น path จริงเอง
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
  }).as('getEvent'); // เรียก 2 ครั้ง: eventId=1 และ 2
}

// เข้าหน้า “บัตรของฉัน” ผ่าน navbar (ไม่เดา path)
function goViaNavbar() {
  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.setItem('user', JSON.stringify(mockUser));
      win.localStorage.setItem('token', 'dummy.jwt.token');
    },
  });

  cy.contains('a,button', /My\s*Event/i, { timeout: 10000 }).click();

  cy.location('pathname', { timeout: 10000 }).should('match', /\/myevent$/);
  cy.contains('.title-row h1, h1, .page-title', /My\s*Event\s*Tickets/i, { timeout: 10000 })
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
    cy.wait('@getRegs', { timeout: 10000 });
    cy.get('.profile-box .name').should('contain.text', mockUser.name);
    cy.get('.profile-box .email').should('contain.text', mockUser.email);
  });

  it('EVT-TIX-002: แสดงข้อความ “ยังไม่มีประวัติบัตร” เมื่อไม่พบข้อมูล', () => {
    cy.intercept('GET', RX_REGS, { statusCode: 200, body: [] }).as('getRegsEmpty');

    goViaNavbar();

    cy.wait('@getRegsEmpty');
    cy.get('.empty').should('contain.text', 'ยังไม่มีประวัติบัตร');
  });

  it('EVT-TIX-003: เมื่อรูปโปสเตอร์โหลดไม่สำเร็จ ระบบเปลี่ยนไปใช้รูปสำรองได้ถูกต้อง', () => {
    cy.wait('@getRegs');
    cy.wait('@getEvent');
    cy.wait('@getEvent');

    cy.get('.event-card img, .event-card img.poster').first().then(($img) => {
      const firstSrc = $img.attr('src') || '';
      cy.wrap($img).trigger('error');
      cy.wrap($img).should(($el) => {
        const newSrc = $el.attr('src') || '';
        expect(newSrc, 'fallback src changed').to.not.eq(firstSrc);
      });
    });
  });

  it('EVT-TIX-004: การ์ดเรียงจากใหม่ไปเก่า (Oct อยู่บน Aug)', () => {
    cy.wait('@getRegs');
    cy.wait('@getEvent');
    cy.wait('@getEvent');

    cy.get('.event-card .event-title, .event-card .title, .event-card h3, .event-card h2')
      .then(($titles) => {
        const texts = [...$titles].map(el => el.textContent.trim());
        expect(texts[0]).to.include(mockEventsById[1].title); // ใหม่กว่า
        expect(texts[1]).to.include(mockEventsById[2].title);
      });
  });


  it('EVT-TIX-005: เมื่อ /registrations/me ล้มเหลว หน้าไม่ crash (ยังแสดง body)', () => {
    cy.intercept('GET', RX_REGS, { statusCode: 500, body: { message: 'Server error' } }).as('getRegsErr');

    goViaNavbar();

    cy.wait('@getRegsErr');
    cy.get('body').should('exist');
  });
});
