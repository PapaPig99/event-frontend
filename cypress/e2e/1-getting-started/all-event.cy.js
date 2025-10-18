/// <reference types="cypress" />

// กัน error ฝั่งแอปที่ไม่เกี่ยวกับสิ่งที่ทดสอบ
Cypress.on('uncaught:exception', () => false);

describe('Admin All Events Page', () => {
  const VISIT_PATH = '/admin/allevents';

  // ชุดข้อมูล mock
  const mockEvents = [
    { id: 1, title: 'Pure Concert 2025',  category: 'concert'   },
    { id: 2, title: 'Biz Talk 2025',      category: 'business'  },
    { id: 3, title: 'High School Show',   category: 'show'      },
    { id: 4, title: 'Jazz Night',         category: 'concert'   },
    { id: 5, title: 'Data Science 101',   category: 'education' },
  ];

  // ใส่ token/admin role ให้ผ่าน meta guard + mock /api/me
  const loginAsAdmin = (win) => {
    win.localStorage.setItem('token', 'dummy_admin_token');
    win.localStorage.setItem('user', JSON.stringify({
      id: 999,
      email: 'admin@demo.app',
      role: 'ADMIN',
      roles: ['ADMIN'],
    }));
  };

  beforeEach(() => {
    cy.intercept('GET', '**/api/**/me*', {
      statusCode: 200,
      body: { id: 999, email: 'admin@demo.app', role: 'ADMIN' },
    }).as('getMe');

    // ดัก /api/events ให้คืน mock
    cy.intercept('GET', '**/api/events*', {
      statusCode: 200,
      body: mockEvents,
      headers: { 'content-type': 'application/json' },
    }).as('getEvents');

    cy.visit(VISIT_PATH, { onBeforeLoad: loginAsAdmin });
    cy.wait('@getEvents');
  });

  it('AE-001: โหลดรายการทั้งหมดและแสดงจำนวนผลลัพธ์ถูกต้อง', () => {
    // เช็คข้อความสรุปจำนวน
    cy.contains('.result-info span', `พบ ${mockEvents.length} รายการ`).should('exist');

    // เช็คว่าชื่ออีเวนต์หลัก ๆ โผล่
    mockEvents.slice(0, 3).forEach(e => {
      cy.contains('.grid', e.title).should('exist');
    });

    // พยายามนับการ์ด (ยืดหยุ่น: ใช้ลูกของ .grid)
    cy.get('.grid').children().should('have.length.at.least', mockEvents.length);
  });

  it('AE-002: ค้นหาด้วยช่อง search-bar แล้วกรองผลลัพธ์ตามชื่อ', () => {
    cy.get('.search-bar input').clear().type('Jazz');
    cy.contains('.grid', 'Jazz Night').should('exist');
    cy.contains('.grid', 'Pure Concert 2025').should('not.exist');
    cy.contains('.result-info span', 'พบ 1 รายการ').should('exist');
  });

  it('AE-003: กรองด้วยหมวดหมู่ (เช่น คอนเสิร์ต) แล้วโชว์เฉพาะหมวดนั้น', () => {
    // พยายามคลิกตัวเลือกจากคอมโพเนนต์ CategoryFilter ตาม label ภาษาไทย
    // (รองรับทั้ง button/label/div โดยอิงข้อความ)
    cy.contains(/คอนเสิร์ต/).click();

    // หลังคลิก ต้องเห็นเฉพาะ concert
    cy.contains('.grid', 'Pure Concert 2025').should('exist');
    cy.contains('.grid', 'Jazz Night').should('exist');

    // ไม่ควรเห็น business / education / show
    cy.contains('.grid', 'Biz Talk 2025').should('not.exist');
    cy.contains('.grid', 'High School Show').should('not.exist');
    cy.contains('.grid', 'Data Science 101').should('not.exist');
  });

  it('AE-004: เมื่อมีตัวกรอง/คำค้น ปุ่ม "ล้างตัวกรอง" โผล่ และกดแล้วรีเซ็ตผล', () => {
    cy.get('.search-bar input').type('Data');
    cy.contains('.result-info .link', 'ล้างตัวกรอง').should('be.visible').click();

    // กลับมาครบ
    cy.contains('.result-info span', `พบ ${mockEvents.length} รายการ`).should('exist');
    cy.contains('.grid', 'Data Science 101').should('exist');
    cy.contains('.grid', 'Pure Concert 2025').should('exist');
  });

// AE-005: view -> กดปุ่มตัวแรกในการ์ด (ลิงก์/ปุ่ม)
it('AE-005: กดดู (view) แล้วไปหน้า detail ของอีเวนต์นั้น', () => {
  cy.contains('.grid > *', 'Pure Concert 2025')
    .as('card');

  cy.get('@card')
    .find('a[href], button, [role="button"]')   // รองรับปุ่ม/ลิงก์/role=button
    .eq(0)                                      // ปุ่มตัวแรก = view
    .click({ force: true });

  cy.location('pathname', { timeout: 10000 })
    .should('match', /\/admin\/events\/\d+\/detail$/);
});

// AE-006: edit -> ปุ่มตัวที่สองในการ์ด
it('AE-006: กดแก้ไข (edit) แล้วไปหน้า edit ของอีเวนต์นั้น', () => {
  cy.visit('/admin/allevents', { onBeforeLoad: (win) => {
    win.localStorage.setItem('token', 'dummy_admin_token');
    win.localStorage.setItem('user', JSON.stringify({ id: 999, email: 'admin@demo.app', role: 'ADMIN', roles: ['ADMIN'] }));
  }});
  cy.wait('@getEvents');

  cy.contains('.grid > *', 'Biz Talk 2025')
    .as('card');

  cy.get('@card')
    .find('a[href], button, [role="button"]')
    .eq(1)                                      // ปุ่มตัวที่สอง = edit
    .click({ force: true });

  cy.location('pathname').should('match', /\/admin\/events\/\d+\/edit$/);
});

// AE-007: delete -> ปุ่มตัวที่สามในการ์ด + stub confirm/alert + intercept DELETE
it('AE-007: กดลบ (remove) แล้วเรียก DELETE และอัพเดตรายการ', () => {
  cy.window().then((win) => {
    cy.stub(win, 'confirm').returns(true);
    cy.stub(win, 'alert').as('alert');
  });

  const targetId = 3; // High School Show
  cy.intercept('DELETE', `**/api/events/${targetId}`, { statusCode: 200 }).as('deleteEvent');

  cy.contains('.grid > *', 'High School Show')
    .as('card');

  cy.get('@card')
    .find('a[href], button, [role="button"]')
    .eq(2)                                      // ปุ่มตัวที่สาม = delete
    .click({ force: true });

  cy.wait('@deleteEvent');
  cy.get('@alert').should('have.been.called');
  cy.contains('.grid', 'High School Show').should('not.exist');
  });
});
