// src/router/index.ts  (หรือ .js ก็ได้)
import { createRouter, createWebHistory } from 'vue-router'
import { isAuthed } from '@/lib/auth'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/UserLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/pages/AppHome.vue') },
      { path: 'event', name: 'event-list', component: () => import('@/pages/Event.vue') },


      { path: 'event/:id', name: 'event-detail', component: () => import('@/pages/Event-detail.vue'), props: true },
      // 🔒 ต้องล็อกอิน
      { path: 'events/:id', name: 'event-detail-alias', component: () => import('@/pages/Event-detail.vue'), props: true },
      // 🔒 ต้องล็อกอินจริง ๆ เฉพาะ flow เข้าร่วม/เลือกที่นั่ง/งานของฉัน
      { path: 'event/:id/plan', name: 'concert-plan', component: () => import('@/pages/ConcertPlan.vue'), props: true, meta: { requiresAuth: true } },
      { path: 'event/:id/seat-zone', name: 'seat-zone', component: () => import('@/pages/seatzone.vue'), props: true, meta: { requiresAuth: true } },
      { path: 'myevent', name: 'my-event', component: () => import('@/pages/MyEvent.vue'), meta: { requiresAuth: true } },

      { path: 'help', name: 'help', component: () => import('@/pages/Help.vue') },
      {
        path: '/login', name: 'login-virtual', beforeEnter: (to) => { return { name: 'home', query: { ...to.query, login: '1' } } }
      },

      {
        path: 'event/:id/payment',
        name: 'payment',
        component: () => import('@/pages/Payment.vue'), // ให้ชื่อไฟล์ตรงจริง (ตัวเล็ก/ใหญ่ด้วย).
        props: true,
        meta: { requiresAuth: true }
      },

      { path: 'myevent', name: 'my-event', component: () => import('@/pages/MyEvent.vue'), meta: { requiresAuth: true } },

      { path: 'help', name: 'help', component: () => import('@/pages/Help.vue') },
      { path: '/login', name: 'login-virtual', beforeEnter: (to) => ({ name: 'home', query: { ...to.query, login: '1' } }) },
    ],
  },

  { path: '/admin/login', name: 'admin-login', component: () => import('@/pages/admin/Login.vue') },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    children: [
      { path: '', redirect: '/admin/overview' },
      { path: 'overview', name: 'admin-overview', component: () => import('@/pages/admin/Overview.vue') },
      { path: 'allevents', name: 'admin-all-events', component: () => import('@/pages/admin/AllEvent.vue') },
      { path: 'create', name: 'admin-create-event', component: () => import('@/pages/admin/CreateEvent.vue') },
      { path: 'events/:id/edit', name: 'admin-edit-event', component: () => import('@/pages/admin/EditEvent.vue') },
      { path: 'events/:id/detail', name: 'admin-events-detail', component: () => import('@/pages/admin/EventDetail.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/pages/NotFound.vue') },
]



const router = createRouter({
  history: createWebHistory(),
  routes,
})

const TOKEN_KEY = 'token'

router.beforeEach((to, from, next) => {
  if (to.meta?.requiresAuth) {
    const hasToken = !!localStorage.getItem(TOKEN_KEY)
    if (!hasToken) {
      return next({ name: 'home', query: { login: '1', redirect: to.fullPath } })
    }
  }
  next()
})


export default router
