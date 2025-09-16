import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue' // ใช้ @ ได้ถ้ามี alias ใน vite

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ===== Public =====
    { path: '/',                  name: 'home',               component: () => import('@/pages/AppHome.vue') },
    { path: '/event',             name: 'event-list',         component: () => import('@/pages/Event.vue') },
    { path: '/event/:id',         name: 'event-detail',       component: () => import('@/pages/Event-detail.vue'), props: true },
    { path: '/event/:id/plan',    name: 'concert-plan',       component: () => import('@/pages/ConcertPlan.vue'), props: true },
    { path: '/event/:id/seat-zone', name: 'seat-zone',        component: () => import('@/pages/seatzone.vue'),    props: true },
    { path: '/myevent',           name: 'my-event',           component: () => import('@/pages/MyEvent.vue') },
    { path: '/help',              name: 'help',               component: () => import('@/pages/Help.vue') },

    // ===== Admin (ใช้ AdminLayout ครอบ) =====
    {
      path: '/admin',
      component: AdminLayout,
      children: [
        { path: '', redirect: { name: 'admin-all-events' } }, // เข้า /admin แล้วไป All Events
        { path: 'login',     name: 'admin-login',        component: () => import('@/pages/admin/Login.vue') },
        { path: 'allevents', name: 'admin-all-events',   component: () => import('@/pages/admin/AllEvent.vue') },
        { path: 'create',    name: 'admin-create-event', component: () => import('@/pages/admin/CreateEvent.vue') },
        { path: 'events/:id/edit', name: 'admin-edit-event', component: () => import('@/pages/admin/edit-event.vue'), props: true },
      ],
    },

    // 404
    { path: '/:pathMatch(.*)*',   name: 'not-found',          component: () => import('@/pages/NotFound.vue') },
  ],
})

export default router
