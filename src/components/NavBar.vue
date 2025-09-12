<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// เช็ค active แบบครอบคลุมทั้งเส้นทางย่อย (เช่น /event และ /event/123)
const isActive = (to) => route.path === to || route.path.startsWith(to + '/')

// ปุ่มล็อกอิน (ของเดิม)
const emit = defineEmits(['open-login'])
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
      <button @click="emit('open-login')" class="login-btn">เข้าสู่ระบบ</button>
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
.menu :global(.router-link-active).active {   /* เผื่อกรณีใช้ class ผสม */
  color:#ff6a13;
  position:relative;
  font-weight:800;
}
.actions { display:flex; align-items:center; gap:16px; }
.actions a { font-size:14px; color:#555; text-decoration:none; }
.login-btn { background:#ff6a13; color:#fff; border:none; padding:8px 18px; border-radius:20px; font-weight:600; cursor:pointer; transition:background .2s; }
.login-btn:hover { background:#e95a05; }
</style>
