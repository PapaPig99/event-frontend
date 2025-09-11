import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/AppHome.vue'     // เดี๋ยวเราจะสร้างไฟล์นี้
import Event from '../pages/Event.vue'
import EvenDetail from '../pages/Even-detail.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/event', component: Event },
    { path: '/event/:id', component: EvenDetail, name: 'event-detail', props: true }
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})
