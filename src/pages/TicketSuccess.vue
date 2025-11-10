<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted, computed } from 'vue'

const router = useRouter()
const route = useRoute()

// ========== state ==========
const paymentData = ref(null)
const eventId = ref(null)

onMounted(() => {
  // รับข้อมูลจาก history.state ที่ส่งมาจาก Payment.vue
  const stateData = history.state?.paymentData
  if (stateData) {
    paymentData.value = stateData
  } else {
    // ถ้า refresh หน้า — ดึงจาก sessionStorage
    const saved = sessionStorage.getItem('lastPayment')
    if (saved) paymentData.value = JSON.parse(saved)
  }

  // ถ้ามี eventId จาก params
  eventId.value = Number(route.params.id) || null
})

// กดกลับไปดูงาน
function goEventDetail() {
  if (eventId.value) {
    router.replace({ name: 'event-detail', params: { id: String(eventId.value) } })
  } else {
    router.replace({ name: 'home' })
  }
}

// แปลงวันที่ให้อ่านง่าย
function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>


<template>
  <section class="success-wrap">
    <div class="success-card">
      <!-- icon -->
      <div class="icon-ring">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="icon">
          <path
            d="M9 16.17 5.53 12.7a1 1 0 1 0-1.41 1.42l4.18 4.17a1 1 0 0 0 1.41 0l10-10a1 1 0 1 0-1.41-1.41L9 16.17z" />
        </svg>
      </div>

      <h1 class="title">ชำระเงินสำเร็จ!</h1>
      <p class="subtitle">ขอบคุณสำหรับการจองตั๋วของคุณ 🎟️</p>

      <div class="summary">
        <!-- สถานะ -->
        <div class="row">
          <span class="label">สถานะ</span>
          <span class="value good">ชำระเงินสำเร็จ</span>
        </div>

        <!--  รหัสการชำระเงิน -->
        <div class="row">
          <span class="label">รหัสการชำระเงิน</span>
          <span class="value mono">{{ paymentData?.paymentReference || '—' }}</span>
        </div>

        <!-- ยอดชำระรวม -->
        <div class="row">
          <span class="label">ยอดชำระรวม</span>
          <span class="value">
            {{
              paymentData?.totalPrice && paymentData.totalPrice > 0
                ? Number(paymentData.totalPrice).toLocaleString('th-TH') + ' บาท'
                : '0 บาท'
            }}
          </span>
        </div>


        <!--  วันที่และเวลาชำระ -->
        <div class="row">
          <span class="label">วันที่ชำระเงิน</span>
          <span class="value">{{ formatDate(paymentData?.paidAt) }}</span>
        </div>
      </div>

      <div class="actions">
        <router-link v-if="eventId" :to="{ name: 'event-detail', params: { id: eventId } }" class="btn primary">
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
.success-wrap {
  min-height: calc(100vh - 180px);
  display: grid;
  place-items: center;
  padding: 36px 16px 64px;
  background: linear-gradient(180deg, #f8fbff, #f5f7fb 45%, #f7f7f7);
}

/* card */
.success-card {
  width: min(560px, 92vw);
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(9, 20, 35, .10);
  padding: 28px 26px;
  text-align: center;
  animation: pop .22s ease-out;
}

.value.mono,
.list-ref.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.list {
  margin-top: 10px;
  background: #fff;
  border: 1px dashed #e5e7eb;
  border-radius: 10px;
  padding: 8px 10px;
}

.list-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 4px;
  border-bottom: 1px solid #f1f5f9;
}

.list-row:last-child {
  border-bottom: 0;
}

.list-id {
  color: #334155;
  font-weight: 700;
}

.list-ref {
  color: #0f172a;
  font-weight: 700;
}

/* icon */
.icon-ring {
  width: 84px;
  height: 84px;
  margin: 2px auto 14px;
  border-radius: 999px;
  background: #ecfdf5;
  /* emerald-50 */
  display: grid;
  place-items: center;
  box-shadow:
    inset 0 0 0 1px #d1fae5,
    /* emerald-100 */
    0 6px 20px rgba(16, 185, 129, .15);
  /* emerald glow */
}

.icon {
  width: 40px;
  height: 40px;
  fill: #10b981;
}

/* emerald-500 */

.title {
  margin: 2px 0 4px;
  font-size: 26px;
  font-weight: 900;
  color: #0f172a;
}

.subtitle {
  margin: 0 0 16px;
  color: #475569;
  font-size: 15px;
}

/* summary box */
.summary {
  margin: 8px auto 18px;
  padding: 12px 14px;
  background: #f8fafc;
  /* slate-50 */
  border: 1px solid #eef2f7;
  /* soft */
  border-radius: 14px;
  text-align: left;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 2px;
  border-bottom: 1px dashed #e5e7eb;
}

.row:last-child {
  border-bottom: 0;
}

.label {
  color: #64748b;
  font-size: 14px;
}

.value {
  color: #0f172a;
  font-weight: 800;
}

.value.good {
  color: #059669;
  /* emerald-600 */
}

/* actions */
.actions {
  display: grid;
  gap: 10px;
  margin: 6px 0 6px;
}

.btn {
  display: inline-block;
  text-decoration: none;
  text-align: center;
  border-radius: 12px;
  font-weight: 800;
  padding: 12px 16px;
  border: 1px solid transparent;
  cursor: pointer;
}

.btn.primary {
  background: linear-gradient(90deg, #ff6a13, #ff3d00);
  color: #fff;
  box-shadow: 0 10px 22px rgba(255, 106, 19, .25);
}

.btn.primary:active {
  transform: translateY(1px);
}

.btn.ghost {
  color: #1e88ff;
  background: #f4f8ff;
  border-color: #e5efff;
}

.note {
  margin: 10px 0 0;
  color: #6b7280;
  font-size: 12px;
}

/* motion */
@keyframes pop {
  from {
    transform: translateY(4px) scale(.98);
    opacity: 0;
  }

  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@media (max-width: 420px) {
  .title {
    font-size: 22px;
  }

  .summary {
    padding: 10px 12px;
  }
}
</style>
