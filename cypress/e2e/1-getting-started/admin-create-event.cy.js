/// <reference types="cypress" />

Cypress.on("uncaught:exception", () => false);

// ---------------- utils ----------------

const inputByLabel = (label) =>
  cy.contains("label", label).parent().find("input.inp");

const selectByLabel = (label) =>
  cy.contains("label", label).parent().find("select.inp");

function goStep(i) {
  cy.get(".step").eq(i).click({ force: true });
}

function uploadTiny(selector) {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

  cy.get(selector).selectFile(
    {
      contents: Cypress.Buffer.from(base64, "base64"),
      fileName: "tiny.png",
      mimeType: "image/png",
    },
    { force: true }
  );
}

// =========================================================
describe("Admin Create Event", () => {

  beforeEach(() => {
    cy.seedAdminAuth();

    // ⭐ FIX #1: Mock templates เพื่อไม่ให้ 500
    cy.intercept("GET", "**/api/zone-templates", {
      statusCode: 200,
      body: [
        { id: 1, name: "Zone A", groupName: "MAIN" },
        { id: 2, name: "Zone B", groupName: "MAIN" },
      ]
    }).as("templates");

    // intercept create
    cy.intercept("POST", "**/api/events**").as("createEvent");

    cy.visit("/admin/create");
    cy.wait("@templates");
  });

  // =========================================================
  it("CE-001: หน้า Create Event โหลดโครงสร้างพื้นฐานถูกต้อง", () => {
    cy.contains("h2", "ข้อมูลอีเวนต์").should("be.visible");
    cy.get(".step").should("have.length", 3);

    goStep(1);
    cy.get(".round-row").should("have.length.at.least", 1);

    goStep(2);
    cy.get(".session-box").should("have.length.at.least", 1);
  });

  // =========================================================
  it("CE-002: ไม่กรอกข้อมูล -> แสดง error ครบทุกช่อง", () => {
    goStep(2);
    cy.contains("button", "Create").click({ force: true });

    cy.get(".alert.error").should("exist");

    [
      "กรุณาอัปโหลดรูปโปสเตอร์",
      "กรุณากรอกชื่ออีเวนต์",
      "กรุณาเลือกหมวดหมู่",
      "กรุณากรอกวันที่และเวลาเปิดจำหน่าย",
      "กรุณากรอกวันที่และเวลาปิดจำหน่าย หรือเลือกปิดเมื่อบัตรหมด",
      "กรุณากรอกวันเริ่มจัดงาน",
      "กรุณากรอกวันสิ้นสุดงาน",
      "กรุณากรอกสถานที่จัดงาน",
    ].forEach((msg) => cy.contains("li", msg).should("exist"));
  });

  // =========================================================
  it('CE-003: Checkbox "ปิดเมื่อบัตรหมด" disable/enable ช่องวันปิดจำหน่าย', () => {
    cy.contains("label", "ปิดเมื่อบัตรหมด")
      .find("input")
      .check({ force: true });

    inputByLabel("วันที่และเวลาปิดจำหน่าย *")
      .should("be.disabled");

    cy.contains("label", "ปิดเมื่อบัตรหมด")
      .find("input")
      .uncheck({ force: true });

    inputByLabel("วันที่และเวลาปิดจำหน่าย *")
      .should("not.be.disabled");
  });

  // =========================================================
  it("CE-004: เพิ่มและลบโซนได้", () => {
    // Step 1: ต้องตั้งโหมดก่อน
    goStep(1);

    cy.get(".round-row")
      .first()
      .find("select.inp")
      .select("กำหนดโซนเอง");

    // ไป Step 2
    goStep(2);

    cy.contains("button", "+ เพิ่มโซน").click().click();

    cy.get(".zone-row").should("have.length.at.least", 2);

    cy.get(".zone-row").last().find(".del").click({ force: true });

    cy.get(".zone-row").should("have.length.greaterThan", 0);
  });


  // =========================================================
  it("CE-005: เพิ่มและลบรอบได้", () => {
    goStep(1);

    cy.contains("button", "+ เพิ่มรอบ").click();

    cy.get(".round-row").should("have.length.at.least", 2);

    cy.get(".round-row").last().find(".del").click({ force: true });

    cy.get(".round-row").should("have.length.at.least", 1);
  });

  // =========================================================
  it("CE-006: อัปโหลด poster แล้ว preview แสดง", () => {
    uploadTiny('.poster input[type="file"]');

    cy.get(".poster .preview img").should("be.visible");
  });

  // =========================================================
  it("CE-007: กรอกข้อมูลครบ & สร้างอีเวนต์สำเร็จ (201)", () => {
    cy.intercept("POST", "**/api/events", {
      statusCode: 201,
      headers: { Location: "/api/events/123" },
      body: {},
    }).as("createOK");

    //
    // ---------- STEP 0: กรอกข้อมูลอีเวนต์ ----------
    //
    uploadTiny('.poster input[type="file"]');

    inputByLabel("ชื่อ *").type("Test Concert");
    selectByLabel("หมวดหมู่ *").select("concert");

    inputByLabel("วันที่และเวลาเปิดจำหน่าย *").type("2025-10-01T10:00");
    inputByLabel("วันที่และเวลาปิดจำหน่าย *").type("2025-10-05T18:00");

    inputByLabel("วันเริ่มจัดงาน *").type("2025-11-01");
    inputByLabel("วันสิ้นสุดงาน *").type("2025-11-02");

    inputByLabel("ที่ตั้ง *").type("Impact Arena");
    inputByLabel("เวลาประตูเปิด *").type("17:00");

    //
    // ---------- STEP 1: กรอกรอบ ----------
    //
    goStep(1);

    cy.get(".round-row")
      .first()
      .within(() => {
        cy.get("input.inp").eq(0).type("Main Day"); // ชื่อรอบ
        cy.get("input.inp").eq(1).type("18:00");    // เวลาเริ่ม
        cy.get("select.inp").select("กำหนดโซนเอง"); // ⬅ ต้องทำใน Step 1!!
      });

    //
    // ---------- STEP 2: กรอกโซน ----------
    //
    goStep(2);

    cy.get(".zone-row")
      .first()
      .within(() => {
        cy.get("input.inp").eq(0).type("A");              // ชื่อโซน
        cy.get("input.inp").eq(1).clear().type("200");    // จำนวนที่นั่ง
        cy.get("input.inp").eq(2).clear().type("2500");   // ราคา
      });

    //
    // ---------- CREATE ----------
    //
    cy.contains("button", "Create").click({ force: true });

    cy.wait("@createOK");

    cy.get(".toast-item.success").should("exist");
  });


});
