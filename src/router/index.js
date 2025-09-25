// src/router/index.ts  (หรือ .js ก็ได้)
import { createRouter, createWebHistory } from 'vue-router'
import { isAuthed, currentUser } from '@/lib/auth'

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
      { path: '/login', name: 'login-virtual', beforeEnter: (to) => { return { name: 'home', query: { ...to.query, login: '1' } }}
},
    ],
  },
// --- Admin zone ---
  { path: '/admin/login', name: 'admin-login', component: () => import('@/pages/admin/Login.vue') },

  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    // ต้องล็อกอิน + ต้องเป็น ADMIN
    meta: { requiresAuth: true, requiresRole: 'ADMIN', adminArea: true },
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

function userHasRole(required) {
  const u = currentUser()
  if (!u) return false
  // รองรับทั้งกรณี role เป็น string เดี่ยว หรือ array จาก backend
  if (Array.isArray(u.role)) return u.role.includes(required)
  if (Array.isArray(u.roles)) return u.roles.includes(required)
  return u.role === required
}

router.beforeEach((to, from, next) => {
  // ต้องล็อกอิน?
  if (to.meta?.requiresAuth && !isAuthed()) {
    // แยกกรณี admin area กับ user area ให้เด้งไป login ที่เหมาะสม
    if (to.meta?.adminArea) {
      return next({ name: 'admin-login', query: { redirect: to.fullPath } })
    }
    return next({ name: 'home', query: { login: '1', redirect: to.fullPath } })
  }

  // ต้องมี role เฉพาะ?
  if (to.meta?.requiresRole) {
    const ok = userHasRole(to.meta.requiresRole)
    if (!ok) {
      // ถ้าเป็นโซนแอดมิน แต่ไม่ใช่ ADMIN → ส่งกลับบ้าน
      return next({ name: 'home' })
    }
  }

  next()
})

export default router