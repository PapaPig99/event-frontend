import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Public
    { path: '/',                    name: 'home',           component: () => import('../pages/AppHome.vue') },
    { path: '/event',               name: 'event-list',     component: () => import('../pages/Event.vue') },
    { path: '/event/:id',           name: 'event-detail',   component: () => import('../pages/Event-detail.vue'), props: true },
    { path: '/event/:id/plan',      name: 'concert-plan',   component: () => import('../pages/ConcertPlan.vue'),  props: true },
    { path: '/event/:id/seat-zone', name: 'seat-zone',      component: () => import('../pages/seatzone.vue'),     props: true },

    { path: '/myevent',             name: 'my-event',       component: () => import('../pages/MyEvent.vue') },
    { path: '/help',                name: 'help',           component: () => import('../pages/Help.vue') },

    // Admin
    { path: '/admin',                       name: 'admin-login',    component: () => import('../Admin/login.vue') },
    { path: '/create-event',                name: 'create-event',   component: () => import('../Admin/create-event.vue') },
    { path: '/admin/events/:id/edit',       name: 'admin-edit-event', component: () => import('../Admin/edit-event.vue'), props: true },

    // 404 (catch-all)
    { path: '/:pathMatch(.*)*',     name: 'not-found',      component: () => import('../pages/NotFound.vue') },
  ],
})

export default router
