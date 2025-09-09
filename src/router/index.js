import { createRouter, createWebHistory } from 'vue-router'
import Home from '../AppHome.vue'     // เดี๋ยวเราจะสร้างไฟล์นี้
import Event from '../Event.vue'

const routes = [
    { path: '/', component: Home },
    { path: '/event', component: Event },
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})
