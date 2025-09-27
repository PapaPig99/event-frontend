// cypress.config.js (CommonJS)
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // ใช้ env ถ้ามี, ไม่งั้นค่า local เดิม
    baseUrl: process.env.CYPRESS_baseUrl || 'http://localhost:5173',

    // ตัดตัวอย่าง default ของ Cypress ออกจากการรัน
    excludeSpecPattern: process.env.CI
      ? ['**/1-getting-started/**', '**/2-advanced-examples/**']
      : [],
  },
})
