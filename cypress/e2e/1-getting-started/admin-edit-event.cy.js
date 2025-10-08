/// <reference types="cypress" />

// Utilities
const iso = {
  dt: '2025-10-19T10:00',  // YYYY-MM-DDTHH:mm
  dt2: '2025-10-25T18:00',
  d1: '2025-10-28',
  d2: '2025-10-29',
};

const ui = {
  // กรณี input เป็น text/flatpickr ใช้รูปแบบ MM/DD/YYYY หรือ "MM/DD/YYYY hh:mm AM/PM"
  // หากเป็น <input type="date/time/datetime-local"> ให้ใช้ค่าจาก iso.*
  dateMMDDYYYY: '10/28/2025',
  dateMMDDYYYY2: '10/29/2025',
  dtDisp: '10/19/2025 10:00 AM',
  dtDisp2: '10/25/2025 06:00 PM',
};

function setValue(selector, value) {
  cy.get(selector).clear({ force: true }).type(String(value), { force: true });
}

describe('Admin Edit Event – Comprehensive', () => {

  beforeEach(() => {
    cy.intercept('GET', '/api/events/*').as('getEvent');
    cy.visit('/admin/events/1/edit');
    cy.wait('@getEvent');
  });

  it('EVT-EDIT-001: Required validation fires', () => {
    setValue('[data-testid="event-name"]', '   ');
    cy.get('[data-testid="event-category"]').select('');
    setValue('[data-testid="sale-open"]', '{selectall}{backspace}');
    cy.get('[data-testid="sale-no-end"]').uncheck({ force: true });
    setValue('[data-testid="sale-close"]', '{selectall}{backspace}');
    setValue('[data-testid="start-date"]', '{selectall}{backspace}');
    setValue('[data-testid="end-date"]', '{selectall}{backspace}');
    setValue('[data-testid="venue"]', '   ');
    setValue('[data-testid="gate-open"]', '{selectall}{backspace}');

    cy.get('[data-testid="btn-save"]').click();

    cy.get('[data-testid="alert-errors"]').should('exist');
    cy.get('[data-testid="alert-errors"] li').its('length').should('be.greaterThan', 3);
    cy.get('[data-testid="event-name"]').should('have.class', 'is-invalid');
    cy.get('[data-testid="event-category"]').should('have.class', 'is-invalid');
    cy.get('[data-testid="sale-open"]').should('have.class', 'is-invalid');
    cy.get('[data-testid="start-date"]').should('have.class', 'is-invalid');
    cy.get('[data-testid="end-date"]').should('have.class', 'is-invalid');
    cy.get('[data-testid="venue"]').should('have.class', 'is-invalid');
    cy.get('[data-testid="gate-open"]').should('have.class', 'is-invalid');
  });

  it('EVT-EDIT-002/003: saleNoEnd disables regClose and can save without it', () => {
    cy.get('[data-testid="sale-no-end"]').check({ force: true });
    cy.get('[data-testid="sale-close"]').should('be.disabled');

    setValue('[data-testid="event-name"]', 'Mariah Carey Live');
    cy.get('[data-testid="event-category"]').select('concert');
    // เปิดจำหน่าย
    setValue('[data-testid="sale-open"]', iso.dt);         // ถ้าเป็น text ใช้ ui.dtDisp
    // regClose ถูก disable ไม่ต้องกรอก
    setValue('[data-testid="start-date"]', iso.d1);        // ถ้าเป็น text ใช้ ui.dateMMDDYYYY
    setValue('[data-testid="end-date"]', iso.d2);
    setValue('[data-testid="venue"]', 'Impact Arena');
    setValue('[data-testid="gate-open"]', '17:00');

    cy.intercept('PUT', '/api/events/*', { statusCode: 204 }).as('save');
    cy.window().then(win => cy.stub(win, 'alert').as('alert'));
    cy.get('[data-testid="btn-save"]').click();

    cy.wait('@save').its('response.statusCode').should('be.oneOf', [200, 204]);
    cy.get('@alert').should('have.been.calledWith', 'บันทึกสำเร็จ');
  });

  it('EVT-EDIT-004: must fill regClose when saleNoEnd is false', () => {
    cy.get('[data-testid="sale-no-end"]').uncheck({ force: true });
    setValue('[data-testid="sale-close"]', '{selectall}{backspace}');

    // กรอกช่องอื่นครบ
    setValue('[data-testid="event-name"]', 'Event X');
    cy.get('[data-testid="event-category"]').select('concert');
    setValue('[data-testid="sale-open"]', iso.dt);
    setValue('[data-testid="start-date"]', iso.d1);
    setValue('[data-testid="end-date"]', iso.d2);
    setValue('[data-testid="venue"]', 'Impact Arena');
    setValue('[data-testid="gate-open"]', '17:00');

    cy.get('[data-testid="btn-save"]').click();
    cy.get('[data-testid="alert-errors"]').should('exist');
    cy.contains('กรุณากรอกวันที่และเวลาปิดจำหน่าย').should('exist');
  });

  it('EVT-EDIT-007: zones require name/capacity>0/price>0', () => {
    setValue('[data-testid="zone-0-name"]', '{selectall}{backspace}');
    setValue('[data-testid="zone-0-capacity"]', '0');
    setValue('[data-testid="zone-0-price"]', '0');

    cy.get('[data-testid="btn-save"]').click();
    cy.get('[data-testid="alert-errors"]').should('exist');
    cy.contains('กรุณากรอกชื่อโซนของแถวที่ 1').should('exist');
    cy.contains('กรุณากรอกจำนวนที่นั่งของโซนแถวที่ 1').should('exist');
    cy.contains('กรุณากรอกราคาของโซนแถวที่ 1').should('exist');
  });

  it('EVT-EDIT-008/009: add/remove zone', () => {
    cy.get('[data-testid="multi-zones"]').check({ force: true });
    cy.get('.zones .zone-row').then($rows => {
      const before = $rows.length;
      cy.get('[data-testid="zone-add"]').click();
      cy.get('.zones .zone-row').should('have.length', before + 1);
      // ลบแถวสุดท้ายถ้า >1
      if (before + 1 > 1) {
        cy.get(`[data-testid="zone-${before}-remove"]`).click();
        cy.get('.zones .zone-row').should('have.length', before);
      }
    });
  });

  it('EVT-EDIT-010/011: rounds require name/time and add/remove', () => {
    cy.get('[data-testid="multi-rounds"]').check({ force: true });

    // เพิ่มรอบใหม่ 1 แถว
    cy.get('[data-testid="round-add"]').click();
    cy.get('.round-row').should('have.length.greaterThan', 1);

    // ทำให้รอบแรกไม่ valid
    setValue('[data-testid="round-0-name"]', '{selectall}{backspace}');
    setValue('[data-testid="round-0-time"]', '{selectall}{backspace}');
    cy.get('[data-testid="btn-save"]').click();
    cy.get('[data-testid="alert-errors"]').should('exist');
    cy.contains('กรุณากรอกชื่อรอบของรอบที่ 1').should('exist');
    cy.contains('กรุณากรอกเวลาเริ่มของรอบที่ 1').should('exist');

    // ลบรอบสุดท้าย
    cy.get('.round-row').then($rows => {
      const n = $rows.length;
      if (n > 1) {
        cy.get(`[data-testid="round-${n-1}-remove"]`).click();
        cy.get('.round-row').should('have.length', n - 1);
      }
    });
  });

  it('EVT-EDIT-012: status toggle switches', () => {
    cy.get('[data-testid="status-toggle"]').check({ force: true }).should('be.checked');
    cy.get('[data-testid="status-toggle"]').uncheck({ force: true }).should('not.be.checked');
  });

  it('EVT-EDIT-013/014: upload/clear poster & seatmap', () => {
    const poster = 'poster.jpg';   // ต้องมีใน cypress/fixtures
    const seat = 'seatmap.jpg';

    cy.get('[data-testid="poster-input"]').selectFile(`cypress/fixtures/${poster}`, { force: true });
    // แค่ทริกเกอร์เปลี่ยนค่า (preview แสดงใน DOM จริงของคุณอยู่แล้ว)
    cy.get('[data-testid="poster-clear"]').click({ force: true });

    cy.get('[data-testid="seatmap-input"]').selectFile(`cypress/fixtures/${seat}`, { force: true });
    cy.get('[data-testid="seatmap-clear"]').click({ force: true });
  });

  it('EVT-EDIT-015: collapse/expand cards', () => {
    cy.get('[data-testid="tog-event"]').click();
    cy.get('[data-testid="tog-desc"]').click();
    cy.get('[data-testid="tog-zones"]').click();
    cy.get('[data-testid="tog-rounds"]').click();
    // แค่ตรวจไม่ error และปุ่ม toggle เปลี่ยน class `open` ก็ถือว่าผ่าน
    cy.get('[data-testid="tog-event"]').should('not.have.class', 'open');
  });

  it('EVT-EDIT-016: scroll to alert after validation', () => {
    setValue('[data-testid="event-name"]', '{selectall}{backspace}');
    cy.get('[data-testid="btn-save"]').click();
    cy.get('[data-testid="alert-errors"]').should('be.visible'); // อยู่ใน viewport
  });

  it('EVT-EDIT-017: prevent double submit', () => {
    // กรอกครบแบบเร็ว ๆ
    setValue('[data-testid="event-name"]', 'Ready');
    cy.get('[data-testid="event-category"]').select('concert');
    setValue('[data-testid="sale-open"]', iso.dt);
    cy.get('[data-testid="sale-no-end"]').check({ force: true });
    setValue('[data-testid="start-date"]', iso.d1);
    setValue('[data-testid="end-date"]', iso.d2);
    setValue('[data-testid="venue"]', 'Impact Arena');
    setValue('[data-testid="gate-open"]', '17:00');

    // ชะลอการตอบกลับ 1.5s
    cy.intercept('PUT', '/api/events/*', (req) => {
      req.on('response', (res) => res.setDelay(1500));
      req.reply({ statusCode: 204 });
    }).as('saveSlow');

    cy.get('[data-testid="btn-save"]').click();
    cy.get('[data-testid="btn-save"]').click(); // คลิกซ้ำ
    cy.wait('@saveSlow');
    // ตรวจจำนวนคำขอ PUT ถูกยิงแค่ 1
    cy.get('@saveSlow.all').should('have.length', 1);
  });

  it('EVT-EDIT-018: PUT failed shows error alert', () => {
    // กรอกครบ
    setValue('[data-testid="event-name"]', 'Fail Save');
    cy.get('[data-testid="event-category"]').select('concert');
    setValue('[data-testid="sale-open"]', iso.dt);
    cy.get('[data-testid="sale-no-end"]').check({ force: true });
    setValue('[data-testid="start-date"]', iso.d1);
    setValue('[data-testid="end-date"]', iso.d2);
    setValue('[data-testid="venue"]', 'Impact Arena');
    setValue('[data-testid="gate-open"]', '17:00');

    cy.intercept('PUT', '/api/events/*', { statusCode: 500 }).as('saveFail');
    cy.window().then(win => cy.stub(win, 'alert').as('alert'));
    cy.get('[data-testid="btn-save"]').click();

    cy.wait('@saveFail');
    cy.get('@alert').should('have.been.calledWith', 'บันทึกไม่สำเร็จ');
  });

  it('EVT-EDIT-019: loaded values match API', () => {
    // (โดยทั่วไปใช้ intercept + fixture แล้ว assert ค่า field)
    // ที่นี่ตรวจเพียงว่าบาง field มีค่า prefill
    cy.get('[data-testid="event-name"]').invoke('val').should('not.be.empty');
    cy.get('[data-testid="event-category"]').invoke('val').should('not.be.empty');
    cy.get('[data-testid="start-date"]').invoke('val').should('not.be.empty');
    cy.get('[data-testid="end-date"]').invoke('val').should('not.be.empty');
  });

  it('EVT-EDIT-020: saleNoEnd=true implies no regClose needed', () => {
    cy.get('[data-testid="sale-no-end"]').check({ force: true });
    cy.get('[data-testid="sale-close"]').should('be.disabled');
    // (ทดสอบเชิงพฤติกรรม: save ได้ และ backend ควรได้ saleEndAt=null)
    setValue('[data-testid="event-name"]', 'No Close');
    cy.get('[data-testid="event-category"]').select('concert');
    setValue('[data-testid="sale-open"]', iso.dt);
    setValue('[data-testid="start-date"]', iso.d1);
    setValue('[data-testid="end-date"]', iso.d2);
    setValue('[data-testid="venue"]', 'Impact Arena');
    setValue('[data-testid="gate-open"]', '17:00');

    cy.intercept('PUT', '/api/events/*', { statusCode: 204 }).as('saveNullClose');
    cy.get('[data-testid="btn-save"]').click();
    cy.wait('@saveNullClose').its('response.statusCode').should('be.oneOf', [200, 204]);
  });
});
