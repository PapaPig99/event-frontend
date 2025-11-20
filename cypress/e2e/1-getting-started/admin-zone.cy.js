/// <reference types="cypress" />

describe("ZONE TEMPLATE ADMIN", () => {

  const mockList = [
    { id: 1, name: "VIP A", groupName: "VIP", capacity: 10, price: 1500 },
    { id: 2, name: "VIP B", groupName: "VIP", capacity: 12, price: 1200 },
    { id: 3, name: "Zone C", groupName: "ZONES", capacity: 20, price: 600 },
  ];

  beforeEach(() => {

  cy.intercept("GET", "**/api/zone-templates*", mockList).as("getTemplates");

  cy.visit("/admin/zones", {
    onBeforeLoad(win) {
      // ต้องตรงกับ src/lib/auth.ts เท่านั้น
      win.localStorage.setItem("token", "FAKE_TOKEN");

      win.localStorage.setItem("user", JSON.stringify({
        email: "admin@test.com",
        roles: ["ADMIN"]   // ให้ hasRole("ADMIN") ใช้ได้
      }));
    }
  });

  cy.wait("@getTemplates");
});


  it("ZONE-001: โหลด template list สำเร็จ", () => {
    cy.contains(".template-card", "VIP A").should("exist");
    cy.contains(".template-card", "VIP B").should("exist");
    cy.contains(".template-card", "Zone C").should("exist");
  });

  it("ZONE-002: เลือก group แล้วแสดงเฉพาะ template ของกลุ่มนั้น", () => {
    cy.contains(".group-item", "VIP").click();

    cy.contains(".template-card", "VIP A").should("exist");
    cy.contains(".template-card", "VIP B").should("exist");
    cy.contains(".template-card", "Zone C").should("not.exist");
  });

  it("ZONE-003: เพิ่ม template ใหม่", () => {
    cy.contains("button", "+ Add Template").click();

    cy.get("input").eq(0).type("NewZone");
    cy.get("input").eq(1).type("Premium");
    cy.get("input").eq(2).type("50");
    cy.get("input").eq(3).type("1990");

    cy.intercept("POST", "**/api/zone-templates", { success: true }).as("createT");

    cy.contains("button", "Save").click();
    cy.wait("@createT");
  });

  it("ZONE-004: แก้ไข template", () => {
    cy.contains(".template-card", "VIP A").click();
    cy.contains("button", "Edit").click();

    cy.get("input").eq(0).clear().type("VIP A Updated");

    cy.intercept("PUT", "**/api/zone-templates/1", { success: true }).as("updateT");

    cy.contains("button", "Save").click();
    cy.wait("@updateT");
  });

  it("ZONE-005: ลบ template สำเร็จ", () => {
    cy.contains(".template-card", "Zone C").click();

    cy.intercept("DELETE", "**/api/zone-templates/3", { success: true }).as("deleteT");

    cy.contains("button", "Delete").click();
    cy.wait("@deleteT");
  });

});
