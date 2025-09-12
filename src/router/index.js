// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

// ✅ export แบบ named และ default ให้ครบ
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',          name: 'home',         component: () => import('../pages/AppHome.vue') },
    { path: '/event',     name: 'event-list',   component: () => import('../pages/Event.vue') },
    // แก้ชื่อไฟล์ที่สะกดผิด: Even-detail.vue -> EventDetail.vue
    { path: '/event/:id', name: 'event-detail', component: () => import('../pages/Event-detail.vue') },

    { path: '/myevent',   name: 'my-event',     component: () => import('../pages/MyEvent.vue') },
    { path: '/help',      name: 'help',         component: () => import('../pages/Help.vue') },

    // กันหลงทาง
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFound.vue') },
  ],
})

export default router
