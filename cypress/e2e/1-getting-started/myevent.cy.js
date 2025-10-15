// cypress/e2e/myevent.cy.js
/// <reference types="cypress" />

const PAGE_PATH = '/my-tickets';

// จับทั้ง relative/absolute และมี query ได้
const API_TIX_GLOB = '**/api/events/my-tickets*';

const FIXED_NOW = new Date('2025-01-15T12:00:00.000Z');
const mockUser = { name: 'Jane Ticketlover', email: 'jane@example.com' };

const fxTickets = [
  { id: 1001, title: 'Future Concert A', date: '2025-01-16T20:00:00.000Z', location: 'Impact Arena', image: '/img/future-a.jpg' },
  { id: 1002, title: 'Future Concert B', date: '2025-02-01T19:30:00.000Z', location: 'QSNCC',        image: '/img/future-b.jpg' },
  { id: 9001, title: 'Past Festival X',   date: '2024-12-25T18:00:00.000Z', location: 'ICONSIAM',    image: '/img/past-x.jpg' },
];

Cypress.on('uncaught:exception', () => false);

// ✅ helper: ใส่ token/user + intercept /api/me และ “รีไรท์” XHR ให้เป็น same-origin
function visitWithUser() {
  cy.clock(FIXED_NOW.getTime(), ['Date']);

  // ให้ guard ผ่าน
  cy.intercept('GET', '**/api/me', {
    statusCode: 200,
    body: { id: 9, email: mockUser.email, role: 'USER' },
  }).as('getMe');

  cy.visit(PAGE_PATH, {
    onBeforeLoad(win) {
      // จำลองล็อกอิน
      win.localStorage.setItem('token', 'mock.jwt.token');
      win.localStorage.setItem('user', JSON.stringify(mockUser));

      // 🔧 รีไรท์ XHR.open: ถ้าเจอ host 8080 ให้เปลี่ยนเป็นพาธเดียวกัน (same-origin)
      const origOpen = win.XMLHttpRequest.prototype.open;
      win.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        try {
          const u = String(url);
          if (u.includes('/api/events/my-tickets')) {
            url = '/api/events/my-tickets'; // ทำให้ intercept แบบ same-origin จับได้แน่นอน
          }
          if (u.includes('/api/me')) {
            url = '/api/me';
          }
        } catch {}
        return origOpen.apply(this, [method, url, ...rest]);
      };
    },
  });

  // เพียงพอแค่ตรวจว่า path มี /my-tickets (หลีกเลี่ยง false negative แปลก ๆ)
  cy.location('pathname').should('include', '/my-tickets');
}

