<template>
  <div>
    <!-------------- Sidebar ----------------------->
    <aside class="sidebar">
      <div class="brand">
        <img :src="logo" alt="JoinUp" />
      </div>

      <nav class="nav">
        <!-- Overview -->
        <RouterLink to="/admin/overview" class="nav-item" :class="{ active: isActive('/admin/overview') }">
          <span class="icon">
            <!-- grid icon -->
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
            </svg>
          </span>
          <span>Overview</span>
        </RouterLink>

        <!-- Events (parent) -->
        <button class="nav-item is-button" :class="{ active: route.path.startsWith('/admin/events') }"
          @click="open.events = !open.events">
          <span class="icon">
            <!-- calendar icon -->
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M7 2h2v3H7zM15 2h2v3h-2zM3 7h18v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM5 11h14V9H5z" />
            </svg>
          </span>
          <span>Events</span>
          <span class="chev">{{ open.events ? '▴' : '▾' }}</span>
        </button>

        <!-- Events (submenu-ALL Event) -->
        <div v-if="open.events" class="submenu">
          <RouterLink :to="{ name: 'admin-all-events' }" class="sub-item"
            :class="{ active: isActive('admin-all-events') }">
            <span class="dot" :class="{ on: isActive('admin-all-events') }"></span>
            <span>All Events</span>
          </RouterLink>
        <!-- Events (submenu-Create Event) -->
          <RouterLink :to="{ name: 'admin-create-event' }" class="sub-item"
            :class="{ active: isActive('admin-create-event') }">
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
        <button class="signout" @click="goLogin">Signout</button>
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
import { reactive } from 'vue'

import logo from '@/assets/logo.png'
import avatar from '@/assets/Avatar.png'

const username = 'Username'
const route = useRoute()
const router = useRouter()

const open = reactive({
  events: route.path.startsWith('/admin/events'),
})

function isActive(path) {
  return route.path === path
}
function goLogin() {
  router.push('/admin/login')
}
</script>

<style>
:root {
  --red: #FF3336;
  --red-50: #FFE9EA;
  --text: #444;
  --muted: #9aa0a6;
  --sidebar-w: 240px;
  --header-h: 60px;
  /* ← ปรับตรงนี้ */
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
  overflow-y: auto;
}

.brand {
  padding: 18px 12px 8px;
  display: flex;
  justify-content: center;
}

.brand img {
  height: 60px;
  width: auto;
  display: block;
}

.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-h);
  background: #FF3336;
  color: #fff;
  display: flex;
  align-items: center;
  z-index: 30;
  box-shadow: 0 1px 6px rgba(0, 0, 0, .12);
}

.topbar-right {
  margin-left: var(--sidebar-w);
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0px 24px;
  flex: 1;
  justify-content: flex-end;
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  background: rgba(255, 255, 255, .25);
}

.username {
  font-weight: 600;
  opacity: .95;
}

.sep {
  width: 2px;
  height: 22px;
  background: #fff;
  display: inline-block;
}

.signout {

  background: transparent;
  border: none;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.signout:hover {
  text-decoration: underline;
}

.content {
  padding-top: var(--header-h);
  padding-left: var(--sidebar-w);
  min-height: 100vh;
  background: #f7f7f7;
  padding-right: 16px;
  padding-bottom: 24px;
}

/* ===== Nav styles ===== */
.nav {
  padding: 6px 0 18px;
  font-size: 15px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  color: var(--text);
  text-decoration: none;
  border-left: 4px solid transparent;
  /* แถบซ้ายเล็ก */
}

.nav-item:hover {
  background: var(--red-50);
}

.nav-item.active {
  color: var(--red);
  background: var(--red-50);
  border-left-color: var(--red);
  /* แถบซ้ายสีแดงเมื่อ active */
  font-weight: 600;
}

.nav-item.is-button {
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font: inherit;
}

.icon {
  width: 20px;
  color: #6b7280;
}

.nav-item.active .icon {
  color: var(--red);
}

/* Submenu */
.submenu {
  margin-left: 10px;
  margin-top: 6px;
}

.sub-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  text-decoration: none;
  color: #555;
  border-left: 4px solid transparent;
  border-radius: 6px;
}

.sub-item:hover {
  background: var(--red-50);
}

.sub-item.active {
  color: var(--red);
  font-weight: 600;
  border-left-color: var(--red);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c1c7cf;
}

.dot.on {
  background: var(--red);
}

/* Scrollbar  */
.sidebar::-webkit-scrollbar {
  width: 8px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #e9e9e9;
  border-radius: 8px;
}
</style>
