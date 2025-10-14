// cypress/e2e/home.cy.js
/// <reference types="cypress" />

const API_EVENTS = '**/api/events';

const fxEvents = [
  {
    id: 101,
    title: 'MARIAH CAREY The Celebration of Mimi',
    category: 'concert',
    location: 'Impact Arena',
    startDate: '2025-11-01',
    posterImageUrl: '/images/mariah.jpg',
    tags: ['vip'],
  },
  {
    id: 202,
    name: 'Fin & Growth Summit 2025',
    type: 'business',
    venue: 'QSNCC',
    date: '2025-12-10',
    detail_image_url: '/images/fin.jpg',
  },
  {
    id: 303,
    title: 'Tech EDU Bootcamp',
    category: 'education',
    location: 'Bangkok',
    startDate: '2026-01-20',
    poster_image_url: '/images/edu.jpg',
  },
];

describe('Home - Public Landing Page', () => {
  beforeEach(() => {
    cy.intercept('GET', API_EVENTS, { statusCode: 200, body: fxEvents }).as('getEvents');
    cy.visit('/');
    cy.wait('@getEvents');
  });

  it('HOME-001: แสดงส่วน HERO และแถบโปสเตอร์ขนาดใหญ่ได้ถูกต้อง', () => {
    cy.contains('h1.title', /ALL THE .*EVENT.* YOU CAN’T MISS/i).should('exist');

    cy.get('form.search').within(() => {
      cy.get('input[placeholder*="พิมพ์ชื่ออีเวนต์"]').should('exist');
      cy.contains('button', 'ค้นหา').should('exist');
    });

    cy.get('section.container.section').within(() => {
      cy.get('img').its('length').should('be.greaterThan', 0);
    });
  });

  it('HOME-002: ส่วน "แนะนำสำหรับคุณ" แสดงข้อมูลอีเวนต์จาก API ได้ถูกต้อง', () => {
    // เลือก h2 ตัวแรกที่ตรงข้อความ จากนั้นไต่ไปยัง section ที่ครอบรายการ
    cy.contains('h2', /แนะนำสำหรับคุณ/)
      .first()
      .scrollIntoView()
      .should('exist')
      .closest('section')
      .within(() => {
        cy.get('.cards .card, .grid .card, article, li, [data-testid^="event-card"]')
          .should('have.length.at.least', 3);

        // ชื่อ 2 รายการหลักต้องเจอ
        cy.contains('MARIAH CAREY The Celebration of Mimi').should('exist');
        cy.contains('Fin & Growth Summit 2025').should('exist');

        // โลเคชันอย่างน้อย 1–2 ตัว
        cy.contains('Impact Arena').should('exist');
        cy.contains('QSNCC').should('exist');
      });
  });

  it('HOME-003: เมื่อพิมพ์ค้นหาและกด Enter ระบบนำไปยังหน้า /event พร้อมพารามิเตอร์ q', () => {
    cy.get('form.search input').clear().type('mariah{enter}');
    cy.location().should((loc) => {
      expect(loc.pathname).to.match(/\/event$/);
      expect(loc.search).to.contain('q=mariah');
    });
  });

  it('HOME-004: เมื่อคลิกการ์ดอีเวนต์ ระบบนำไปยังหน้าแสดงรายละเอียดของอีเวนต์นั้น', () => {
    const title = 'MARIAH CAREY The Celebration of Mimi';

    cy.get(`[data-testid="event-card-101"]`).then(($card) => {
      if ($card.length) {
        cy.wrap($card).scrollIntoView().click({ force: true });
      } else {
        cy.contains(title).scrollIntoView().click({ force: true });
        cy.location('pathname').then((p) => {
          if (!/\/event\/101$/.test(p)) {
            cy.contains(title)
              .parents()
              .then(($parents) => {
                const clickable = [...$parents].find(
                  (el) =>
                    el.tagName === 'A' ||
                    el.tagName === 'BUTTON' ||
                    el.getAttribute('role') === 'button' ||
                    el.onclick ||
                    el.getAttribute('tabindex') === '0'
                );
                if (clickable) {
                  cy.wrap(clickable).click({ force: true });
                } else {
                  cy.contains(title).closest('*').within(() => {
                    cy.get('a,button').first().click({ force: true });
                  });
                }
              });
          }
        });
      }
    });

    cy.location('pathname').should('match', /\/event\/101$/);
  });

  it('HOME-005: ส่วน "ธุรกิจและการลงทุน" แสดงเฉพาะอีเวนต์ที่อยู่ในหมวดหมู่ business', () => {
    cy.contains('h2', 'ธุรกิจและการลงทุน')
      .first()
      .scrollIntoView()
      .should('exist')
      .closest('section')
      .within(() => {
        // ต้องเห็น business
        cy.contains('Fin & Growth Summit 2025').should('exist');
        // ไม่ควรเห็น concert/education ในเซกชันนี้
        cy.contains('MARIAH CAREY The Celebration of Mimi').should('not.exist');
        cy.contains('Tech EDU Bootcamp').should('not.exist');
      });
  });

  it('HOME-006: เมื่อเคลียร์ช่องค้นหาและกดปุ่มค้นหา ระบบนำไปยังหน้า /event โดยไม่มีพารามิเตอร์ q', () => {
    cy.get('form.search input').clear();
    cy.get('form.search button[type="submit"]').click();
    cy.location().should((loc) => {
      expect(loc.pathname).to.match(/\/event$/);
      expect(loc.search).to.satisfy((s) => s === '' || !s.includes('q='));
    });
  });
});
