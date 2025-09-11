import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {                 // ทุกคำขอที่ขึ้นต้นด้วย /api
        target: 'http://localhost:8080', // URL backend Spring
        changeOrigin: true
      }
    }
  }
})
