<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import logo from '@/assets/logo.png'

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const router = useRouter()
const route = useRoute()

const togglePassword = () => { showPassword.value = !showPassword.value }

async function handleLogin(){
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: username.value, password: password.value })
    })
    if(!res.ok) throw new Error('Login failed')
    const data = await res.json() // { token, role: "ADMIN", email, name, userId }

    // ✅ เก็บให้ตรงกับ lib/auth และ axios interceptor
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data))
    // จะเก็บเพิ่ม 'auth' ไว้ก็ได้ แต่ไม่จำเป็น:
    // localStorage.setItem('auth', JSON.stringify(data))

    // ✅ ตัดสินใจ redirect
    const isAdmin = data.role === 'ADMIN' || (Array.isArray(data.roles) && data.roles.includes('ADMIN'))
    const redirectTo = route.query.redirect || (isAdmin ? '/admin' : '/')
    router.replace(typeof redirectTo === 'string' ? redirectTo : '/')
  } catch (e) {
    alert('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="logo">
        <img :src="logo" alt="JoinUp Logo" />
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">ชื่อผู้ใช้</label>
          <div class="input-box">
            <i class="fa fa-user"></i>
            <input id="username" v-model="username" type="text" placeholder="ชื่อผู้ใช้" />
          </div>
        </div>

        <div class="form-group">
          <label for="password">รหัสผ่าน</label>
          <div class="input-box">
            <i class="fa fa-lock"></i>
            <input
              id="password"
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              placeholder="รหัสผ่าน"
            />
            <i class="fa" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'" @click="togglePassword"></i>
          </div>
        </div>

        <button class="login-btn" type="submit">เข้าสู่ระบบ</button>
      </form>
    </div>
  </div>
</template>


<style scoped>
.login-page{display:flex;justify-content:center;align-items:center;height:100vh;background:linear-gradient(135deg,#ff5f5f,#ff6f47)}
.login-card{background:#fff;padding:50px 40px;border-radius:16px;width:360px;box-shadow:0 6px 20px rgba(0,0,0,.15);text-align:center}
.logo img{width:150px;margin-bottom:20px}
.form-group{text-align:left;margin-bottom:18px}
.form-group label{font-size:14px;color:#333;display:block;margin-bottom:6px}
.input-box{display:flex;align-items:center;background:#fff;border:1px solid #ddd;padding:8px 12px;}
.input-box i{color:#777;margin-right:8px;cursor:pointer}
.input-box input{flex:1;border:none;outline:none;font-size:14px}
.login-btn{width:100%;background:#333;color:#fff;padding:10px;border:none;font-size:15px;cursor:pointer;transition:background .3s}
.login-btn:hover{background:#000}
</style>
