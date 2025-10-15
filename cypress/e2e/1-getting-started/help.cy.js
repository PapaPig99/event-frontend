// cypress/e2e/help.cy.js
/// <reference types="cypress" />

// ปรับได้ตามเส้นทางจริงของโปรเจ็กต์
const PAGE_PATH = '/help';

Cypress.on('uncaught:exception', () => false);

describe('ศูนย์ช่วยเหลือ (Help Center) – E2E', () => {
    
  it('HELP-001: โหลดหน้าสำเร็จและแสดงองค์ประกอบหลัก (หัวข้อ, ช่องค้นหา, ปุ่มหมวด, FAQ เริ่มต้น)', () => {
    cy.visit(PAGE_PATH);

    cy.contains('h1', 'Help Center').should('be.visible');
    cy.get('input.search[placeholder*="Search"]').should('exist');

    // ปุ่มหมวดทั้งหมด 4 ปุ่ม และค่าเริ่มต้น active = Tickets
    cy.get('.topics button').should('have.length', 4);
    cy.contains('.topics button', 'Tickets').should('have.class', 'active');

    // FAQ ของหมวด Tickets แสดงผลเริ่มต้น
    cy.get('.faq-list .faq-item').its('length').should('be.greaterThan', 0);
  });

  it('HELP-002: สลับหมวดเป็น “Payment” แล้วต้องแสดงคำถามในหมวดนั้น', () => {
    cy.visit(PAGE_PATH);

    cy.contains('.topics button', 'Payment').click().should('have.class', 'active');
    cy.get('.faq-list .faq-item').should('contain.text', 'Can I get a refund?');
    cy.get('.faq-list .faq-item').should('not.contain.text', 'Where is my ticket?');
  });

  it('HELP-003: ค้นหาในหมวด “Tickets” แล้วกรองเฉพาะรายการที่ตรงคำค้น', () => {
    cy.visit(PAGE_PATH);

    // อยู่ที่ Tickets ตามค่าเริ่มต้น
    cy.get('input.search').clear().type('ticket');
    cy.get('.faq-list .faq-item').should('contain.text', 'Where is my ticket?');

    // เคลียร์แล้วควรเห็นรายการกลับมา
    cy.get('input.search').clear();
    cy.get('.faq-list .faq-item').its('length').should('be.greaterThan', 0);
  });

  it('HELP-004: เมื่อค้นหาแล้วไม่พบผลลัพธ์ ต้องแสดง “No results found.” และไม่แสดง FAQ item', () => {
    cy.visit(PAGE_PATH);

    cy.get('input.search').clear().type('xxxxxxxxxxxx'); // คำค้นที่ไม่มีแน่ ๆ
    cy.get('.faq-list .faq-item').should('have.length', 0);
    cy.contains('.faq-list .muted', 'No results found.').should('be.visible');
  });

  it('HELP-005: สถานะปุ่มหมวด active ต้องเปลี่ยนตามการคลิก (Tickets → Technical)', () => {
    cy.visit(PAGE_PATH);

    cy.contains('.topics button', 'Technical').click().should('have.class', 'active');
    cy.contains('.topics button', 'Tickets').should('not.have.class', 'active');
  });

  it('HELP-006: พิมพ์ “password” แล้วเปลี่ยนเป็นหมวด Account ควรเห็นคำถามที่เกี่ยวข้อง', () => {
    cy.visit(PAGE_PATH);

    cy.get('input.search').clear().type('password');
    cy.contains('.topics button', 'Account').click();

    cy.get('.faq-list .faq-item').should('contain.text', 'Forgot password?');
    cy.get('.faq-list .faq-item').should('not.contain.text', 'Where is my ticket?');
  });

  it('HELP-007: แสดงข้อมูลติดต่อ (อีเมลและเบอร์โทร) ในส่วน Need more help?', () => {
    cy.visit(PAGE_PATH);

    cy.contains('h2', 'Need more help?').should('be.visible');
    cy.contains('.contact', 'support@joinup.example').should('be.visible');
    cy.contains('.contact', '02-123-4567').should('be.visible');
  });
});
