## Router Setup

ติดตั้ง Vue Router (v4 สำหรับ Vue 3):

```bash
npm install vue-router
```
### ไฟล์ src/router/index.js
```bash
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/AboutView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
```

### ใช้ใน main.js
```bash
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App)
  .use(router)
  .mount('#app')
```
