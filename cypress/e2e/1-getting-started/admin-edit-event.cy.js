/// <reference types="cypress" />

const iso = {
  dt: '2025-10-19T10:00',
  d1: '2025-10-28',
  d2: '2025-10-29',
};

// ใช้กับ input ทั่วไป
function setValue(selector, value) {
  cy.get(selector).clear({ force: true }).type(String(value), { force: true });
}

// เคลียร์ <input type="datetime-local"> หรือพวก native date/time โดยไม่ใช้ {backspace}
function clearNativeDateTime(selector) {
  cy.get(selector)
    .invoke('val', '')
    .trigger('input')
    .trigger('change');
}

// อัปโหลดรูป 1×1 เพื่อให้ผ่าน validation ถ้าจำเป็น
function uploadTinyPoster(selector = '.poster .upload input[type="file"]') {
  const tinyPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
  const file = {
    contents: Cypress.Buffer.from(tinyPngBase64, 'base64'),
    fileName: 'poster.png',
    mimeType: 'image/png',
    lastModified: Date.now(),
  };
  cy.get(selector).selectFile(file, { force: true });
}

describe('Admin - Edit Event', () => {
  beforeEach(() => {
    cy.seedAdminAuth();

    cy.intercept('GET', '**/api/**/events/*', {
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

    cy.visit('/admin/events/1/edit');
    cy.wait('@getEvent');
  });

  it('EDIT-001: แสดงข้อมูลอีเวนต์จาก API ได้ถูกต้อง', () => {
    cy.get('[data-testid="event-name"]').should('have.value', 'MARIAH CAREY The Celebration of Mimi');
    cy.get('[data-testid="event-category"]').should('have.value', 'concert');
    cy.get('[data-testid="venue"]').should('have.value', 'Impact Arena');
  });

  it('EDIT-002: เมื่อไม่กรอกข้อมูล ระบบแสดงข้อความแจ้งเตือนให้กรอกข้อมูลให้ครบ', () => {
    setValue('[data-testid="event-name"]', ' ');
    setValue('[data-testid="venue"]', ' ');
    cy.get('[data-testid="btn-save"]').click();
    cy.get('[data-testid="alert-errors"]').should('exist');
    cy.contains('กรุณากรอกชื่ออีเวนต์').should('exist');
  });

  it('EDIT-003: เมื่อตั้งค่าให้ขายจนหมด ช่องวันปิดจำหน่ายจะถูกปิดและสามารถบันทึกได้', () => {
    cy.get('[data-testid="sale-no-end"]').check({ force: true });
    cy.get('[data-testid="sale-close"]').should('be.disabled');

    setValue('[data-testid="event-name"]', 'Mariah Carey Live');
    setValue('[data-testid="start-date"]', iso.d1);
    setValue('[data-testid="end-date"]', iso.d2);
    setValue('[data-testid="venue"]', 'Impact Arena');
    setValue('[data-testid="gate-open"]', '17:00');

    cy.intercept('PUT', '**/events/*', { statusCode: 204 }).as('save');

    cy.window().then((win) => cy.stub(win, 'alert').as('alert'));
    cy.get('[data-testid="btn-save"]').click();

    cy.wait('@save');
    cy.get('@alert').should('have.been.calledWith', 'บันทึกสำเร็จ');
  });

  it('EDIT-004: เมื่อตั้งค่าไม่ให้ขายจนหมด ระบบต้องให้กรอกวันปิดจำหน่าย', () => {
    cy.get('[data-testid="sale-no-end"]').uncheck({ force: true });
    clearNativeDateTime('[data-testid="sale-close"]');
    cy.get('[data-testid="btn-save"]').click();
    cy.contains('กรุณากรอกวันที่และเวลาปิดจำหน่าย').should('exist');
  });

  it('EDIT-005: เพิ่มและลบโซนของงานได้ถูกต้อง', () => {
    cy.contains('.pill', 'มีหลายโซน').find('input[type="checkbox"]').check({ force: true });
    cy.contains('button', '+ เพิ่มโซน').click();
    cy.get('.zones .zone-row').should('have.length.greaterThan', 1);

    cy.get('.zones .zone-row').then(($rows) => {
      const n = $rows.length;
      if (n > 1) {
        cy.get('.zones .zone-row').last().find('button.del').click();
        cy.get('.zones .zone-row').should('have.length', n - 1);
      }
    });
  });

  it('EDIT-006: เมื่อบันทึกไม่สำเร็จ ระบบแสดงข้อความแจ้งเตือนข้อผิดพลาด', () => {
    setValue('[data-testid="event-name"]', 'Fail Case');
    cy.intercept('PUT', '**/events/*', { statusCode: 500 }).as('saveFail');
    cy.window().then((win) => cy.stub(win, 'alert').as('alert'));
    cy.get('[data-testid="btn-save"]').click();

    cy.wait('@saveFail');
    cy.get('@alert').should((stub) => {
      const calledWith = stub.getCalls().map((c) => c.args[0]).join(' | ');
      expect(calledWith).to.match(/บันทึกไม่สำเร็จ/);
    });
  });
});
