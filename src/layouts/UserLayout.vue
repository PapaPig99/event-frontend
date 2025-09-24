<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import NavBar from '@/components/NavBar.vue'
import Footer from '@/components/Footer.vue'
import LoginModal from '@/components/LoginModal.vue'
import RegisterModal from '@/components/RegisterModal.vue'

const showLogin = ref(false)
const showRegister = ref(false)

const route = useRoute()
const router = useRouter()

function openLogin(){ showLogin.value = true }
const openRegister = () => (showRegister.value = true)

function onAuthed(){
  showLogin.value = false
  showRegister.value = false
  const go = route.query.redirect || '/'
  router.replace(typeof go === 'string' ? go : '/')
}

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

    <LoginModal
      v-model="showLogin"
      @signup="goSignup"
      @authed="onAuthed"   />

    <RegisterModal
      v-model="showRegister"
      @signin="goSignin"
      @authed="onAuthed"  />
  </div>
</template>
