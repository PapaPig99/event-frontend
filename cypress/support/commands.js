// นี่ไว้ใช้ในทุกเทสต์ฝั่ง Admin เพื่อปลอมว่า "ล็อกอินแล้ว"
Cypress.Commands.add('seedAdminAuth', () => {
  cy.clearLocalStorage();
  cy.window().then((win) => {
    win.localStorage.setItem('token', 'fake.jwt');
    win.localStorage.setItem(
      'user',
      JSON.stringify({ role: 'ADMIN', email: 'admin@example.com', name: 'Admin' })
    );
  });
  cy.intercept('GET', '/api/auth/me', {
    statusCode: 200,
    body: { role: 'ADMIN', email: 'admin@example.com', name: 'Admin' },
  }).as('me');
});
