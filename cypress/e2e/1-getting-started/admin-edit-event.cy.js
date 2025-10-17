/// <reference types="cypress" />

// ===== Helpers =====
const iso = {
  dt: '2025-10-19T10:00',
  d1: '2025-10-28',
  d2: '2025-10-29',
};

function getInputByLabel(labelText) {
  return cy.contains('label', labelText).parent().find('input.inp');
}
function getDateByLabel(labelText) {
  return cy.contains('label', labelText).parent().find('input[type="date"].inp');
}
function getDTByLabel(labelText) {
  return cy.contains('label', labelText).parent().find('input[type="datetime-local"].inp');
}
function setValue(elOrSelector, value) {
  const $el = typeof elOrSelector === 'string' ? cy.get(elOrSelector) : elOrSelector;
  $el.clear({ force: true }).type(String(value), { force: true });
}
function clearNativeDateTime(elOrSelector) {
  const $el = typeof elOrSelector === 'string' ? cy.get(elOrSelector) : elOrSelector;
  $el.invoke('val', '').trigger('input').trigger('change');
}

// ========= MAIN TEST =========
describe('Admin - Edit Event', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    const admin = { username: 'admin', role: 'ADMIN' };

    // --- mock ทุก endpoint auth/me/profile/session ให้เป็น ADMIN ---
    cy.intercept('GET', '**/api/me*', { statusCode: 200, body: admin });
    cy.intercept('GET', '**/api/**/me*', { statusCode: 200, body: admin });
    cy.intercept('GET', '**/api/auth/**', { statusCode: 200, body: admin });
    cy.intercept('GET', '**/api/**/profile*', { statusCode: 200, body: admin });
    cy.intercept('GET', '**/api/**/session*', { statusCode: 200, body: admin });

    // --- ดัก GET /api/events/1 ---
    cy.intercept('GET', '**/api/events/*', {
      statusCode: 200,
      body: {
        id: 1,
        title: 'MARIAH CAREY The Celebration of Mimi',
        category: 'concert',
        location: 'Impact Arena',
        startDate: '2025-10-28',
        endDate: '2025-10-29',
        saleStartAt: '2025-10-19T10:00:00',
        saleEndAt: '2025-10-25T18:00:00',
        saleUntilSoldout: false,
        doorOpenTime: '17:00',
        posterImageUrl: '/images/poster.jpg',
        detailImageUrl: null,
        seatmapImageUrl: null,
        sessions: [{ id: 101, name: 'Main Day', startTime: '18:00' }],
        zones: [{ id: 201, name: 'Zone A', capacity: 100, price: 2500 }],
      },
    }).as('getEvent');

    // --- set auth ใน localStorage ก่อนหน้าโหลดหน้าเพจ ---
    cy.visit('/admin/events/1/edit', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'test-token');
        win.localStorage.setItem('role', 'ADMIN');
        win.localStorage.setItem('user', JSON.stringify(admin));
        win.localStorage.setItem('auth', JSON.stringify({ accessToken: 'test-token', ...admin }));
      },
    });

    // --- ตรวจว่าไม่ถูก redirect ---
    cy.location('pathname', { timeout: 10000 }).should('include', '/admin/events/1/edit');
    cy.wait('@getEvent');
  });

  it('EDIT-001: แสดงข้อมูลอีเวนต์จาก API ได้ถูกต้อง', () => {
    getInputByLabel('ชื่อ *').should('have.value', 'MARIAH CAREY The Celebration of Mimi');
    cy.contains('label', 'หมวดหมู่ *')
      .parent()
      .find('select.inp')
      .should('have.value', 'concert');
    getInputByLabel('ที่ตั้ง *').should('have.value', 'Impact Arena');
  });

  it('EDIT-002: ไม่กรอกข้อมูลแล้วขึ้นแจ้งเตือนครบ', () => {
    setValue(getInputByLabel('ชื่อ *'), ' ');
    setValue(getInputByLabel('ที่ตั้ง *'), ' ');
    clearNativeDateTime(getDTByLabel('วันที่และเวลาปิดจำหน่าย *'));

    cy.contains('button', 'บันทึก').click({ force: true });
    cy.get('.alert.error').should('exist');
    cy.contains('.alert.error li', 'กรุณากรอกชื่ออีเวนต์').should('exist');
  });

  it('EDIT-003: ติ๊ก "ปิดเมื่อบัตรหมด" แล้วช่องวันปิดจำหน่ายถูกปิด และบันทึกสำเร็จ', () => {
    cy.contains('.ck', 'ปิดเมื่อบัตรหมด')
      .find('input[type="checkbox"]')
      .check({ force: true });

    getDTByLabel('วันที่และเวลาปิดจำหน่าย *').should('be.disabled');

    setValue(getInputByLabel('ชื่อ *'), 'Mariah Carey Live');
    setValue(getDateByLabel('วันเริ่มจัดงาน *'), iso.d1);
    setValue(getDateByLabel('วันสิ้นสุดงาน *'), iso.d2);
    setValue(getInputByLabel('ที่ตั้ง *'), 'Impact Arena');
    setValue(getInputByLabel('เวลาประตูเปิด *'), '17:00');

    cy.intercept('PUT', '**/events/*', { statusCode: 204 }).as('saveOk');
    cy.window().then((win) => cy.stub(win, 'alert').as('alert'));
    cy.contains('button', 'บันทึก').click({ force: true });

    cy.wait('@saveOk');
    cy.get('@alert').should('have.been.calledWith', 'บันทึกสำเร็จ');
  });

  it('EDIT-004: ไม่ติ๊ก "ปิดเมื่อบัตรหมด" ต้องกรอกวันปิดจำหน่าย', () => {
    cy.contains('.ck', 'ปิดเมื่อบัตรหมด')
      .find('input[type="checkbox"]')
      .uncheck({ force: true });

    clearNativeDateTime(getDTByLabel('วันที่และเวลาปิดจำหน่าย *'));
    cy.contains('button', 'บันทึก').click({ force: true });

    cy.contains('.alert.error li', 'กรุณากรอกวันที่และเวลาปิดจำหน่าย').should('exist');
  });

  it('EDIT-005: เพิ่มและลบโซนได้', () => {
    cy.contains('.pill', 'มีหลายโซน')
      .find('input[type="checkbox"]')
      .check({ force: true });

    cy.contains('button', '+ เพิ่มโซน').click({ force: true });
    cy.get('.zones .zone-row').then(($rows) => {
      const n = $rows.length;
      expect(n).to.be.greaterThan(1);

      if (n > 1) {
        cy.get('.zones .zone-row').last().find('button.del').click({ force: true });
        cy.get('.zones .zone-row').should('have.length', n - 1);
      }
    });
  });

  it('EDIT-006: บันทึกไม่สำเร็จ แล้วแสดงข้อความแจ้งเตือนข้อผิดพลาด', () => {
    setValue(getInputByLabel('ชื่อ *'), 'Fail Case');
    cy.intercept('PUT', '**/events/*', { statusCode: 500 }).as('saveFail');
    cy.window().then((win) => cy.stub(win, 'alert').as('alert'));
    cy.contains('button', 'บันทึก').click({ force: true });

    cy.wait('@saveFail');
    cy.get('@alert').should((stub) => {
      const calledWith = stub.getCalls().map((c) => c.args[0]).join(' | ');
      expect(calledWith).to.match(/บันทึกไม่สำเร็จ/);
    });
  });
});
