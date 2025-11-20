/// <reference types="cypress" />

describe("ZONE TEMPLATE – CRUD", () => {
  beforeEach(() => {
    // Mock initial data
    cy.intercept("GET", "/zone-templates", {
      statusCode: 200,
      body: [
        { id: 1, name: "VIP A", groupName: "VIP", capacity: 20, price: 3000 },
        { id: 2, name: "VIP B", groupName: "VIP", capacity: 25, price: 2500 },
        { id: 3, name: "Zone C", groupName: "General", capacity: 100, price: 800 }
      ]
    }).as("getTemplates");

    cy.visit("/admin/zone-templates");
  });

  // ---------------------------------------------------------------
  it("ZONE-001: โหลด template list สำเร็จ", () => {
    cy.wait("@getTemplates");

    cy.contains(".template-card", "VIP A").should("exist");
    cy.contains(".template-card", "VIP B").should("exist");
    cy.contains(".template-card", "Zone C").should("exist");
  });

  // ---------------------------------------------------------------
  it("ZONE-002: เลือก group แล้วแสดงเฉพาะ template ของกลุ่มนั้น", () => {
    cy.wait("@getTemplates");

    cy.contains(".group-item", "VIP").click();

    cy.contains(".template-card", "VIP A").should("exist");
    cy.contains(".template-card", "VIP B").should("exist");
    cy.contains(".template-card", "Zone C").should("not.exist");
  });

  // ---------------------------------------------------------------
  it("ZONE-003: เพิ่ม template ใหม่", () => {
    cy.wait("@getTemplates");

    cy.contains("button", "+ Add Template").click();

    cy.get("input").eq(0).type("New Zone");
    cy.get("input").eq(1).type("NewGroup");
    cy.get("input").eq(2).type("50");
    cy.get("input").eq(3).type("1200");

    cy.intercept("POST", "/zone-templates", {
      statusCode: 200,
      body: {}
    }).as("createTemplate");

    cy.intercept("GET", "/zone-templates", {
      statusCode: 200,
      body: [
        { id: 1, name: "VIP A", groupName: "VIP", capacity: 20, price: 3000 },
        { id: 4, name: "New Zone", groupName: "NewGroup", capacity: 50, price: 1200 }
      ]
    }).as("reloadTemplates");

    cy.contains("button", "Save").click();

    cy.wait("@createTemplate");
    cy.wait("@reloadTemplates");

    cy.contains(".template-card", "New Zone").should("exist");
  });

  // ---------------------------------------------------------------
  it("ZONE-004: แก้ไข template (edit)", () => {
    cy.wait("@getTemplates");

    cy.contains(".template-card", "VIP A").click();
    cy.contains("button", "Edit").click();

    cy.get("input").eq(0).clear().type("VIP A - Updated");

    cy.intercept("PUT", "/zone-templates/1", {
      statusCode: 200,
      body: {}
    }).as("updateTemplate");

    cy.intercept("GET", "/zone-templates", {
      statusCode: 200,
      body: [
        { id: 1, name: "VIP A - Updated", groupName: "VIP", capacity: 20, price: 3000 },
        { id: 2, name: "VIP B", groupName: "VIP", capacity: 25, price: 2500 }
      ]
    }).as("reloadAfterEdit");

    cy.contains("button", "Save").click();

    cy.wait("@updateTemplate");
    cy.wait("@reloadAfterEdit");

    cy.contains(".template-card", "VIP A - Updated").should("exist");
  });

  // ---------------------------------------------------------------
  it("ZONE-005: ลบ template สำเร็จ", () => {
    cy.wait("@getTemplates");

    cy.contains(".template-card", "Zone C").click();

    cy.intercept("DELETE", "/zone-templates/3", {
      statusCode: 200,
      body: {}
    }).as("deleteTemplate");

    cy.intercept("GET", "/zone-templates", {
      statusCode: 200,
      body: [
        { id: 1, name: "VIP A", groupName: "VIP", capacity: 20, price: 3000 },
        { id: 2, name: "VIP B", groupName: "VIP", capacity: 25, price: 2500 }
      ]
    }).as("reloadAfterDelete");

    cy.contains("button", "Delete").click();

    cy.wait("@deleteTemplate");
    cy.wait("@reloadAfterDelete");

    cy.contains(".template-card", "Zone C").should("not.exist");
  });
});
