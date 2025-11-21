<template>
  <div>
    <!-------------- Sidebar ----------------------->
    <aside class="sidebar">
      <div class="brand">
        <img :src="logo" alt="JoinUp" />
      </div>

      <nav class="nav">
        <!-- Dashboard -->
        <RouterLink to="/admin/dashboard" class="nav-item" :class="{ active: isActive('/admin/dashboard') }">
          <span class="icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
            </svg>
          </span>
          <span>Dashboard</span>
        </RouterLink>

        <!-- Events (parent) -->
        <button class="nav-item is-button" :class="{ active: isEventsActive }" @click="open.events = !open.events">
          <span class="icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M7 2h2v3H7zM15 2h2v3h-2zM3 7h18v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM5 11h14V9H5z" />
            </svg>
          </span>
          <span>Events</span>
          <span class="chev">{{ open.events ? '▴' : '▾' }}</span>
        </button>

        <!-- Events (submenu) -->
         <!-- (submenu all-event) -->
        <div v-if="open.events" class="submenu">
          <RouterLink :to="{ name: 'admin-all-events' }" class="sub-item"
            :class="{ active: isActive('admin-all-events') }">
            <span class="dot" :class="{ on: isActive('admin-all-events') }"></span>
            <span>All Events</span>
          </RouterLink>
          <!-- (submenu create-event) -->
          <RouterLink :to="{ name: 'admin-create-event' }" class="sub-item"
            :class="{ active: isActive('admin-create-event') }">
            <span class="dot" :class="{ on: isActive('admin-create-event') }"></span>
            <span>Create Event</span>
          </RouterLink>
          <!-- (submenu zones) -->
            <RouterLink :to="{ name: 'admin-events-zones' }" class="sub-item"
            :class="{ active: isActive('admin-events-zones') }">
            <span class="dot" :class="{ on: isActive('admin-events-zones') }"></span>
            <span>Zones</span>
          </RouterLink>
        </div>

        <!-- Check-in -->
        <RouterLink to="/admin/check-in" class="nav-item" :class="{ active: isActive('/admin/check-in') }">
          <span class="icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path
                d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 13.2-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 5.3-5.3a1 1 0 0 1 1.4 1.4l-6 6a1 1 0 0 1-1.4 0z" />
            </svg>
          </span>

          <span>Check-in</span>
        </RouterLink>
      </nav>
    </aside>

    <!-------------- Header ----------------------->
    <header class="topbar">
      <div class="topbar-right">
        <span class="user" v-if="user">
          <span class="username">{{ user.name || user.email }}</span>
        </span>
        <span class="sep" v-if="user"></span>

        <!-- ถ้า login แล้ว = ปุ่ม Logout / ถ้าไม่ = ปุ่ม Login -->
        <button class="Login" @click="user ? doLogout() : goLogin()">
          {{ user ? 'Signout' : 'Signin' }}
        </button>
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
import { reactive, computed, watchEffect, ref, onMounted } from 'vue'
import { currentUser, logout, isAuthed } from '@/lib/auth'

import logo from '@/assets/logo.png'

const route = useRoute()
const router = useRouter()

// สถานะผู้ใช้ปัจจุบัน (อ่านจาก localStorage)
const user = ref(currentUser())

// อัปเดต user เมื่อโหลดหน้า/หรือเมื่อมีการเปลี่ยนแปลงจากหน้าอื่น
onMounted(() => { user.value = currentUser() })
window.addEventListener('storage', () => { user.value = currentUser() }) // เผื่อเปิดหลายแท็บ

// เปิด/ปิดเมนูย่อย
const open = reactive({ events: false })

// เส้นทางที่นับว่าอยู่ใต้ Events
const EVENTS_CHILD_ROUTE_NAMES = ['admin-all-events', 'admin-create-event','admin-events-zones']
const EVENTS_PATH_PREFIXES = ['/admin/events']
const EVENTS_EXTRA_PATHS = ['/admin/create', '/admin/all']

const isEventsActive = computed(() => {
  const byName = typeof route.name === 'string' && EVENTS_CHILD_ROUTE_NAMES.includes(route.name)
  const byPref = EVENTS_PATH_PREFIXES.some(p => route.path.startsWith(p))
  const byExact = EVENTS_EXTRA_PATHS.includes(route.path)
  return byName || byPref || byExact
})

