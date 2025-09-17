// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { isAuthed } from '@/lib/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ===== Zone Public =====
    {
      path: '/',
      component: () => import('@/layouts/UserLayout.vue'),
      children: [
        { path: '',            name: 'home',        component: () => import('@/pages/AppHome.vue') },
        { path: 'event',       name: 'event-list',  component: () => import('@/pages/Event.vue') },
        { path: 'event/:id',   name: 'event-detail', component: () => import('@/pages/Event-detail.vue'), props: true },
        { path: 'event/:id/plan',     name: 'concert-plan', component: () => import('@/pages/ConcertPlan.vue'), props: true },
        { path: 'event/:id/seat-zone', name: 'seat-zone',   component: () => import('@/pages/seatzone.vue'), props: true },
        { path: 'myevent',     name: 'my-event',    component: () => import('@/pages/MyEvent.vue') },
        { path: 'help',        name: 'help',        component: () => import('@/pages/Help.vue') },
      ],
    },

    // ===== Zone Admin =====
    { path: '/admin/login', name: 'admin-login', component: () => import('@/pages/admin/Login.vue') },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        { path: '', redirect: '/admin/overview' },
        { path: 'overview',       name: 'admin-overview',     component: () => import('@/pages/admin/Overview.vue') },
        { path: 'allevents',      name: 'admin-all-events',   component: () => import('@/pages/admin/AllEvent.vue') },
        { path: 'create',         name: 'admin-create-event', component: () => import('@/pages/admin/CreateEvent.vue') },
        { path: 'events/:id/edit',name: 'admin-edit-event',   component: () => import('@/pages/admin/edit-event.vue'), props: true },
      ],
    },

    // 404
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/pages/NotFound.vue') },
  ],
})

// Guard: ถ้า route ไหนติด meta.requiresAuth และยังไม่ล็อกอิน → เด้งกลับหน้าแรก พร้อมเปิด modal login
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthed()) {
    return { name: 'home', query: { login: 1, redirect: to.fullPath } }
  }
  return true
})

export default router
