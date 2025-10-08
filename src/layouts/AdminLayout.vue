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
        <span class="user" v-if="user">
          <img :src="avatar" alt="avatar" class="avatar" />
          <span class="username">{{ user.name || user.email }}</span>
        </span>
        <span class="sep" v-if="user"></span>

        <!-- ถ้า login แล้ว = ปุ่ม Logout / ถ้าไม่ = ปุ่ม Login -->
        <button
          class="Login"
          @click="user ? doLogout() : goLogin()"
        >
          {{ user ? 'Logout' : 'Login' }}
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
import avatar from '@/assets/Avatar.png'

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
const EVENTS_CHILD_ROUTE_NAMES = ['admin-all-events', 'admin-create-event']
const EVENTS_PATH_PREFIXES = ['/admin/events']
const EVENTS_EXTRA_PATHS   = ['/admin/create', '/admin/all']

const isEventsActive = computed(() => {
  const byName  = typeof route.name === 'string' && EVENTS_CHILD_ROUTE_NAMES.includes(route.name)
  const byPref  = EVENTS_PATH_PREFIXES.some(p => route.path.startsWith(p))
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

/* ===== Topbar (สวยขึ้นแต่ layout เดิม) ===== */
.topbar {
  position: fixed; top: 0; left: 0; right: 0; height: var(--header-h);
  background: #FF3336;
  color: #fff; display: flex; align-items: center;
  z-index: 30;
  box-shadow: 0 2px 12px rgba(0,0,0,.12);
}

.topbar-right {
  margin-left: var(--sidebar-w);
  display: flex; align-items: center; gap: 16px;
  padding: 0 clamp(16px,3vw,24px);
  flex: 1; justify-content: flex-end;
}

.user { display: flex; align-items: center; gap: 10px; font-size: 16px; }
.avatar {
  width: 28px; height: 28px; border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 1px 4px rgba(0,0,0,.12) inset;
}
.username { font-weight: 600; opacity: .95; letter-spacing: .2px; }

.sep { width: 1px; height: 24px; background: rgba(255,255,255,.6); display: inline-block; }

/* ===== ปุ่มบนท็อปบาร์ (Login/Logout) ===== */
.Login {
  font-size: 15px; font-weight: 600; letter-spacing: .2px;
  padding: 6px 14px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,.6);
  background: rgba(255,255,255,.14); color: #fff;
  cursor: pointer;
  transition: transform .12s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.Login:hover { background: rgba(255,255,255,.28); border-color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.Login:active { transform: translateY(1px); }
.Login:focus-visible { outline: 3px solid rgba(255,255,255,.7); outline-offset: 2px; }


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

.nav-item, .sub-item { font-weight: 500; line-height: 1.1; letter-spacing: 0; color: var(--text); }

.nav-item {
  width: 80%;
  display: flex; align-items: center; gap: 5px;
  padding: 10px 12px; text-decoration: none; border-left: 4px solid transparent;
  margin-left: 15px;
}

.nav-item.active {
  color: #FF787A;
  background: var(--red-50);
  border-left-color: var(--red);
  border-left-width: 5px;
  font-weight: 700;
}

button.nav-item.is-button.active {
  color: #FF787A;
  background: var(--red-50);
  border-left-color: var(--red);
  border-left-width: 5px;
  font-weight: 700;
  margin-left: 15px;
}
button.nav-item.is-button.active .chev { color: #FF3336; }

.nav-item.is-button {
  background: none; border: 0; cursor: pointer; text-align: left; font-weight: 410;
  font-size: 18px; border-left: 4px solid transparent;
}

.icon { width: 20px; color: #6b7280; }
.nav-item.active .icon { color: #FF787A; }

.submenu { margin-left: 20px; margin-top: 6px; }

.sub-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; text-decoration: none; font-size: 15px; color:#999999;
}
.sub-item.active { color:#FF3336; }

.dot { width: 6px; height: 6px; border-radius: 50%; background: #c1c7cf; }
.dot.on { background: var(--red); }
</style>
