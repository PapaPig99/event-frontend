<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/* ===== Router ===== */
const router = useRouter()
const route  = useRoute()

/* =========================================================
   รับคำสั่งซื้อที่ถูกส่งมาจาก SeatZone.vue ผ่าน History State
   - ถ้าไม่ถูกส่งมา จะใส่ตัวอย่างไว้ให้ก่อน (เพื่อเห็นหน้าตา)
   - SeatZone แนะนำให้ส่งแบบ:
     router.push({ name:'payment', params:{ id }, state:{ order } })
========================================================= */
const fallbackPoster =
  'https://www.thaiticketmajor.com/img_poster/prefix_1/0273/6273/mariah-carey-the-celebration-of-mimi-68771ed9b6088-l.jpg'

const defaultOrder = {
  eventId: route.params.id,
  title: 'MARIAH CAREY The Celebration of Mimi',     // TODO: แทนที่ด้วยชื่อจริง
  poster: fallbackPoster,                             // TODO: เปลี่ยนเป็นไฟล์ใน /src/assets ก็ได้
  show: 'Sat 11 Oct 2025 20:00',                      // TODO: รอบจริง
  items: [
    { zoneId: 'D', zoneLabel: 'Zone D', unitPrice: 3500, qty: 1 }, // ตัวอย่าง
  ],
  fee: 50                                             // TODO: คำนวณจาก % หรือจาก API
}

const order = ref(defaultOrder)

/* ลองรับจาก history.state.order ถ้ามีให้ใช้แทน */
onMounted(() => {
  const fromState = history.state?.order
  if (fromState && typeof fromState === 'object') {
    order.value = { ...defaultOrder, ...fromState }
  }
})

/* คำนวณยอดเงิน */
const subtotal = computed(() =>
  order.value.items.reduce((s, it) => s + it.unitPrice * it.qty, 0)
)
const fee = computed(() => Number(order.value.fee || 0))
const grandTotal = computed(() => subtotal.value + fee.value)

function formatTHB(n) {
  return n.toLocaleString('en-US') + ' THB'
}

/* ====== Action buttons ====== */
async function confirmPayment() {
  /* TODO: เรียก API สร้าง payment intent / order
     ตัวอย่าง payload:
     const payload = {
       eventId: order.value.eventId,
       show: order.value.show,
       items: order.value.items,
       fee: order.value.fee,
       amount: grandTotal.value
     }
     const res = await fetch('/api/payments/intent', { method:'POST', body: JSON.stringify(payload) })
     const data = await res.json()
     // จากนั้นแสดง QR จาก data.qrImageUrl หรือเปลี่ยนหน้าเป็นสลิป ฯลฯ
  */
  alert('ยืนยันการจ่าย (ตัวอย่าง) — เตรียมส่ง payload ไป API')
}

function cancelOrder() {
  /* TODO: เคลียร์สถานะ/แจ้ง API ยกเลิก ถ้ามี */
  router.back()
}
</script>

