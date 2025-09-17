<template>
  <div>
    <!-------------- Sidebar ----------------------->
    <aside class="sidebar">
      <div class="brand">
        <img :src="logo" alt="JoinUp" />
      </div>

      <nav class="nav">
        <!-- Overview -->
        <RouterLink
          to="/admin/overview"
          class="nav-item"
          :class="{ active: isActive('/admin/overview') }"
        >
          <span class="icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
            </svg>
          </span>
          <span>Overview</span>
        </RouterLink>

        <!-- Events (parent) -->
        <button
          class="nav-item is-button"
          :class="{ active: isEventsActive }"
          @click="open.events = !open.events"
        >
          <span class="icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M7 2h2v3H7zM15 2h2v3h-2zM3 7h18v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM5 11h14V9H5z" />
            </svg>
          </span>
          <span>Events</span>
          <span class="chev">{{ open.events ? '▴' : '▾' }}</span>
        </button>

        <!-- Events (submenu) -->
        <div v-if="open.events" class="submenu">
          <RouterLink
            :to="{ name: 'admin-all-events' }"
            class="sub-item"
            :class="{ active: isActive('admin-all-events') }"
          >
            <span class="dot" :class="{ on: isActive('admin-all-events') }"></span>
            <span>All Events</span>
          </RouterLink>

          <RouterLink
            :to="{ name: 'admin-create-event' }"
            class="sub-item"
            :class="{ active: isActive('admin-create-event') }"
          >
            <span class="dot" :class="{ on: isActive('admin-create-event') }"></span>
            <span>Create Event</span>
          </RouterLink>
        </div>
      </nav>
    </aside>

    <!-------------- Header ----------------------->
    <header class="topbar">
      <div class="topbar-right">
        <span class="user">
          <img :src="avatar" alt="avatar" class="avatar" />
          <span class="username">{{ username }}</span>
        </span>
        <span class="sep"></span>
        <button class="Login" @click="goLogin">Login</button>
      </div>
    </header>

    <!-- Content -->
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { reactive, computed, watchEffect } from 'vue'

import logo from '@/assets/logo.png'
import avatar from '@/assets/Avatar.png'

const username = 'Username'
const route = useRoute()
const router = useRouter()

// เปิด/ปิดเมนูย่อย
const open = reactive({ events: false })

// เส้นทางที่นับว่าอยู่ใต้ Events (ชื่อ route + path)
const EVENTS_CHILD_ROUTE_NAMES = ['admin-all-events', 'admin-create-event']
const EVENTS_PATH_PREFIXES = ['/admin/events']            // prefix มาตรฐาน
const EVENTS_EXTRA_PATHS   = ['/admin/create', '/admin/all'] // ถ้าโปรเจกต์มี path แบบนี้

// Events จะ active ถ้า route ปัจจุบันอยู่ในกลุ่มนี้
const isEventsActive = computed(() => {
  const byName  = typeof route.name === 'string' && EVENTS_CHILD_ROUTE_NAMES.includes(route.name)
  const byPref  = EVENTS_PATH_PREFIXES.some(p => route.path.startsWith(p))
  const byExact = EVENTS_EXTRA_PATHS.includes(route.path)
  return byName || byPref || byExact
})

// กางอัตโนมัติเมื่ออยู่หน้าลูกของ Events
watchEffect(() => { open.events = isEventsActive.value })

// ใช้กับลิงก์ทั่วไป/โดยชื่อ
function isActive(target) {
  if (typeof target !== 'string') return false
  if (target.startsWith('/')) return route.path === target
  return route.name === target
}

function goLogin() {
  router.push('/admin/login')
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap');

:root {
  --red: #FF3336;
  --red-50: #FFE9EA;
  --text: #6A6A6A;
  --muted: #9aa0a6;
  --sidebar-w: 240px;
  --header-h: 60px;
}

html, body {
  font-family: "IBM Plex Sans Thai", sans-serif;
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
/* ===== Fixed layout ===== */
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--sidebar-w);
  background: #fff;
  border-right: 1px solid #eee;
  z-index: 40;
  
}

.brand { padding: 18px 12px 20px; display: flex; justify-content: center; }
.brand img { height: 60px; width: auto; display: block; }

.topbar {
  position: fixed; top: 0; left: 0; right: 0; height: var(--header-h);
  background: #FF3336; color: #fff; display: flex; align-items: center;
  z-index: 30; box-shadow: 0 1px 6px rgba(0,0,0,.12); font-weight: 500;
}

.topbar-right {
  margin-left: var(--sidebar-w);
  display: flex; align-items: center; gap: 18px; padding: 0 24px;
  flex: 1; justify-content: flex-end;
}

.user { 
  display: flex; 
  align-items: 
  center; gap: 10px;
  font-size: 18px;
 }
.avatar { 
  width: 20px; 
  height: 20px; 
  border-radius: 50%; 
  object-fit: cover; 
  background: rgba(180, 30, 30, 0.25); }
.username { font-weight: 400; opacity: .95; }

.sep { 
  width: 2px; 
  height: 22px; 
  background: #fff; 
  display: inline-block; }

.Login { 
  font-size: 18px;
  background: transparent; 
  border: none; 
  color: #fff; 
  font-weight: 400; cursor: pointer; }
.Login:hover { text-decoration: underline; }

.content {
  padding-top: var(--header-h);
  padding-left: var(--sidebar-w);
  min-height: 100vh;
  background: #f7f7f7;
  padding-right: 10px;
  padding-bottom: 24px;
}

/* ===== Nav styles ===== */
.nav { padding: 6px 0 18px; font-size: 18px; }

.nav-item, .sub-item {
  font-weight: 500; 
  line-height: 1.1; 
  letter-spacing: 0; 
  color: var(--text);
}

.nav-item {
  width: 80%; 
  display: flex; 
  align-items: center; 
  gap: 5px;
  padding: 10px 12px; text-decoration: none; border-left: 4px solid transparent;
  margin-left: 15px;
}

/* Overview Active*/
.nav-item.active {
  color: #FF787A;
  background: var(--red-50);
  border-left-color: var(--red);
  border-left-width: 5px;
  font-weight: 700;
}

/* Events Active*/

button.nav-item.is-button.active {
  color: #FF787A;
  background: var(--red-50);
  border-left-color: var(--red);
  border-left-width: 5px;
  font-weight: 700;
  margin-left: 15px;
  
}
button.nav-item.is-button.active .chev {
  color: #FF3336;
}
.nav-item.is-button {
  background: none; 
  border: 0; 
  cursor: pointer; 
  text-align: left; 
  font-weight: 410;
  font-size: 18px;
  border-left: 4px solid transparent;
}

.icon { width: 20px; color: #6b7280; }
.nav-item.active .icon { color: #FF787A; }

/* Submenu */
.submenu { margin-left: 20px; margin-top: 6px; }

.sub-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; 
  text-decoration: none;
  font-size: 15px;
  color:#999999;
}
.sub-item.active {
  color:#FF3336;
}

.dot { width: 6px; height: 6px; border-radius: 50%; background: #c1c7cf; }
.dot.on { background: var(--red); }


</style>
