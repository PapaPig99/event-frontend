<template>
  <teleport to="body">
    <div v-if="modelValue" class="modal-root" role="dialog" aria-modal="true">
      <div class="modal-backdrop" @click="close"></div>

      <div ref="card" class="modal-card">
        <button class="modal-close" @click="close" aria-label="Close">✕</button>

        <div class="modal-header">
          <img :src="logoSrc" alt="JoinUp" class="logo"/>
          <h2>สมัครสมาชิก</h2>
        </div>

        <form class="modal-form" @submit.prevent="onSubmit">
          <label>
            <span>ชื่อ</span>
            <input v-model="name" type="text" required placeholder="ชื่อ" />
          </label>

          <label>
            <span>อีเมล</span>
            <input v-model="email" type="email" required placeholder="อีเมล" />
          </label>

          <label>
            <span>รหัสผ่าน</span>
            <div class="pwd">
              <input
                v-model="password"
                :type="show ? 'text' : 'password'"
                required
                placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                minlength="6"
              />
              <button type="button" class="toggle" @click="show = !show">
                {{ show ? 'ซ่อนรหัส' : 'แสดงรหัส' }}
              </button>
            </div>
          </label>

          <button type="submit" class="btn" :disabled="loading">
            <span v-if="!loading">สมัครสมาชิก</span>
            <span v-else>กำลังสมัคร...</span>
          </button>

          <p v-if="error" class="err">{{ error }}</p>
        </form>

        <p class="signup">
          มีบัญชีอยู่แล้ว ?
          <a href="#" @click.prevent="$emit('signin')">เข้าสู่ระบบ</a>
        </p>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import logoSrc from '../assets/logo.png'
import { registerUser } from '@/lib/auth'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
// เพิ่ม 'signup' เพื่อให้ parent เดิมที่ฟัง @signup ไม่เตือน Extraneous event
const emit = defineEmits(['update:modelValue', 'signin', 'authed', 'signup'])

const name = ref('')
const email = ref('')
const password = ref('')
const show = ref(false)
const loading = ref(false)
const error = ref('')
const card = ref(null)

function close(){ emit('update:modelValue', false) }

async function onSubmit(){
  error.value = ''
  if (loading.value) return
  loading.value = true
  try {
    const payload = {
      name: name.value?.trim(),
      email: email.value?.trim(),
      password: password.value
    }
    const user = await registerUser(payload) // จะเรียก /api/auth/register ผ่าน proxy
    emit('authed', user)  // รองรับโค้ด parent แบบใหม่
    emit('signup', user)  // รองรับโค้ด parent เดิม
    name.value = email.value = password.value = ''
    close()
  } catch (e) {
    // โชว์ข้อความจาก backend ถ้ามี (เช่น Email already registered)
    error.value = e?.response?.data?.message || 'สมัครไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    loading.value = false
  }
}

function trapFocus(e){
  if(!props.modelValue || !card.value) return
  if(!card.value.contains(e.target)) card.value.focus()
}
onMounted(()=> document.addEventListener('focusin', trapFocus))
onBeforeUnmount(()=> document.removeEventListener('focusin', trapFocus))

watch(()=> props.modelValue, (open)=>{
  if(open){
    requestAnimationFrame(()=>{ card.value?.querySelector('input[type="text"]')?.focus() })
  }else{
    error.value = ''; loading.value = false
  }
})
</script>


<style scoped>
.modal-root{ position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; }
.modal-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.5); }
.modal-card{ position:relative; z-index:1; width:min(92vw,420px); background:#fff; border-radius:18px; padding:22px; box-shadow:0 25px 50px -12px rgba(0,0,0,.25); outline: none; }
.modal-close{ position:absolute; right:10px; top:10px; width:32px; height:32px; border-radius:999px; border:none; background:rgba(0,0,0,.06); cursor:pointer; }
.modal-close:hover{ background:rgba(0,0,0,.1) }

.modal-header{ display:flex; flex-direction:column; align-items:center; gap:6px; margin-bottom:10px; }
.logo{ width:110px; height:auto; object-fit:contain; }
.modal-header h2{ font-size:18px; font-weight:600; margin:0; }

.modal-form{ display:grid; gap:12px; margin-top:8px; }
label span{ display:block; font-size:13px; margin-bottom:6px; }
input{ width:100%; padding:12px 14px; border-radius:12px; border:1px solid #e6e6e6; background:#f5f5f5; outline:none; }
input:focus{ border-color:#ff7a00; box-shadow:0 0 0 3px rgba(255,122,0,.15); }

.pwd{ display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; }
.pwd .toggle{ background:none; border:none; color:#6b7280; font-size:12px; cursor:pointer; }

.btn{ width:100%; padding:12px 16px; border:none; border-radius:999px; color:#fff; font-weight:700; cursor:pointer;
      background:linear-gradient(90deg,#FF7A00,#FF3D3D); box-shadow:0 8px 16px rgba(255,92,0,.25); }
.btn[disabled]{ opacity:.7; cursor:wait; }
.btn:hover{ filter:brightness(.98) }

.err{ color:#dc2626; font-size:13px; margin-top:6px; }

.signup{ text-align:center; margin-top:12px; font-size:14px; }
.signup a{ color:#ef4444; font-weight:600; text-decoration:none; }
.signup a:hover{ text-decoration:underline; }
</style>
