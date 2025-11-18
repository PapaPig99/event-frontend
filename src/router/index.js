// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { isAuthed, currentUser } from '@/lib/auth'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/UserLayout.vue'),
    // ระบุว่า layout นี้ไม่บังคับล็อกอิน
    meta: { public: true },
    children: [
      { path: '', name: 'home', component: () => import('@/pages/AppHome.vue'), meta: { public: true } },

      // ✅ รายการอีเวนต์ — public
      { path: 'event', name: 'event-list', component: () => import('@/pages/Event.vue'), meta: { public: true } },

      // ✅ รายละเอียดอีเวนต์ — public
      { path: 'event/:id', name: 'event-detail', component: () => import('@/pages/Event-detail.vue'), meta: { public: true } },

      // ✅ alias — public
      { path: 'events/:id', name: 'event-detail-alias', component: () => import('@/pages/Event-detail.vue'), meta: { public: true } },
      { path: 'events/:id/view', name: 'event-detail-view', component: () => import('@/pages/Event-detail.vue'), meta: { public: true } },

      // ✅ ผังงาน/คอนเสิร์ต — public (ให้ดูข้อมูลได้)
      { path: 'event/:id/plan', name: 'concert-plan', component: () => import('@/pages/ConcertPlan.vue'), meta: { public: true } },

      // ✅ โซนที่นั่ง — public (แค่ดู; ตอน “จอง” ค่อยเช็คสิทธิ์ใน action หน้าอื่น)
      { path: 'event/:id/seat-zone', name: 'seat-zone', component: () => import('@/pages/seatzone.vue'), props: true, meta: { public: true } },

      // 🔒 งานของฉัน — ต้องล็อกอิน
      { path: 'myevent', name: 'my-event', component: () => import('@/pages/MyEvent.vue'), meta: { requiresAuth: true } },

      // ✅ ชำระเงิน — public (รองรับ guest flow)
      { path: 'event/:id/payment', name: 'payment', component: () => import('@/pages/Payment.vue'), props: true, meta: { public: true } },

      // ✅ สำเร็จ — public (รองรับ guest หลังจ่ายสำเร็จ)
      { path: 'event/:id/success', name: 'ticket-success', component: () => import('@/pages/TicketSuccess.vue'), props: true, meta: { public: true } },

      // ✅ ช่วยเหลือ — public
      { path: 'help', name: 'help', component: () => import('@/pages/Help.vue'), meta: { public: true } },

      // virtual login (เปิด modal จาก home) — public
      { path: '/login', name: 'login-virtual', beforeEnter: (to) => ({ name: 'home', query: { ...to.query, login: '1' } }), meta: { public: true } },
    ],
  },

  // --- Admin zone ---
  { path: '/admin/login', name: 'admin-login', component: () => import('@/pages/admin/Login.vue'), meta: { public: true } },

  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresRole: 'ADMIN', adminArea: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'admin-dashboard', component: () => import('@/pages/admin/Dashboard.vue') },
      { path: 'allevents', name: 'admin-all-events', component: () => import('@/pages/admin/AllEvent.vue') },
      { path: 'create', name: 'admin-create-event', component: () => import('@/pages/admin/CreateEvent.vue') },
      { path: 'events/:id/edit', name: 'admin-edit-event', component: () => import('@/pages/admin/EditEvent.vue') },
      { path: 'events/:id/detail', name: 'admin-events-detail', component: () => import('@/pages/admin/EventDetail.vue') },
      { path: 'check-in', name: 'admin-events-checkin', component: () => import('@/pages/admin/Check-in.vue') },
      { path: 'zones', name: 'admin-events-zones', component: () => import('@/pages/admin/Zones.vue') },
      { path: 'regis-zone/:id', name: 'admin-events-regis-zone', component: () => import('@/pages/admin/RegisZone.vue') },
    ],
  },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/pages/NotFound.vue'), meta: { public: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

function userHasRole(required) {
  const u = currentUser()
  if (!u) return false
  if (Array.isArray(u.role)) return u.role.includes(required)
  if (Array.isArray(u.roles)) return u.roles.includes(required)
  return u.role === required
}

router.beforeEach((to, from, next) => {
  // เส้นทาง public ปล่อยผ่านเลย
  if (to.meta && to.meta.public === true) {
    return next()
  }

  // ต้องล็อกอิน?
  if (to.meta && to.meta.requiresAuth && !isAuthed()) {
    if (to.meta.adminArea) {
      return next({ name: 'admin-login', query: { redirect: to.fullPath } })
    }
    return next({ name: 'home', query: { login: '1', redirect: to.fullPath } })
  }

  // ต้องมี role เฉพาะ?
  if (to.meta && to.meta.requiresRole) {
    const ok = userHasRole(to.meta.requiresRole)
    if (!ok) {
      return next({ name: 'home' })
    }
  }

  next()
})

export default router