watchEffect(() => { open.events = isEventsActive.value })

function isActive(target) {
  if (typeof target !== 'string') return false
  if (target.startsWith('/')) return route.path === target
  return route.name === target
}

function goLogin() {
  router.push({ name: 'admin-login', query: { redirect: route.fullPath } })
}

function doLogout() {
  // ล้างค่าที่ระบบใช้อยู่จริง ๆ
  logout() // ลบ token + user จาก localStorage (ตาม lib/auth ของคุณ)
  // กันตกค้างเผื่อเคยเก็บ 'auth'
  localStorage.removeItem('auth')

  // อัปเดต state ภายในหน้า
  user.value = null

  // ถ้าอยู่ใน /admin ให้เด้งไปหน้า login แอดมิน ไม่งั้นกลับหน้าแรก
  if (route.fullPath.startsWith('/admin')) {
    router.replace({ name: 'admin-login' })
  } else {
    router.replace({ name: 'home' })
  }
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

html,
body {
  font-family: "IBM Plex Sans Thai", sans-serif;
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
/* ================================
   SIDEBAR 
================================ */
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--sidebar-w);
  background: #222;
  border-right: 1px solid #2c2c2c;
  z-index: 40;
}

.brand {
  padding: 20px 12px;
  display: flex;
  justify-content: center;
}

.brand img {
  height: 50px;
  width: auto;
  opacity: 0.9;
}


/* ================================
   TOPBAR 
================================ */
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-h);

  background: #ffffff;
  color: #111;

  display: flex;
  align-items: center;
  z-index: 30;

  border-bottom: 1px solid #e1e1e1;
}

.topbar-right {
  margin-left: var(--sidebar-w);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 clamp(14px, 3vw, 22px);
  flex: 1;
  justify-content: flex-end;
}

/* Username */
.user {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #333;
}

.username {
  font-weight: 500;
  letter-spacing: .1px;
}

.sep {
  width: 2px;
  height: 18px;
  background: #000000;
  border-radius: 2px;
}


/* ================================
   Logout Button (Minimal)
================================ */
.Login {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: .2px;
  padding: 6px 14px;
  border-radius: 4px;

  background: #f2f2f2;
  color: #111;
  border: 1px solid #ddd;

  cursor: pointer;
  transition: background .15s ease, border-color .15s ease;
}

.Login:hover {
  background: #e8e8e8;
  border-color: #ccc;
}

.Login:active {
  background: #ddd;
}

.Login:focus-visible {
  outline: none !important;
}


/* ================================
   CONTENT
================================ */
.content {
  padding-top: var(--header-h);
  padding-left: var(--sidebar-w);
  min-height: 100vh;
  background: #fafafa;
  padding-right: 10px;
  padding-bottom: 24px;
}


/* ================================
   NAVIGATION (Minimal)
================================ */
.nav {
  padding: 10px 0 18px;
  font-size: 16px;
}

.nav-item,
.sub-item {
  font-weight: 400;
  line-height: 1.15;
  color: #f0f0f0;
}

/* Main nav item */
.nav-item {
  width: 80%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  text-decoration: none;
  border-left: 3px solid transparent;
  margin-left: 15px;
  color: #efefef;

  transition: background .15s ease;
}

.nav-item:hover {
  background: #2d2d2d;
}

.nav-item.active {
  background: #FF3336;
  border-left-color: #ff3336;
  font-weight: 600;
  color: #fff;
}

button.nav-item.is-button {
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  font-size: 16px;
  border-left: 3px solid transparent;
}

button.nav-item.is-button.active {
  background: #FF3336;
  border-left-color: #ff3336;
  color: #ffffff;
}

button.nav-item.is-button.active .chev {
  color: #ffffff;
}

/* Icon */
.icon {
  width: 18px;
  color: #ccc;
}

.nav-item.active .icon {
  color: #fff;
}

/* Submenu */
.submenu {
  margin-left: 35px;
  margin-top: 10px;
  margin-bottom: 10px;
}

/* Sub-item */
.sub-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 14px;
  color: #b9b9b9;
  text-decoration: none;
}

.sub-item:hover {
  color: #ddd;
}

.sub-item.active {
  color: #FF3336;
  font-weight: 500;

}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c1c7cf;

}

.dot.on {
  background: #ff3336;
}
</style>
