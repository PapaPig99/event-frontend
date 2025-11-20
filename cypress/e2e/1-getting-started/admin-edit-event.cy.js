/// <reference types="cypress" />

// ----------------------------------------------------
// Helper Functions
// ----------------------------------------------------
function getInput(label) {
  return cy.contains("label", label).parent().find("input.inp");
}
function getSelect(label) {
  return cy.contains("label", label).parent().find("select.inp");
}
function getDate(label) {
  return cy.contains("label", label).parent().find('input[type="date"]');
}
function getDT(label) {
  return cy.contains("label", label).parent().find('input[type="datetime-local"]');
}

const iso = {
  open: "2025-10-19T10:00",
  close: "2025-10-25T18:00",
  start: "2025-10-28",
  end: "2025-10-29",
};

// 🚩 helper สำคัญ: ต้องไป step 3 ก่อนถึงจะเจอปุ่ม Save
function clickSaveButton() {
  // เปลี่ยน activeStep ไป step 3 (โซนตามรอบ)
  cy.contains(".step", "3. โซนตามรอบ").click();

  // ปุ่ม Save อยู่ใน wizard-nav, เป็น .btn.primary ตัวสุดท้าย
  cy.get(".wizard-nav .btn.primary")
    .last()
    .click({ force: true });
}

// ====================================================
// MAIN TEST
// ====================================================
describe("Admin – Edit Event", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    const admin = { id: 1, role: "ADMIN", name: "Admin" };

    // Mock auth
    cy.intercept("GET", "**/api/me*", { statusCode: 200, body: admin });

    // intercept zone-templates ให้ตรง backend จริง
    cy.intercept("GET", "**/api/zone-templates", {
      statusCode: 200,
      body: [
        { id: 11, name: "Template A", groupName: "Premium" },
        { id: 12, name: "Template B", groupName: "Premium" },
        { id: 21, name: "Template C", groupName: "Standard" },
      ],
    }).as("templates");

    // GET /api/events/1
    cy.intercept("GET", "**/api/events/1", {
      statusCode: 200,
      body: {
        id: 1,
        title: "Test Event",
        category: "concert",
        location: "Impact Arena",
        startDate: "2025-10-28",
        endDate: "2025-10-29",
        saleStartAt: "2025-10-19T10:00:00",
        saleEndAt: "2025-10-25T18:00:00",
        saleUntilSoldout: false,
        doorOpenTime: "17:00",
        posterImageUrl: "/images/poster.jpg",
        seatmapImageUrl: null,
        sessions: [
          {
            id: 101,
            name: "Main Day",
            startTime: "18:00",
            useZoneTemplate: false,
            zones: [{ id: 201, name: "A", capacity: 100, price: 2500 }],
          },
        ],
      },
    }).as("getEvent");

    cy.visit("/admin/events/1/edit", {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", "tkn");
        win.localStorage.setItem("user", JSON.stringify(admin));
      },
    });

    cy.wait("@templates", { timeout: 10000 });
    cy.wait("@getEvent", { timeout: 10000 });
  });

  // ----------------------------------------------------
  it("EDIT-001 โหลดข้อมูลอีเวนต์มาแสดงถูกต้อง", () => {
    getInput("ชื่อ *").should("have.value", "Test Event");
    getSelect("หมวดหมู่ *").should("have.value", "concert");
    getInput("ที่ตั้ง *").should("have.value", "Impact Arena");
    getDate("วันเริ่มจัดงาน *").should("have.value", "2025-10-28");
  });

  // ----------------------------------------------------
  it("EDIT-002 ไม่กรอกข้อมูลแล้วแจ้งเตือน error ถูกต้อง", () => {
    getInput("ชื่อ *").clear();
    getInput("ที่ตั้ง *").clear();
    getDate("วันเริ่มจัดงาน *").clear();

    clickSaveButton();

    cy.get(".alert.error").should("exist");
    cy.contains(".alert.error li", "กรุณากรอกชื่ออีเวนต์").should("exist");
    cy.contains(".alert.error li", "กรุณากรอกวันเริ่มจัดงาน").should("exist");
    cy.contains(".alert.error li", "กรุณากรอกสถานที่จัดงาน").should("exist");
  });

  // ----------------------------------------------------
  it("EDIT-003 ติ๊กปิดเมื่อบัตรหมด แล้ว Save ผ่าน", () => {
    cy.contains(".ck", "ปิดเมื่อบัตรหมด").find("input").check({ force: true });

    // กรอกข้อมูลให้ครบ
    getInput("ชื่อ *").clear().type("Updated Event");
    getInput("ที่ตั้ง *").clear().type("Impact Arena");
    getInput("เวลาประตูเปิด *").clear().type("17:00");
    getDate("วันเริ่มจัดงาน *").clear().type(iso.start);
    getDate("วันสิ้นสุดงาน *").clear().type(iso.end);

    cy.intercept("PUT", "**/api/events/1", { statusCode: 204 }).as("saveOk");

    clickSaveButton();

    cy.wait("@saveOk");

    cy.get(".toast-item.success").should("exist");
    cy.contains(".toast-item", "แก้ไขอีเวนต์สำเร็จ").should("exist");
  });

  // ----------------------------------------------------
  it("EDIT-004 ไม่ติ๊กปิดเมื่อบัตรหมด ต้องขึ้น error ให้กรอกวันปิดจำหน่าย", () => {
    cy.contains(".ck", "ปิดเมื่อบัตรหมด").find("input").uncheck({ force: true });

    getDT("วันที่และเวลาปิดจำหน่าย *").clear();

    clickSaveButton();

    cy.get(".alert.error").should("exist");
    cy.contains(
      ".alert.error li",
      "กรุณากรอกวันที่และเวลาปิดจำหน่าย หรือเลือกปิดเมื่อบัตรหมด"
    ).should("exist");
  });

  // ----------------------------------------------------
  it("EDIT-005 เพิ่มและลบโซนใน Custom Zone mode", () => {
    // ไป step 2 – รอบของงาน
    cy.contains(".step", "2. รอบของงาน").click();

    // เปลี่ยนรอบแรกเป็น custom zones (ไม่ใช้ template)
    cy.get(".round-row select.inp").first().select("กำหนดโซนเอง");

    // ไป step 3 – โซนตามรอบ
    cy.contains(".step", "3. โซนตามรอบ").click();

    cy.contains("button", "+ เพิ่มโซน").click({ force: true });
    cy.get(".zone-row").should("have.length.greaterThan", 1);

    cy.get(".zone-row").last().find("button.del").click({ force: true });
    cy.get(".zone-row").should("have.length", 1);
  });

  // ----------------------------------------------------
  it("EDIT-006 เซิร์ฟเวอร์ error แล้วต้องแสดง alert error", () => {
    cy.intercept("PUT", "**/api/events/1", { statusCode: 500 }).as("saveFail");

    // stub alert
    cy.window().then((win) => {
      cy.stub(win, "alert").as("alertStub");
    });

    getInput("ชื่อ *").clear().type("Fail Test");

    clickSaveButton();

    cy.wait("@saveFail");

    cy.get("@alertStub").should((stub) => {
      const calls = stub.getCalls().map((c) => c.args[0]);
      expect(calls.join(" | ")).to.match(/บันทึกไม่สำเร็จ/);
    });
  });
});
