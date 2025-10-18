// cypress/e2e/admin-create-event.cy.js
/// <reference types="cypress" />

Cypress.on('uncaught:exception', () => false);

// ---------- helpers ----------
const byLabelInput = (labelText) =>
  cy.contains('label', labelText).parent().find('input.inp');
const byLabelSelect = (labelText) =>
  cy.contains('label', labelText).parent().find('select');
const zonesFirstRow = () => cy.get('.zone-row').first();
const roundsFirstRow = () => cy.get('.round-row').first();

// เปิด section ตามหัวข้อ (เช่น 'โซนของงาน', 'รอบของงาน')
function openSection(titleText) {
  cy.contains('header.card-head', titleText)
    .within(() => cy.get('button.chev').click({ force: true }));
}

// อัปโหลดไฟล์ภาพจำลอง (1x1 PNG)
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

describe('Admin - Create Event', () => {
  beforeEach(() => {
    cy.seedAdminAuth();
    cy.intercept('POST', '**/api/**/events*').as('createEventGeneric');
    cy.visit('/admin/create');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/admin/create');
  });

  it('CE-001: แสดงหน้า "สร้างอีเวนต์" และโครงสร้างพื้นฐานถูกต้อง', () => {
    cy.contains('h2', 'ข้อมูลอีเวนต์').should('be.visible');
    openSection('โซนของงาน');
    openSection('รอบของงาน');
    cy.get('.zone-row').should('have.length.at.least', 1);
    cy.get('.round-row').should('have.length.at.least', 1);
    cy.contains('button', 'สร้าง').should('be.visible');
  });

  it('CE-002: ไม่กรอกข้อมูล ระบบแสดงข้อความแจ้งเตือนครบทุกช่องที่จำเป็น', () => {
    cy.contains('button', 'สร้าง').click();
    cy.get('.alert.error').should('be.visible');
    cy.get('.alert-list').within(() => {
      cy.contains('กรุณาอัปโหลดรูปโปสเตอร์').should('be.visible');
      cy.contains('กรุณากรอกชื่ออีเวนต์').should('be.visible');
      cy.contains('กรุณาเลือกหมวดหมู่').should('be.visible');
      cy.contains('กรุณากรอกวันที่และเวลาเปิดจำหน่าย').should('be.visible');
      cy.contains('กรุณากรอกวันที่และเวลาปิดจำหน่าย').should('be.visible');
      cy.contains('กรุณากรอกวันเริ่มจัดงาน').should('be.visible');
      cy.contains('กรุณากรอกวันสิ้นสุดงาน').should('be.visible');
      cy.contains('กรุณากรอกสถานที่จัดงาน').should('be.visible');
    });
  });

  it('CE-003: สวิตช์ "ปิดเมื่อบัตรหมด" ทำงานถูกต้อง ปิดและเปิดช่องวันปิดจำหน่ายได้', () => {
    cy.contains('label.ck', 'ปิดเมื่อบัตรหมด')
      .find('input[type="checkbox"]')
      .check({ force: true });
    byLabelInput('วันที่และเวลาปิดจำหน่าย *').should('be.disabled');

    cy.contains('label.ck', 'ปิดเมื่อบัตรหมด')
      .find('input[type="checkbox"]')
      .uncheck({ force: true });
    byLabelInput('วันที่และเวลาปิดจำหน่าย *').should('not.be.disabled');
  });

  it('CE-004: เพิ่มและลบโซนของงานได้ถูกต้อง', () => {
    openSection('โซนของงาน');
    cy.contains('.pill', 'มีหลายโซน')
      .find('input[type="checkbox"]')
      .check({ force: true });
    cy.contains('button', '+ เพิ่มโซน').click().click();
    cy.get('.zone-row').should('have.length.at.least', 3);
    cy.get('.zone-row').last().find('button.del').click();
    cy.get('.zone-row').its('length').then((n) => expect(n).to.be.greaterThan(1));
  });

  it('CE-005: เพิ่มและลบรอบของงานได้ถูกต้อง', () => {
    openSection('รอบของงาน');
    cy.contains('.pill', 'อีเวนต์มีหลายวัน/หลายรอบ')
      .find('input[type="checkbox"]')
      .check({ force: true });
    cy.contains('button', '+ เพิ่มรอบ').click();
    cy.get('.round-row').should('have.length.at.least', 2);
    cy.get('.round-row').last().find('button.del').click();
    cy.get('.round-row').its('length').then((n) => expect(n).to.be.greaterThan(0));
  });

  it('CE-006: อัปโหลดรูปโปสเตอร์แล้วแสดงตัวอย่างได้ถูกต้อง', () => {
    uploadTinyPoster();
    cy.get('.poster .preview img').should('be.visible');
  });

  it('CE-007: กรอกข้อมูลครบและสร้างอีเวนต์สำเร็จ (สถานะ 201)', () => {
    cy.intercept('POST', '**/api/**/events*', {
      statusCode: 201,
      headers: { Location: '/api/events/123' },
      body: {},
    }).as('createEvent');

    uploadTinyPoster();

    cy.contains('label', 'ชื่อ *').parent().find('input.inp').type('NCT Reboot Live');
    byLabelSelect('หมวดหมู่ *').select('คอนเสิร์ต');
    byLabelInput('วันที่และเวลาเปิดจำหน่าย *').type('2025-10-01T10:00');
    byLabelInput('วันที่และเวลาปิดจำหน่าย *').type('2025-10-31T18:00');
    byLabelInput('วันเริ่มจัดงาน *').type('2025-11-01');
    byLabelInput('วันสิ้นสุดงาน *').type('2025-11-02');
    byLabelInput('ที่ตั้ง *').type('Impact Arena, Hall 9');
    byLabelInput('เวลาประตูเปิด *').type('17:00');

    openSection('รอบของงาน');
    roundsFirstRow().within(() => {
      cy.get('input.inp').eq(0).type('Main Day');
      cy.get('input.inp').eq(1).type('18:00');
    });

    openSection('โซนของงาน');
    zonesFirstRow().within(() => {
      cy.get('input.inp').eq(0).type('Zone A');
      cy.get('input.inp.num').eq(0).clear().type('100');
      cy.get('input.inp.num').eq(1).clear().type('2500');
    });

    cy.contains('button', 'สร้าง').click();

    cy.wait('@createEvent');
    cy.on('window:alert', (txt) => {
      expect(txt).to.contain('สร้างสำเร็จ! Event ID = 123');
    });
  });
});
