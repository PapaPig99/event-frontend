// cypress/e2e/admin-login.cy.js

Cypress.on('uncaught:exception', () => false); // กัน error JS เล็กน้อยไม่ให้ fail

const LOGIN_PATH = '/admin/login';
const API_ME     = '/api/auth/me';
const API_LOGIN  = '/api/auth/login';

// กัน state ให้เป็น "ยังไม่ล็อกอิน" ทุกครั้ง
function primeUnauthedState() {
  cy.clearLocalStorage();
  cy.intercept('GET', API_ME, { statusCode: 401, body: { message: 'unauthorized' } }).as('me');
}

// กรอกฟอร์ม + submit (จากไฟล์ Vue มี id="username" และ id="password")
function fillAndSubmit(email, pass) {
  cy.get('#username', { timeout: 10000 }).should('be.visible').clear().type(email);
  cy.get('#password').should('be.visible').clear().type(pass);
  cy.get('button[type="submit"]').click();
}

describe('Admin Login E2E', () => {
  beforeEach(() => {
    primeUnauthedState();
  });

  it('LOGIN-001 แสดงหน้า Admin Login เมื่อยังไม่ auth', () => {
    cy.visit(LOGIN_PATH);
    cy.get('#username').should('be.visible');
    cy.get('#password').should('be.visible');
  });

  it('LOGIN-002 Admin login สำเร็จ', () => {
    cy.intercept('POST', API_LOGIN, {
      statusCode: 200,
      body: { token: 'fake.jwt.token', role: 'ADMIN', email: 'admin@example.com', name: 'Admin', userId: 1 },
    }).as('loginAdmin');

    cy.visit(LOGIN_PATH);
    fillAndSubmit('admin@example.com', 'admin123');
    cy.wait('@loginAdmin');

    cy.url().should('include', '/admin');
    cy.window().then(win => {
      expect(win.localStorage.getItem('token')).to.eq('fake.jwt.token');
      const user = JSON.parse(win.localStorage.getItem('user'));
      expect(user.role === 'ADMIN' || (user.roles || []).includes('ADMIN')).to.be.true;
    });
  });

  it('LOGIN-003 User login สำเร็จแต่ไม่ใช่ ADMIN', () => {
    cy.intercept('POST', API_LOGIN, {
      statusCode: 200,
      body: { token: 'user.jwt', role: 'USER', email: 'user@example.com', name: 'User', userId: 2 },
    }).as('loginUser');

    cy.visit(LOGIN_PATH);
    fillAndSubmit('user@example.com', 'user123');
    cy.wait('@loginUser');

    cy.location('pathname').should('eq', '/');
  });

  it('LOGIN-004 Admin login สำเร็จและมี query redirect', () => {
    cy.intercept('POST', API_LOGIN, {
      statusCode: 200,
      body: { token: 'redir.jwt', role: 'ADMIN', email: 'a@x.com', name: 'A', userId: 1 },
    }).as('loginRedir');

    cy.visit(`${LOGIN_PATH}?redirect=/admin/events`);
    fillAndSubmit('a@x.com', 'admin123');
    cy.wait('@loginRedir');

    cy.location('pathname').should('eq', '/admin/events');
  });

  it('LOGIN-005 login ผิดพลาด (credentials invalid)', () => {
    cy.on('window:alert', txt => {
      expect(txt).to.contain('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    });
    cy.intercept('POST', API_LOGIN, { statusCode: 401, body: { message: 'Login failed' } }).as('loginFail');

    cy.visit(LOGIN_PATH);
    fillAndSubmit('wrong@x.com', 'badpass');
    cy.wait('@loginFail');

    cy.location('pathname').should('eq', '/admin/login');
    cy.window().then(win => {
      expect(win.localStorage.getItem('token')).to.be.null;
    });
  });
});
