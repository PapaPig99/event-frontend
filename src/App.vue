<script setup>
import NavBar from './components/NavBar.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <div>
    <NavBar />
    <router-view />
    <Footer />
  </div>
</template>

//รันหน้า login ของ admin
/*<script setup>
import Login from './Admin/Login.vue'
</script>

<template>
  <Login />
</template>*/