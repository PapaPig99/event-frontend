import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {                 // ทุกคำขอที่ขึ้นต้นด้วย /api
        target: 'http://localhost:3137', // URL backend Spring
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  }
})


