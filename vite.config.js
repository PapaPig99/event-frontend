import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
   server: {
    proxy: {
      '/api':    { target: 'http://localhost:3137', changeOrigin: true },
      '/images': { target: 'http://localhost:3137', changeOrigin: true }
    }
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  }
})
