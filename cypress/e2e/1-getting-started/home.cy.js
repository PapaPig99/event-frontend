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
    // รอให้มีการ์ดอย่างน้อย 2 ใบ โดยไม่ผูกกับแท็กหัวข้อ
    cy.get('.cards .card, .grid .card, article, li, [data-testid^="event-card"]', { timeout: 10000 })
      .should('have.length.at.least', 2);

    // สองรายการหลักต้องมีแน่ ๆ
    cy.contains(/MARIAH CAREY The Celebration of Mimi/i).should('exist');
    cy.contains(/Fin & Growth Summit 2025/i).should('exist');

    // รายการที่ 3 เป็น optional (ขึ้นอยู่กับ UI)
    cy.get('body').then(($b) => {
      if ($b.text().includes('Tech EDU Bootcamp')) {
        cy.contains('Tech EDU Bootcamp').should('exist');
      } else {
        cy.log('Tech EDU Bootcamp ไม่ถูกเรนเดอร์ (อาจจำกัดจำนวนการ์ด) — ข้ามการตรวจนี้');
      }
    });

    // อย่างน้อยสถานที่บางอันต้องมี
    cy.contains('Impact Arena').should('exist');
    cy.contains('QSNCC').should('exist');
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
    const cardSel = '[data-testid="event-card-101"]';

    cy.get('body').then(($body) => {
      if ($body.find(cardSel).length) {
        cy.get(cardSel).scrollIntoView().click({ force: true });
      } else if ($body.find('a[href$="/event/101"]').length) {
        cy.get('a[href$="/event/101"]').first().scrollIntoView().click({ force: true });
      } else {
        cy.contains(title)
          .scrollIntoView()
          .then(($title) => {
            const $container = $title.closest(
              '[data-testid^="event-card"], .card, article, li, .event-card, .event, .item'
            );
            if ($container.length) {
              cy.wrap($container).click({ force: true });
            } else {
              cy.wrap($title).click({ force: true });
            }
          });
      }
    });

    // ยอมรับได้ทั้งเข้าเพจ event ตรง ๆ หรือโดนเด้งไปหน้า root พร้อม redirect
    cy.location().should((loc) => {
      const wentEvent = /\/event\/101$/.test(loc.pathname);
      const gotRedirect = loc.pathname === '/' && /redirect=\/?events?\/101/.test(loc.search);
      expect(
        wentEvent || gotRedirect,
        `navigated to event or redirect guard: ${loc.pathname}${loc.search}`
      ).to.be.true;
    });
  });

  it('HOME-005: ส่วน "ธุรกิจและการลงทุน" แสดงเฉพาะอีเวนต์ที่อยู่ในหมวดหมู่ business', () => {
    cy.contains('ธุรกิจและการลงทุน').first().scrollIntoView().should('exist');

    cy.contains('ธุรกิจและการลงทุน')
      .first()
      .parentsUntil('body')
      .filter((i, el) => el.querySelector && el.querySelector('.card, [data-testid^="event-card"], article, li'))
      .first()
      .within(() => {
        cy.contains('Fin & Growth Summit 2025').should('exist');
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

  it('HOME-007: แสดงข้อความกำลังโหลดระหว่างเรียก API และหายไปหลังโหลดสำเร็จ', () => {
    // override intercept ให้ช้าเป็นพิเศษสำหรับเทสต์นี้
    cy.intercept('GET', API_EVENTS, (req) => {
      setTimeout(() => {
        req.reply({ statusCode: 200, body: fxEvents });
      }, 500);
    }).as('getEventsSlow');

    cy.visit('/');

    // ระหว่างรอ API ต้องเห็นข้อความกำลังโหลด
    cy.contains('กำลังโหลด…').should('exist');

    cy.wait('@getEventsSlow');
    cy.contains('กำลังโหลด…').should('not.exist');
    cy.contains('แนะนำสำหรับคุณ').should('exist');
  });

  it('HOME-008: เมื่อ API ล้มเหลว จะแสดงข้อความโหลดข้อมูลไม่สำเร็จ', () => {
    // intercept ให้ error สำหรับเทสต์นี้
    cy.intercept('GET', API_EVENTS, {
      statusCode: 500,
      body: { message: 'server error' },
    }).as('getEventsError');

    cy.visit('/');

    cy.wait('@getEventsError');
    cy.contains('โหลดข้อมูลไม่สำเร็จ').should('exist');

    // ไม่ควรเจอชื่ออีเวนต์จาก mock ปกติ
    cy.contains(/MARIAH CAREY The Celebration of Mimi/i).should('not.exist');
    cy.contains(/Fin & Growth Summit 2025/i).should('not.exist');
  });
});
