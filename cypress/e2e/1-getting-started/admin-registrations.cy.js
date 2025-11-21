// cypress/e2e/admin/admin-registrations.cy.js

describe("REG-000: Admin Registrations list & filters (Main Suite)", () => {
  const eventId = 1;

  const mockSessions = [
    {
      id: 1,
      name: "รอบบ่าย",
      startTime: "2025-12-01T13:00:00",
    },
    {
      id: 2,
      name: "รอบเย็น",
      startTime: "2025-12-01T18:00:00",
    },
  ];

  const mockRegistrationsSession1 = [
    {
      id: 1,
      email: "paid_checked@example.com",
      zoneName: "A1",
      price: 1500,
      ticketCode: "MAIRA-001",
      paymentReference: "REF-PAID-1",
      paidAt: "2025-11-21T10:00:00",
      paymentStatus: "PAID",
      isCheckedIn: true,
    },
    {
      id: 2,
      email: "paid_unchecked@example.com",
      zoneName: "B1",
      price: 1200,
      ticketCode: "MAIRA-002",
      paymentReference: "REF-PAID-2",
      paidAt: "2025-11-21T10:05:00",
      paymentStatus: "PAID",
      isCheckedIn: false,
    },
    {
      id: 3,
      email: "unpaid_unchecked@example.com",
      zoneName: "C1",
      price: 900,
      ticketCode: "MAIRA-003",
      paymentReference: "REF-UNPAID-1",
      paidAt: null,
      paymentStatus: "PENDING",
      isCheckedIn: false,
    },
  ];

  const mockRegistrationsSession2 = [
    {
      id: 4,
      email: "evening_paid@example.com",
      zoneName: "D1",
      price: 2000,
      ticketCode: "EVENING-001",
      paymentReference: "REF-PAID-3",
      paidAt: "2025-11-21T11:00:00",
      paymentStatus: "PAID",
      isCheckedIn: false,
    },
  ];

  beforeEach(() => {
    cy.intercept("GET", /\/events\/\d+$/, (req) => {
      req.reply({
        statusCode: 200,
        body: {
          id: eventId,
          title: "Mock Event",
          sessions: mockSessions,
        },
      });
    }).as("getEvent");

    cy.intercept(
      "GET",
      /\/registrations\/event\/\d+\/session\/\d+$/,
      (req) => {
        const isFirstSession = /\/session\/1$/.test(req.url);

        req.reply({
          statusCode: 200,
          body: isFirstSession
            ? mockRegistrationsSession1
            : mockRegistrationsSession2,
        });
      }
    ).as("getRegs");

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("token", "test-token");
        win.localStorage.setItem(
          "user",
          JSON.stringify({
            token: "test-token",
            userId: 1,
            email: "admin@example.com",
            name: "Admin User",
            role: "ADMIN",
            roles: ["ADMIN"],
          })
        );
      },
    });

    cy.visit(`/admin/regis-zone/${eventId}`);

    cy.wait("@getEvent");
    cy.wait("@getRegs");
  });

  // ---------------------------------------------------------------------------------------
  // TEST CASES WITH QA NAMES
  // ---------------------------------------------------------------------------------------

  it("REG-001: โหลดรายการการจองของ Session แรกสำเร็จเมื่อ Admin เปิดหน้า RegisZone", () => {
    cy.get("table.table").should("exist");
    cy.get("table.table tbody tr").should(
      "have.length",
      mockRegistrationsSession1.length
    );

    cy.get("table.table tbody tr")
      .eq(0)
      .within(() => {
        cy.contains("paid_checked@example.com");
        cy.contains("A1");
        cy.contains("MAIRA-001");
        cy.contains("REF-PAID-1");
        cy.contains("PAID");
        cy.contains("CHECKED");
      });
  });

  it("REG-002: ค้นหา Ticket Code แล้วควรแสดงผลลัพธ์ถูกต้องตามที่ค้นหา", () => {
    cy.contains("label", "ค้นหา Ticket Code")
      .parent()
      .find("input")
      .as("searchInput");

    cy.get("@searchInput").type("MAIRA-002");

    cy.get("table.table tbody tr").should("have.length", 1);
    cy.get("table.table tbody tr")
      .eq(0)
      .within(() => {
        cy.contains("MAIRA-002");
        cy.contains("paid_unchecked@example.com");
      });

    cy.get("@searchInput").clear();
    cy.get("table.table tbody tr").should(
      "have.length",
      mockRegistrationsSession1.length
    );
  });

  it("REG-003: กรองสถานะการชำระเงิน (PAID / UNPAID) แล้วควรแสดงเฉพาะข้อมูลที่ตรงเงื่อนไข", () => {
    cy.contains("label", "สถานะชำระเงิน")
      .parent()
      .find("select")
      .as("paySelect");

    cy.get("@paySelect").select("PAID");
    cy.get("table.table tbody tr").should("have.length", 2);
    cy.get("table.table tbody tr").each(($tr) => {
      cy.wrap($tr).contains("PAID");
    });

    cy.get("@paySelect").select("UNPAID");
    cy.get("table.table tbody tr").should("have.length", 1);
    cy.get("table.table tbody tr").eq(0).contains("PENDING");

    cy.get("@paySelect").select("");
    cy.get("table.table tbody tr").should(
      "have.length",
      mockRegistrationsSession1.length
    );
  });

  it("REG-004: กรองสถานะเช็กอิน (CHECKED / UNCHECKED) แล้วควรแสดงข้อมูลถูกต้อง", () => {
    cy.contains("label", "เช็กอิน")
      .parent()
      .find("select")
      .as("checkinSelect");

    cy.get("@checkinSelect").select("CHECKED");
    cy.get("table.table tbody tr").should("have.length", 1);
    cy.get("table.table tbody tr").eq(0).contains("CHECKED");

    cy.get("@checkinSelect").select("UNCHECKED");
    cy.get("table.table tbody tr").should("have.length", 2);
    cy.get("table.table tbody tr").each(($tr) => {
      cy.wrap($tr).contains("NOT CHECKED");
    });

    cy.get("@checkinSelect").select("");
    cy.get("table.table tbody tr").should(
      "have.length",
      mockRegistrationsSession1.length
    );
  });

  it("REG-005: เปลี่ยน Session แล้วควรโหลดรายการการจองของ Session ใหม่สำเร็จ", () => {
    cy.contains("label", "Session")
      .parent()
      .find("select")
      .as("sessionSelect");

    cy.get("@sessionSelect").select("รอบเย็น (2025-12-01T18:00:00)");

    cy.wait("@getRegs");

    cy.get("table.table tbody tr").should("have.length", 1);
    cy.get("table.table tbody tr")
      .eq(0)
      .within(() => {
        cy.contains("evening_paid@example.com");
        cy.contains("EVENING-001");
      });
  });
});
