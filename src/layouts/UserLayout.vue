<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import NavBar from '@/components/NavBar.vue'
import Footer from '@/components/Footer.vue'
import LoginModal from '@/components/LoginModal.vue'
import RegisterModal from '@/components/RegisterModal.vue'

import { loginUser, registerUser } from '@/lib/auth' // ใช้ได้ทั้งกรณี modal ให้ payload มา หรือ modal ยิงเองแล้ว emit 'authed'

// modal states
const showLogin = ref(false)
const showRegister = ref(false)

// router helpers
const route = useRoute()
const router = useRouter()

function openLogin() { showLogin.value = true }
const openRegister = () => (showRegister.value = true)

async function handleLogin(payload){
  try {
    // เผื่อกรณี LoginModal ส่ง {email,password} มาให้ parent ยิง API เอง
    if (payload?.email && payload?.password) {
      await loginUser(payload)
    }
    afterAuth()
  } finally {
    showLogin.value = false
  }
}

async function handleSignup(payload){
  try {
    // เผื่อกรณี RegisterModal ส่ง {name,email,password,...} มาให้ parent ยิง API เอง
    if (payload?.email && payload?.password) {
      await registerUser(payload)
    }
    afterAuth()
  } finally {
    showRegister.value = false
  }
}

// สำหรับกรณีที่ Modal ยิง API เองและ emit('authed', user)
function onAuthed(){
  showLogin.value = false
  showRegister.value = false
  afterAuth()
}

// หลัง auth สำเร็จ ให้เด้งกลับ path เดิมที่ guard ส่งมา
function afterAuth(){
  const go = route.query.redirect || '/'
  router.replace(typeof go === 'string' ? go : '/')
}

// ถ้าโดน guard redirect มากับ ?login=1 หรือ ?register=1 ให้เปิด modal ให้อัตโนมัติ
watch(() => route.query, (q) => {
  if (q.login) showLogin.value = true
  if (q.register) showRegister.value = true
}, { immediate: true })

function goSignup(){ showLogin.value = false; showRegister.value = true }
function goSignin(){ showRegister.value = false; showLogin.value = true }
</script>

<template>
  <div>
    <NavBar @open-login="openLogin" />
    <router-view />
    <Footer />

    <!-- โมดัลล็อกอิน -->
    <LoginModal
      v-model="showLogin"
      @login="handleLogin"
      @signup="goSignup"
      @authed="onAuthed"
    />

    <!-- โมดัลสมัครสมาชิก -->
    <RegisterModal
      v-model="showRegister"
      @signup="handleSignup"
      @signin="goSignin"
      @authed="onAuthed"
    />
  </div>
</template>
