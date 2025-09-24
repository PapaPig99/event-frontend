<template>
  <teleport to="body">
    <div v-if="modelValue" class="modal-root" @keydown.esc="close" role="dialog" aria-modal="true">
      <div class="modal-backdrop" @click="close"></div>

      <div ref="card" class="modal-card">
        <button class="modal-close" @click="close" aria-label="Close">✕</button>

        <div class="modal-header">
          <img :src="logoSrc" alt="JoinUp" class="logo"/>
          <h2>เข้าสู่ระบบ / ลงทะเบียน</h2>
        </div>

        <form class="modal-form" @submit.prevent="onSubmit">
          <label>
            <span>อีเมล</span>
            <input v-model="email" type="email" required placeholder="อีเมล" />
          </label>

          <label>
            <span>รหัสผ่าน</span>
            <div class="pwd">
              <input v-model="password" :type="show ? 'text' : 'password'" required placeholder="รหัสผ่าน" />
              <button type="button" class="toggle" @click="show = !show">
                {{ show ? 'ซ่อนรหัส' : 'แสดงรหัส' }}
              </button>
            </div>
          </label>

          <button type="submit" class="btn">เข้าสู่ระบบ</button>
        </form>

        <p class="signup">
          ยังไม่มีบัญชีใช่ไหม ?
          <a href="#" @click.prevent="$emit('signup')">ลงทะเบียน</a>
        </p>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router' 
// ปรับ path ให้ตรงที่คุณเก็บไฟล์จริง
import logoSrc from '../assets/logo.png'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'login', 'signup', 'authed'])

const email = ref('')
const password = ref('')
const show = ref(false)
const card = ref(null)

const route = useRoute()
const router = useRouter()

function clearForm() {
  email.value = ''
  password.value = ''
  show.value = false
}

function close() { emit('update:modelValue', false) }
async function onSubmit() {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email: email.value, password: password.value })
  })
  const data = await res.json()
  if (res.ok && data.token) {
    localStorage.setItem('token', data.token)

    // ยิงสัญญาณบอกว่ามีการเปลี่ยนแปลงการล็อกอิน
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { token: data.token, action: 'login' } }))
    emit('authed', data)

    emit('update:modelValue', false)

    clearForm()
    const redirect = route.query.redirect || '/'
    router.push(typeof redirect === 'string' ? redirect : '/')

  } else {
    alert(data.message || 'เกิดข้อผิดพลาด ไม่สามารถเข้าสู่ระบบได้')
  }
}


function trapFocus(e) {
  if (!props.modelValue || !card.value) return
  if (!card.value.contains(e.target)) card.value.focus()
}
onMounted(() => document.addEventListener('focusin', trapFocus))
onBeforeUnmount(() => document.removeEventListener('focusin', trapFocus))

watch(() => props.modelValue, (open) => {
  if (open) {
    clearForm()
    requestAnimationFrame(() => {
      const input = card.value?.querySelector('input[type="email"]')
      input?.focus()
    })
  }
})

function onAuthChanged(e) {
  if (e?.detail?.action === 'logout') {
    clearForm()
  }
}

onMounted(() => window.addEventListener('auth:changed', onAuthChanged))
onBeforeUnmount(() => window.removeEventListener('auth:changed', onAuthChanged))

</script>

<style scoped>
/* --- Layout modal (ไม่ต้องใช้ Tailwind) --- */
.modal-root {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
.modal-backdrop {
  position: absolute; inset: 0; background: rgba(0,0,0,.5);
}
.modal-card {
  position: relative; z-index: 1;
  width: min(92vw, 420px);
  background: #fff; border-radius: 18px;
  padding: 22px; box-shadow: 0 25px 50px -12px rgba(0,0,0,.25);
}
.modal-close {
  position: absolute; right: 10px; top: 10px;
  width: 32px; height: 32px; border-radius: 999px;
  border: none; background: rgba(0,0,0,.06); cursor: pointer;
}
.modal-close:hover { background: rgba(0,0,0,.1) }

/* Header */
.modal-header { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 10px; }
.logo { width: 110px; height: auto; object-fit: contain; }  /* ป้องกันโลโก้บวม */
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0 }

/* Form */
.modal-form { display: grid; gap: 12px; margin-top: 8px; }
label span { display: block; font-size: 13px; margin-bottom: 6px; }
input {
  width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid #e6e6e6;
  background: #f5f5f5; outline: none;
}
input:focus { border-color: #ff7a00; box-shadow: 0 0 0 3px rgba(255,122,0,.15) }

.pwd { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
.pwd .toggle { background: none; border: none; color: #6b7280; font-size: 12px; cursor: pointer; }

.btn {
  width: 100%; padding: 12px 16px; border: none; border-radius: 999px; color: #fff; font-weight: 700; cursor: pointer;
  background: linear-gradient(90deg, #FF7A00, #FF3D3D);
  box-shadow: 0 8px 16px rgba(255, 92, 0, .25);
}
.btn:hover { filter: brightness(0.98) }

.signup { text-align: center; margin-top: 12px; font-size: 14px; }
.signup a { color: #ef4444; font-weight: 600; text-decoration: none; }
.signup a:hover { text-decoration: underline; }
</style>
