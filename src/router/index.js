// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/AppHome.vue'     // เดี๋ยวเราจะสร้างไฟล์นี้
import Event from '../pages/Event.vue'
import EvenDetail from '../pages/Event-detail.vue'
import ConcertPlan from '../pages/ConcertPlan.vue' 
import SeatZone from '../pages/seatzone.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/event', component: Event },
    { path: '/event/:id', component: EvenDetail, name: 'event-detail', props: true },
    { path: '/event/:id/plan', component: ConcertPlan, name: 'concert-plan', props: true },
    { path: '/event/:id/seat-zone', component: SeatZone, name: 'seat-zone', props: true }
]

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',          name: 'home',         component: () => import('../pages/AppHome.vue') },
    { path: '/event',     name: 'event-list',   component: () => import('../pages/Event.vue') },
    // แก้ชื่อไฟล์ที่สะกดผิด: Even-detail.vue -> EventDetail.vue
    { path: '/event/:id', name: 'event-detail', component: () => import('../pages/Event-detail.vue') },

    { path: '/myevent',   name: 'my-event',     component: () => import('../pages/MyEvent.vue') },
    { path: '/help',      name: 'help',         component: () => import('../pages/Help.vue') },
    { path: '/admin',   name: 'admin',     component: () => import('../Admin/login.vue') },
    { path: '/create-event',   name: 'admin',     component: () => import('../Admin/create-event.vue') },

    // กันหลงทาง
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFound.vue') },
  ],
})

export default router
