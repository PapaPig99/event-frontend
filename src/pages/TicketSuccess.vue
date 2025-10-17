<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted, computed } from 'vue'
import api from '@/lib/api'   // ✅ เพิ่ม

const router = useRouter()
const route  = useRoute()

// ========== state ==========
const regIds     = ref([])        // เก็บ registration ids ทั้งหมด
const eventId    = ref(null)      // event id จากพาธ
const bookingNo  = computed(() => regIds.value[0] ?? null)

// map: { [regId]: paymentReference|null }
const paymentRefs = ref({})
const loadingRefs = ref(false)

// ========== helpers ==========
function extractPaymentRef(obj) {
  // รองรับได้หลายฟิลด์จาก backend
  return obj?.paymentReference
      ?? obj?.payment_reference
      ?? obj?.payment_ref
      ?? obj?.payment?.reference
      ?? null
}

async function loadPaymentRefs() {
  if (!regIds.value.length) return
  loadingRefs.value = true
  try {
    const ids = regIds.value.join(',')

    // 1) พยายามยิงแบบรวมก่อน (ถ้าหลังบ้านรองรับ)
    let loaded = false
    try {
      const { data } = await api.get('/registrations', { params: { ids } })
      if (Array.isArray(data) && data.length) {
        data.forEach(r => {
          const id  = Number(r?.id ?? r?.registrationId ?? r?.registration_id)
          const ref = extractPaymentRef(r)
          if (Number.isFinite(id)) paymentRefs.value[id] = ref
        })
        loaded = true
      }
    } catch (_) { /* ถ้าไม่รองรับ ไปแบบทีละใบ */ }

    // 2) ถ้ายิงรวมไม่สำเร็จ → ดึงทีละใบ
    if (!loaded) {
      await Promise.all(regIds.value.map(async (id) => {
        try {
          const { data } = await api.get(`/registrations/${id}`)
          paymentRefs.value[id] = extractPaymentRef(data)
        } catch (e) {
          // 401/403 ก็ไม่เป็นไร แสดงไม่ได้เฉพาะส่วนนี้
          paymentRefs.value[id] = null
        }
      }))
    }
  } finally {
    loadingRefs.value = false
  }
}

const mainPaymentRef = computed(() => {
  const firstId = bookingNo.value
  return firstId ? (paymentRefs.value[firstId] ?? null) : null
})

// ========== init/load ==========
onMounted(async () => {
  eventId.value = Number(route.params.id) || null

  // 1) อ่านจาก history.state (ตอน replace มาจากหน้า Payment)
  const stateIds = history.state?.regIds
  if (Array.isArray(stateIds) && stateIds.length) {
    regIds.value = stateIds.map(n => Number(n)).filter(n => Number.isFinite(n))
  }

  // 2) fallback จาก sessionStorage
  if (!regIds.value.length && route.params.id) {
    try {
      const raw = sessionStorage.getItem(`successRegIds:${route.params.id}`)
      const arr = JSON.parse(raw || 'null')
      if (Array.isArray(arr)) {
        regIds.value = arr.map(n => Number(n)).filter(n => Number.isFinite(n))
      }
    } catch {}
  }

  // 3) ดึง paymentReference จาก API
  await loadPaymentRefs()
})

// กดกลับไปดูงาน
function goEventDetail() {
  if (eventId.value) {
    router.replace({ name: 'event-detail', params: { id: String(eventId.value) } })
  } else {
    router.replace({ name: 'home' })
  }
}
</script>


