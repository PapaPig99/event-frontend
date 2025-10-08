<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

const TOKEN_KEY = 'token'
const API_ME = '/api/me'            // เปลี่ยนตรงนี้ให้ตรง backend ถ้าจำเป็น

// ===== state =====
const user = ref(null)              // ข้อมูลผู้ใช้จาก /api/me หรือจาก JWT fallback
const jwtClaims = ref(null)         // payload จาก JWT (fallback)
const loadingUser = ref(true)
const isLoggedIn = computed(() => !!user.value)

// ===== utils =====
const isActive = (to) => route.path === to || route.path.startsWith(to + '/')

// decode JWT payload แบบไม่ใช้ lib (รองรับ token แบบ a.b.c)
function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    // base64url -> base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

// ชื่อที่จะแสดง: เรียงลำดับฟิลด์ที่พบบ่อย แล้วค่อย fallback ไปที่ JWT/email
const displayName = computed(() => {
  const u = user.value || {}
  const j = jwtClaims.value || {}
  return (
    u.first_name ||
    u.username ||
    u.name ||
    (u.email ? u.email.split('@')[0] : '') ||
    j.name ||
    j.preferred_username ||
    (j.email ? j.email.split('@')[0] : '') ||
    'Me'
  )
})

// ===== main =====
async function fetchMe() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    user.value = null
    jwtClaims.value = null
    loadingUser.value = false
    return
  }

  // เตรียม fallback ทันที (ให้ UI ขึ้นชื่อชั่วคราวได้ไว้ก่อน)
  jwtClaims.value = decodeJwtPayload(token)

  try {
    loadingUser.value = true
    const { data } = await axios.get(API_ME, {
      headers: { Authorization: `Bearer ${token}` },
    })
    user.value = data            // สมมุติ: { id, username, first_name, name, email, avatar, ... }
  } catch (err) {
    const status = err?.response?.status
    if (status === 401 || status === 403) {
      // token ไม่ใช้ได้แล้ว
      localStorage.removeItem(TOKEN_KEY)
      user.value = null
      jwtClaims.value = null
    } else {
      // เก็บ token ไว้ และใช้ชื่อจาก JWT ไปก่อน
      // สามารถลองเรียกใหม่ตอนหลังได้ (เช่นปุ่มรีเฟรชโปรไฟล์)
      if (!user.value && jwtClaims.value) {
        user.value = {
          username: jwtClaims.value.preferred_username,
          name: jwtClaims.value.name,
          email: jwtClaims.value.email,
        }
      }
      console.warn('fetchMe failed but keep token:', status)
    }
  } finally {
    loadingUser.value = false
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY)
  user.value = null
  jwtClaims.value = null
  if (route.path.startsWith('/myevent')) router.push('/')
  window.dispatchEvent(new CustomEvent('auth:changed', { detail: { action: 'logout' } }))
}

// อัปเดตทันทีหลังล็อกอิน (อีเวนต์จาก LoginModal)
function onAuthChanged() {
  fetchMe()
}

// cross-tab sync (อีกแท็บล็อกอิน/ออก)
function onStorage(e) {
  if (e.key === TOKEN_KEY) fetchMe()
}

onMounted(() => {
  window.addEventListener('auth:changed', onAuthChanged)
  window.addEventListener('storage', onStorage)
  fetchMe()   // โหลดครั้งแรก
})

onBeforeUnmount(() => {
  window.removeEventListener('auth:changed', onAuthChanged)
  window.removeEventListener('storage', onStorage)
})

function openLogin() {
  // จำเส้นทางปัจจุบันไว้ เพื่อกลับมาหน้าเดิมหลังล็อกอิน
  router.push({ name: 'login-virtual', query: { redirect: route.fullPath } })
}
</script>

<template>
  <nav class="navbar">
    <div class="logo">
      <!-- ให้คลิกกลับหน้าแรกโดยไม่รีเฟรช -->
      <RouterLink to="/"><img src="../assets/logo.png" alt="logo" /></RouterLink>
    </div>

    <ul class="menu">
      <li>
        <RouterLink to="/" :class="{ active: isActive('/') }">Home</RouterLink>
      </li>
      <li>
        <RouterLink to="/event" :class="{ active: isActive('/event') }">Event</RouterLink>
      </li>
      <li>
        <RouterLink to="/myevent" :class="{ active: isActive('/myevent') }">My Event</RouterLink>
      </li>
    </ul>

    <div class="actions">
      <RouterLink to="/help"><i class="fa-regular fa-circle-question"></i> Help</RouterLink>

      <!-- แสดงสถานะโหลดโปรไฟล์ -->
      <span v-if="loadingUser" class="skeleton-name"></span>

      <!-- ถ้า login แล้ว: แสดงไอคอนผู้ใช้ + ชื่อ + เมนูย่อย -->
      <details v-else-if="isLoggedIn" class="user-dropdown">
        <summary class="user-pill">
          <i class="fa-regular fa-user"></i>
          <span class="username">
            {{ user.first_name || user.username || 'Me' }}
          </span>
          <i class="fa-solid fa-chevron-down chev"></i>
        </summary>

        <div class="dropdown">
          <!-- <RouterLink to="/profile" class="item">
            <i class="fa-regular fa-id-badge"></i> โปรไฟล์ของฉัน
          </RouterLink> -->
          <RouterLink to="/myevent" class="item">
            <i class="fa-regular fa-calendar-check"></i> กิจกรรมของฉัน
          </RouterLink>
          <button class="item danger" @click="logout">
            <i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ
          </button>
        </div>
      </details>

      <!-- ถ้ายังไม่ login: ใช้ปุ่มเดิม -->
      <button v-else @click="openLogin" class="login-btn">เข้าสู่ระบบ</button>
    </div>
  </nav>