<template>
  <div class="payment-page">
    <!-- HERO การ์ดหัวเรื่อง -->
    <section class="hero-card">
      <div class="poster-wrap">
        <!-- TODO: เปลี่ยนเป็นไฟล์โลคอลใน /src/assets ได้ -->
        <img :src="order.poster" alt="Poster" class="poster" />
      </div>

      <div class="hero-info">
        <h1 class="event-title">{{ order.title }}</h1>

        <div class="link-row">
          <!-- TODO: ใส่ id จริงของอีเวนท์ -->
          <router-link :to="{ name: 'event-detail', params: { id: order.eventId || 1 } }" class="link-chip">
            รายละเอียด
          </router-link>
        </div>

        <div class="chip-row">
          <label class="show-label">รอบการแสดง</label>
          <select :value="order.show" disabled>
            <option>{{ order.show }}</option>
          </select>
          <button class="status-chip">ที่นั่งว่าง</button>
        </div>
      </div>
    </section>

    <!-- Stepper: ขั้นที่ 3 -->
    <section class="stepper2">
      <div class="track"></div>
      <div class="steps">
        <div class="step active">
          <div class="ball">1</div>
          <div class="label">ดูผังและที่นั่ง</div>
        </div>
        <div class="step active">
          <div class="ball">2</div>
          <div class="label">เลือกประเภทที่นั่ง</div>
        </div>
        <div class="step active">
          <div class="ball orange">3</div>
          <div class="label">ชำระเงิน</div>
        </div>
      </div>
    </section>

    <!-- หัวข้อหลัก -->
    <h2 class="page-title">ชำระเงิน</h2>

    <!-- 2 คอลัมน์ -->
    <section class="grid">
      <!-- ซ้าย: กล่อง QR -->
      <div class="qr-card">
        <div class="qr-head">ชำระเงินโดย QR Code</div>
        <p class="qr-note">ข้อมูลการชำระเงินของคุณได้รับการรักษาความปลอดภัยและไม่แบ่งปันกับบุคคลที่สาม</p>

        <!-- TODO: ถ้าได้ QR จาก API ให้ใส่ <img :src="qrUrl"> แทน placeholder นี้ -->
        <div class="qr-box">
          <div class="qr-placeholder">To be continued</div>
        </div>
      </div>

      <!-- ขวา: สรุปการจอง -->
      <aside class="summary-card">
        <h3 class="sum-title">ข้อมูลการจอง</h3>

        <div class="sum-row">
          <div class="sum-left">
            <div class="sum-label">ชื่ออีเว้นท์</div>
            <div class="sum-text ellipsis">{{ order.title }}</div>
          </div>
        </div>

        <!-- รายการตั๋ว -->
        <div
          v-for="(it, idx) in order.items"
          :key="idx"
          class="sum-row"
        >
          <div class="sum-left">
            <div class="sum-label">ตั๋ว</div>
            <div class="sum-text">{{ it.qty }} x {{ it.zoneLabel }}</div>
          </div>
          <div class="sum-right">{{ (it.unitPrice).toLocaleString('en-US') }}</div>
        </div>

        <!-- ค่าธรรมเนียม -->
        <div class="sum-row">
          <div class="sum-left">
            <div class="sum-label">ค่าธรรมเนียม(10%)</div>
          </div>
          <div class="sum-right">{{ fee.toLocaleString('en-US') }}</div>
        </div>

        <!-- รวมทั้งสิ้น -->
        <div class="sum-row total">
          <div class="sum-left">
            <div class="sum-label strong">รวมทั้งสิ้น</div>
          </div>
          <div class="sum-right strong">{{ grandTotal.toLocaleString('en-US') }}</div>
        </div>

        <button class="pay-btn" @click="confirmPayment">ยืนยันการจ่าย</button>

      </aside>
    </section>
  </div>
</template>

<style scoped>
:root{
  --orange:#ff6a13;
  --ink:#0f172a;
  --muted:#6b7280;
}

.payment-page{
  max-width: 1120px;
  margin: 0 auto;
  padding: 16px 18px 40px;
}