describe('บัตรงานอีเวนต์ของฉัน (My Event Tickets) – E2E', () => {
  beforeEach(() => {
    // intercept หลัก
    cy.intercept('GET', API_TIX_GLOB, { statusCode: 200, body: fxTickets }).as('getMyTickets');
  });

  it('TIX-001: โหลดหน้าสำเร็จและแสดงข้อมูลผู้ใช้จาก Local Storage พร้อมหัวเรื่อง/ไอคอน', () => {
    visitWithUser();
    cy.wait('@getMyTickets', { timeout: 15000 });

    cy.contains('h2', 'My Event Tickets').should('be.visible');
    cy.get('.title-row .title-icon').should('exist');
    cy.get('.profile-box .name').should('contain.text', mockUser.name);
    cy.get('.profile-box .email').should('contain.text', mockUser.email);
    cy.contains('button.edit-btn', 'Edit Profile').should('exist');
  });

  it('TIX-002: แยกรายการเป็น Upcoming และ History ถูกต้อง พร้อมแสดง badge จำนวน', () => {
    visitWithUser();
    cy.wait('@getMyTickets');

    cy.get('.tabs .tab').contains('Upcoming').should('have.class', 'active');
    cy.get('.tabs .tab').contains(/^Upcoming/).find('.badge').should('contain.text', '2');
    cy.get('.tabs .tab').contains(/^History/).find('.badge').should('contain.text', '1');

    cy.get('[role="tabpanel"]').filter(':visible').within(() => {
      cy.get('.event-card').should('have.length', 2);
      cy.contains('.event-title', 'Future Concert A').should('exist');
      cy.contains('.event-title', 'Future Concert B').should('exist');
    });

    cy.contains('.tab', 'History').click().should('have.class', 'active');
    cy.get('[role="tabpanel"]').filter(':visible').within(() => {
      cy.get('.event-card').should('have.length', 1);
      cy.contains('.event-title', 'Past Festival X').should('exist');
    });
  });

  it('TIX-003: กรณีไม่มีรายการในแท็บที่เลือก ให้แสดงข้อความว่าง (Empty State)', () => {
    cy.intercept('GET', API_TIX_GLOB, {
      statusCode: 200,
      body: [
        { ...fxTickets[2] },
        { ...fxTickets[2], id: 9002, title: 'Past Y', date: '2024-11-01T17:00:00.000Z' },
      ],
    }).as('getMyTicketsEmptyUpcoming');

    visitWithUser();
    cy.wait('@getMyTicketsEmptyUpcoming');

    cy.contains('.tab', 'Upcoming').click();
    cy.get('[role="tabpanel"]').filter(':visible').within(() => {
      cy.contains('.empty', 'No upcoming events').should('be.visible');
    });

    cy.contains('.tab', 'History').click();
    cy.get('[role="tabpanel"]').filter(':visible').within(() => {
      cy.get('.event-card').its('length').should('be.greaterThan', 0);
    });
  });

  it('TIX-004: สลับแท็บด้วยคีย์บอร์ด (Arrow Left/Right) ต้องเปลี่ยนสถานะ active และ focus/aria ถูกต้อง', () => {
    visitWithUser();
    cy.wait('@getMyTickets');

    cy.contains('.tab', 'Upcoming').focus().trigger('keydown', { key: 'ArrowRight' });
    cy.contains('.tab', 'History').should('have.class', 'active');

    cy.contains('.tab', 'History').focus().trigger('keydown', { key: 'ArrowLeft' });
    cy.contains('.tab', 'Upcoming').should('have.class', 'active');

    cy.contains('.tab', 'Upcoming').should('have.attr', 'aria-selected', 'true');
    cy.contains('.tab', 'History').should('have.attr', 'aria-selected', 'false');
  });

  it('TIX-005: การ์ดมีข้อมูลพื้นฐานครบ (รูปโปสเตอร์ alt, ชื่อ, สถานที่, วันที่ฟอร์แมต)', () => {
    visitWithUser();
    cy.wait('@getMyTickets');

    cy.contains('.tab', 'Upcoming').click();
    cy.get('[role="tabpanel"]').filter(':visible').within(() => {
      cy.get('.event-card').first().within(() => {
        cy.get('img.poster').should('have.attr', 'alt', 'Event Poster');
        cy.get('.event-title').should('not.be.empty');
        cy.get('.location').should('not.be.empty');
        cy.get('.date').invoke('text')
          .should('match', /[A-Za-z]{3}\s\d{2}\s[A-Za-z]{3}\s\d{4}\s\d{2}:\d{2}/);
      });
    });
  });

  it('TIX-006: คลิก “View Ticket” นำทางไปยัง /ticket/:id ตรงกับการ์ดที่คลิก', () => {
    visitWithUser();
    cy.wait('@getMyTickets');

    cy.contains('.tab', 'Upcoming').click();
    cy.contains('.event-card .event-title', 'Future Concert B')
      .parents('.event-card')
      .within(() => cy.contains('button.view-btn', 'View Ticket').click());

    cy.location('pathname').should('eq', '/ticket/1002');
  });

  it('TIX-007: สลับไป History แล้วคลิก “View Ticket” ของอดีต ต้องไป /ticket/:id ของรายการนั้น', () => {
    visitWithUser();
    cy.wait('@getMyTickets');

    cy.contains('.tab', 'History').click();
    cy.contains('.event-card .event-title', 'Past Festival X')
      .parents('.event-card')
      .within(() => cy.contains('button.view-btn', 'View Ticket').click());

    cy.location('pathname').should('eq', '/ticket/9001');
  });
});