<template>
  <section class="success-wrap">
    <div class="success-card">
      <!-- icon -->
      <div class="icon-ring">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="icon">
          <path d="M9 16.17 5.53 12.7a1 1 0 1 0-1.41 1.42l4.18 4.17a1 1 0 0 0 1.41 0l10-10a1 1 0 1 0-1.41-1.41L9 16.17z"/>
        </svg>
      </div>

      <h1 class="title">ชำระเงินสำเร็จ!</h1>
      <p class="subtitle">ขอบคุณสำหรับการจองตั๋วของคุณ 🎟️</p>

      <div class="summary">
        <div class="row">
          <span class="label">สถานะ</span>
          <span class="value good">ชำระเงินแล้ว</span>
        </div>

        <div class="row" v-if="bookingNo">
          <span class="label">หมายเลขการจอง</span>
          <span class="value">#{{ bookingNo }}</span>
        </div>

        <!-- ✅ รหัสการชำระเงิน (จาก API) -->
        <div class="row">
          <span class="label">รหัสการชำระเงิน</span>
          <span class="value mono">
            <template v-if="loadingRefs">กำลังดึง…</template>
            <template v-else>{{ mainPaymentRef || '—' }}</template>
          </span>
        </div>

        <div class="row" v-if="regIds?.length > 1">
          <span class="label">จำนวนตั๋ว</span>
          <span class="value">{{ regIds.length }} ใบ</span>
        </div>

        <!-- รายการทั้งหมดเมื่อมีหลายใบ -->
        <div v-if="regIds?.length > 1" class="list">
          <div
            v-for="rid in regIds"
            :key="rid"
            class="list-row"
          >
            <span class="list-id">#{{ rid }}</span>
            <span class="list-ref mono">{{ paymentRefs[rid] || '—' }}</span>
          </div>
        </div>

        <div class="hint" v-else-if="!bookingNo">
          ไม่พบหมายเลขการจอง แต่การชำระเงินสำเร็จแล้ว
        </div>
      </div>

      <div class="actions">
        <router-link
          v-if="eventId"
          :to="{ name: 'event-detail', params: { id: eventId } }"
          class="btn primary"
        >
          กลับไปดูรายละเอียดงาน
        </router-link>
        <button v-else class="btn primary" @click="goEventDetail">กลับไปดูรายละเอียดงาน</button>

        <router-link :to="{ name: 'my-event' }" class="btn ghost">
          ดูตั๋วของฉัน
        </router-link>
      </div>

      <p class="note">
        * หากไม่เห็นตั๋วใน “My Event” กรุณารีเฟรชหน้า หรือกลับไปที่รายละเอียดงาน
      </p>
    </div>
  </section>
</template>


<style scoped>
/* page background */
.success-wrap{
  min-height: calc(100vh - 180px);
  display: grid;
  place-items: center;
  padding: 36px 16px 64px;
  background: linear-gradient(180deg,#f8fbff, #f5f7fb 45%, #f7f7f7);
}

/* card */
.success-card{
  width: min(560px, 92vw);
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(9, 20, 35, .10);
  padding: 28px 26px;
  text-align: center;
  animation: pop .22s ease-out;
}
.value.mono, .list-ref.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.list{
  margin-top: 10px;
  background:#fff;
  border:1px dashed #e5e7eb;
  border-radius: 10px;
  padding: 8px 10px;
}
.list-row{
  display:flex; justify-content:space-between; gap:14px;
  padding: 8px 4px;
  border-bottom:1px solid #f1f5f9;
}
.list-row:last-child{ border-bottom:0; }
.list-id{ color:#334155; font-weight:700; }
.list-ref{ color:#0f172a; font-weight:700; }

/* icon */
.icon-ring{
  width: 84px; height: 84px; margin: 2px auto 14px;
  border-radius: 999px;
  background: #ecfdf5;               /* emerald-50 */
  display: grid; place-items: center;
  box-shadow:
    inset 0 0 0 1px #d1fae5,         /* emerald-100 */
    0 6px 20px rgba(16,185,129,.15); /* emerald glow */
}
.icon{ width: 40px; height: 40px; fill: #10b981; } /* emerald-500 */

.title{
  margin: 2px 0 4px;
  font-size: 26px; font-weight: 900; color:#0f172a;
}
.subtitle{
  margin: 0 0 16px; color:#475569; font-size: 15px;
}

/* summary box */
.summary{
  margin: 8px auto 18px;
  padding: 12px 14px;
  background: #f8fafc;               /* slate-50 */
  border: 1px solid #eef2f7;         /* soft */
  border-radius: 14px;
  text-align: left;
}
.row{
  display:flex; justify-content:space-between; gap:10px;
  padding: 10px 2px;
  border-bottom: 1px dashed #e5e7eb;
}
.row:last-child{ border-bottom: 0; }
.label{ color:#64748b; font-size:14px; }
.value{ color:#0f172a; font-weight:800; }
.value.good{
  color:#059669;                     /* emerald-600 */
}

/* actions */
.actions{
  display: grid;
  gap: 10px;
  margin: 6px 0 6px;
}
.btn{
  display:inline-block; text-decoration:none; text-align:center;
  border-radius: 12px; font-weight: 800; padding: 12px 16px;
  border: 1px solid transparent; cursor: pointer;
}
.btn.primary{
  background: linear-gradient(90deg,#ff6a13,#ff3d00);
  color:#fff; box-shadow: 0 10px 22px rgba(255,106,19,.25);
}
.btn.primary:active{ transform: translateY(1px); }
.btn.ghost{
  color:#1e88ff; background:#f4f8ff; border-color:#e5efff;
}

.note{
  margin: 10px 0 0; color:#6b7280; font-size:12px;
}

/* motion */
@keyframes pop{
  from{ transform: translateY(4px) scale(.98); opacity:0; }
  to  { transform: translateY(0) scale(1);    opacity:1; }
}

@media (max-width: 420px){
  .title { font-size: 22px; }
  .summary{ padding: 10px 12px; }
}
</style>