/* ===== Hero Card ===== */
.hero-card{
  display:flex; align-items:center; gap:20px;
  padding:24px 32px; border-radius:16px;
  background: linear-gradient(90deg, #20f00d8f 10%, #4cf3ff6a 60%);
  box-shadow: 0 6px 22px rgba(0,0,0,.08);
}
.poster-wrap{ flex-shrink:0; }
.poster{
  width:120px; height:160px; object-fit:cover; border-radius:10px;
  box-shadow: 0 4px 10px rgba(0,0,0,.25);
}
.hero-info{ display:flex; flex-direction:column; gap:10px; }
.event-title{ margin:0; font-size:22px; font-weight:800; color:#111; }
.link-chip{ color:#0b4b44; text-decoration: underline; font-weight:600; }

.chip-row{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.show-label{ font-size:13px; color:#333; font-weight:600; }
select{ padding:8px 12px; border:1px solid #cfcfcf; border-radius:8px; background:#fff; }
.status-chip{
  background:#fff; border:1px solid #cfcfcf; padding:8px 14px; border-radius:10px;
  font-weight:800; color:#111;
}

/* ===== Stepper 3 ===== */
.stepper2 {
  --ball: 60px;          /* 🔽 ลดขนาดวงกลม จาก 72 → 60 */
  --track: 6px;          /* 🔽 ลดความหนาเส้น */
  position: relative;
  margin: 60px 0 0;      /* 🔽 ลด margin-bottom ให้ห่างข้างล่างน้อยลง */
  bottom: 20px;
}

.stepper2 .track {
  position: absolute;
  left: calc(var(--ball) / 2 + 10px);   /* 🔽 ขยับเส้นเข้ามา */
  right: calc(var(--ball) / 2 + 10px);  /* 🔽 ขยับเส้นเข้ามา */
  top: calc(var(--ball) / 2 - var(--track) / 2);
  height: var(--track);
  background: #e5e7eb;
  border-radius: 999px;
  z-index: 0;
}

.stepper2 .steps {
  display: flex;
  justify-content: space-between; /* 🔽 เว้นเท่า ๆ กัน */
  align-items: flex-start;
  position: relative;
  z-index: 1;
  max-width: 600px;               /* 🔽 จำกัดความกว้างรวม */
  margin: 0 auto;                 /* 🔽 จัดตรงกลาง */
}

.stepper2 .step {
  text-align: center;
  flex: 1;                        /* 🔽 แต่ละ step กินพื้นที่เท่ากัน */
}

.stepper2 .ball {
  width: var(--ball);
  height: var(--ball);
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 22px;
  background: #e0e0e0;
  color: #000;
  margin: 0 auto 6px;
  box-shadow: 0 2px 0 rgba(0,0,0,.04);
}

.stepper2 .label {
  font-size: 16px;
  font-weight: 700;
  color: #111;
}

.stepper2 .step:not(.active) .label {
  color: #6b7280;
}

.stepper2 {
  --ball: 60px;          /* 🔽 ลดขนาดวงกลม จาก 72 → 60 */
  --track: 6px;          /* 🔽 ลดความหนาเส้น */
  position: relative;
  margin: 60px 0 0;      /* 🔽 ลด margin-bottom ให้ห่างข้างล่างน้อยลง */
  bottom: 20px;
}

.stepper2 .track {
  position: absolute;
  left: calc(var(--ball) / 2 + 10px);   /* 🔽 ขยับเส้นเข้ามา */
  right: calc(var(--ball) / 2 + 10px);  /* 🔽 ขยับเส้นเข้ามา */
  top: calc(var(--ball) / 2 - var(--track) / 2);
  height: var(--track);
  background: #e5e7eb;
  border-radius: 999px;
  z-index: 0;
}

.stepper2 .steps {
  display: flex;
  justify-content: space-between; /* 🔽 เว้นเท่า ๆ กัน */
  align-items: flex-start;
  position: relative;
  z-index: 1;
  max-width: 600px;               /* 🔽 จำกัดความกว้างรวม */
  margin: 0 auto;                 /* 🔽 จัดตรงกลาง */
}

.stepper2 .step {
  text-align: center;
  flex: 1;                        /* 🔽 แต่ละ step กินพื้นที่เท่ากัน */
}

.stepper2 .ball {
  width: var(--ball);
  height: var(--ball);
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 22px;
  background: #e0e0e0;
  color: #000;
  margin: 0 auto 6px;
  box-shadow: 0 2px 0 rgba(0,0,0,.04);
}

.stepper2 .label {
  font-size: 16px;
  font-weight: 700;
  color: #111;
}

.stepper2 .step:not(.active) .label {
  color: #6b7280;
}

.stepper2 .step.active:nth-child(3) .ball{ background:var(--orange); color:#fff; }

/* ===== Heading ===== */
.page-title{
  text-align:center; font-size:20px; font-weight:800; color:#111;
  margin: 14px 0 12px;
}

/* ===== Grid (QR / Summary) ===== */
.grid{
  display:grid; grid-template-columns: 1fr 360px; gap:22px; align-items:start;
}
.qr-card{
  background:#fff; border:1px solid #eee; border-radius:16px;
  box-shadow: 0 8px 18px rgba(0,0,0,.06);
  padding:18px;
}
.qr-head{ font-weight:800; color:#111; margin-bottom:6px; }
.qr-note{ color:#555; font-size:13px; margin:0 0 10px; }
.qr-box{
  background:#fafafa; border-radius:14px; border:1px dashed #ddd;
  height:520px; display:grid; place-items:center;
}
.qr-placeholder{ color:#999; font-size:22px; font-weight:800; }

.summary-card{
  background:#fff; border:1px solid #eee; border-radius:16px;
  box-shadow: 0 8px 18px rgba(0,0,0,.06);
  padding:18px;
}
.sum-title{ margin:0 0 10px; font-weight:800; color:#111; }

.sum-row{
  display:flex; justify-content:space-between; align-items:flex-start;
  padding:10px 0; border-bottom:1px solid #f1f1f1;
}
.sum-row:last-of-type{ border-bottom:0; }

.sum-left{ display:flex; flex-direction:column; gap:4px; }
.sum-label{ font-size:14px; color:#6b7280; }
.sum-text{ color:#111; }
.ellipsis{ max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.sum-right{ color:#111; font-weight:700; }
.total .sum-left .sum-label,
.total .sum-right{ font-weight:900; }

.pay-btn{
  width:100%; margin-top:14px;
  background: linear-gradient(90deg, #ff6a13, #ff3d00);
  color:#fff; border:none; border-radius:999px; padding:10px 16px;
  font-weight:800; cursor:pointer; box-shadow:0 6px 14px rgba(255,106,19,.25);
}


/* Responsive */
@media (max-width: 900px){
  .grid{ grid-template-columns: 1fr; }
}
</style>
