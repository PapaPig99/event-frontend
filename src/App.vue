<!-- src/App.vue -->
<script setup>
import { ref } from 'vue'

import NavBar from './components/NavBar.vue'
import Footer from './components/Footer.vue'
import LoginModal from './components/LoginModal.vue'
import RegisterModal from './components/RegisterModal.vue'

const showLogin = ref(false)
const showRegister = ref(false)

function openLogin() { showLogin.value = true }
const openRegister = () => (showRegister.value = true)

function handleLogin(payload){
  console.log('login:', payload)
  showLogin.value = false
}
function handleSignup(payload){
  console.log('signup:', payload)
  showRegister.value = false
}

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
    />

    <!-- โมดัลสมัครสมาชิก -->
    <RegisterModal
      v-model="showRegister"
      @signup="handleSignup"
      @signin="goSignin"
    />
  </div>
</template>
