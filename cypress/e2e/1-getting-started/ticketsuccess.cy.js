/// <reference types="cypress" />

Cypress.on('uncaught:exception', () => false)

describe("Payment Success Page (Vue)", () => {

  const EVENT_ID = 1
  const PATH = `/event/${EVENT_ID}/success`

  const mockPayment = {
    paymentReference: "PAY-XYZ-001",
    totalPrice: 450,
    paidAt: "2025-02-15T12:34:56Z"
  }

  function visitWithState(data = mockPayment) {
    cy.visit(PATH, {
      onBeforeLoad(win) {
        // ใส่ history.state.paymentData
        const state = { ...(win.history.state || {}), paymentData: data }
        win.history.replaceState(state, "", win.location.href)
      },
    })

    cy.contains("h1.title", "ชำระเงินสำเร็จ!", { timeout: 8000 }).should("be.visible")
  }

  // ---------------------------------------------------------
  it("SUCCESS-001: โหลดหน้าและแสดงข้อมูลสรุปชำระเงินครบ", () => {
    visitWithState()

    cy.contains(".row .label", "สถานะ")
      .siblings(".value.good")
      .should("contain.text", "ชำระเงินสำเร็จ")

    cy.contains(".row .label", "รหัสการชำระเงิน")
      .siblings(".value")
      .should("contain.text", mockPayment.paymentReference)

    cy.contains(".row .label", "ยอดชำระรวม")
      .siblings(".value")
      .should("contain.text", "450 บาท")

    cy.contains(".row .label", "วันที่ชำระเงิน")
      .siblings(".value")
      .should("not.be.empty")
  })

  // ---------------------------------------------------------
  it("SUCCESS-002: ถ้า refresh แล้วต้องดึงข้อมูลจาก sessionStorage", () => {
    cy.visit(PATH, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem("lastPayment", JSON.stringify(mockPayment))
      }
    })

    cy.contains(".row .label", "รหัสการชำระเงิน")
      .siblings(".value")
      .should("contain.text", mockPayment.paymentReference)
  })

  // ---------------------------------------------------------
  it("SUCCESS-003: ถ้าไม่มีข้อมูลต้องแสดงเป็น —", () => {
    visitWithState(null)

    cy.contains(".row .label", "รหัสการชำระเงิน")
      .siblings(".value")
      .should("have.text", "—")

    cy.contains(".row .label", "ยอดชำระรวม")
      .siblings(".value")
      .should("contain.text", "0 บาท")
  })

  // ---------------------------------------------------------
  it("SUCCESS-004: ปุ่มกลับไปดูรายละเอียดงานต้องไปหน้า event-detail", () => {
    visitWithState()

    cy.contains("กลับไปดูรายละเอียดงาน")
      .should("be.visible")
      .click({ force: true })

    cy.location("pathname").should("eq", `/event/${EVENT_ID}`)
  })

  // ---------------------------------------------------------
  it("SUCCESS-005: ปุ่มดูตั๋วของฉันต้องไปหน้า my-event", () => {
    visitWithState()

    cy.contains("ดูตั๋วของฉัน")
      .should("be.visible")
      .click({ force: true })

    cy.location("pathname").should("match", /\/my-?event$/)
  })
})