</template>

<style scoped>
.navbar { display:flex; justify-content:space-between; align-items:center; padding:14px 32px; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,.08); position:sticky; top:0; z-index:50; }
.logo img { height:38px; }

.menu { display:flex; list-style:none; gap:28px; margin:0; padding:0; }
.menu a { text-decoration:none; font-size:18px; font-weight:500; color:#333; transition:color .2s; }
.menu a:hover { color:#ff6a13; }
/* ไฮไลต์ลิงก์ที่ active */
.menu a.active,
.menu :global(.router-link-active).active {
  color:#ff6a13; position:relative; font-weight:800;
}

.actions { display:flex; align-items:center; gap:16px; }
.actions a { font-size:14px; color:#555; text-decoration:none; }

/* ปุ่มเข้าสู่ระบบ (โหมดไม่ล็อกอิน) */
.login-btn { background:#ff6a13; color:#fff; border:none; padding:8px 18px; border-radius:20px; font-weight:600; cursor:pointer; transition:background .2s; }
.login-btn:hover { background:#e95a05; }

/* ---------- NEW: user pill + dropdown ---------- */
.user-dropdown { position:relative; }
.user-dropdown > summary { list-style:none; }
.user-dropdown > summary::-webkit-details-marker { display:none; }

.user-pill {
  display:flex; align-items:center; gap:10px;
  padding:6px 12px; border-radius:20px; cursor:pointer;
  border:1px solid #eee; background:#fafafa;
  font-weight:600; color:#333;
}
.user-pill:hover { background:#f3f3f3; }
.user-pill .chev { font-size:12px; opacity:.65; }

.username { max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* กล่องดรอปดาวน์ */
.dropdown {
  position:absolute; right:0; margin-top:8px;
  min-width:220px; background:#fff; border:1px solid #eee; border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.08); padding:8px; display:flex; flex-direction:column; gap:4px;
}
.user-dropdown[open] .dropdown { animation:fadeIn .12s ease-out; }

.item {
  display:flex; align-items:center; gap:10px;
  width:100%; text-align:left; background:transparent; border:none;
  padding:10px 12px; border-radius:10px; font-size:14px; color:#333; text-decoration:none; cursor:pointer;
}
.item:hover { background:#f6f6f6; }
.item.danger { color:#d7263d; }
.item.danger:hover { background:#fff2f3; }

/* สเตทโหลดชื่อผู้ใช้ */
.skeleton-name {
  display:inline-block; width:120px; height:14px; border-radius:8px;
  background:linear-gradient(90deg, #eee, #f6f6f6, #eee);
  background-size:200% 100%; animation:shimmer 1.2s infinite;
}

@keyframes shimmer {
  0% { background-position:200% 0; }
  100% { background-position:-200% 0; }
}
@keyframes fadeIn {
  from { opacity:0; transform:translateY(-4px); }
  to   { opacity:1; transform:translateY(0); }
}

/* (สำเนา style เดิมด้านล่างเพื่อความครบถ้วนถ้าคุณคัดลอกทับไฟล์) */
.navbar { display:flex; justify-content:space-between; align-items:center; padding:14px 32px; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,.08); position: sticky; top: 0; z-index: 50; }
.logo img { height: 38px; }
.menu { display:flex; list-style:none; gap:28px; margin:0; padding:0; }
.menu a { text-decoration:none; font-size:18px; font-weight:500; color:#333; transition:color .2s; }
.menu a:hover { color:#ff6a13; }
.menu a.active { color:#ff6a13; position:relative; font-weight:800; }
.actions { display:flex; align-items:center; gap:16px; }
.actions a { font-size:14px; color:#555; text-decoration:none; }
.login-btn { background:#ff6a13; color:#fff; border:none; padding:8px 18px; border-radius:20px; font-weight:600; cursor:pointer; transition:background .2s; }
.login-btn:hover { background:#e95a05; }
</style>
