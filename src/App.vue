<script setup>
import { ref } from 'vue'

import NavBar from './components/NavBar.vue'
import Footer from './components/Footer.vue'
import LoginModal from './components/LoginModal.vue'

const showLogin = ref(false)
function openLogin() { showLogin.value = true }
function handleLogin(payload) {
  // TODO: call API login
  console.log('login:', payload)
  showLogin.value = false
}
</script>

<template>
  <div>
      <NavBar @open-login="openLogin" />

    <router-view />
    <Footer />
    <LoginModal v-model="showLogin" @login="handleLogin" />
  </div>
</template>
