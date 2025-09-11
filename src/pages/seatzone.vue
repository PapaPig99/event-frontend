<!-- src/pages/SeatZone.vue -->
<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/* ===== Router helpers (ใช้ปุ่มย้อนกลับ / ชำระเงิน) ===== */
const router = useRouter()
const route  = useRoute()
const goBack = () => router.back()
const payNow = () => {
  // TODO: ใส่เส้นทางหน้าชำระเงินจริง
  // router.push({ name: 'checkout', params: { id: route.params.id } })
  alert('ไปชำระเงิน (ตัวอย่าง)') 
}

/* =========================================================
   HERO CARD — ข้อมูลด้านบน (แก้ไขได้ตามจริง)
   - poster: รูปโปสเตอร์งาน -> เปลี่ยนเป็นไฟล์จริงใน src/assets ก็ได้
   - title: ชื่องาน
   - shows: รอบการแสดง
========================================================= */
const poster = ref(
  // TODO: ใส่เป็นไฟล์ในโปรเจ็กต์ก็ได้ เช่น new URL('../assets/poster.jpg', import.meta.url).href
  'https://www.thaiticketmajor.com/img_poster/prefix_1/0273/6273/mariah-carey-the-celebration-of-mimi-68771ed9b6088-l.jpg'
)
const title  = ref('MARIAH CAREY The Celebration of Mimi')  // TODO: เปลี่ยนชื่อจริง
const shows  = ref(['Sat 11 Oct 2025 20:00'])                // TODO: เพิ่มรอบจริง
const selectedShow = ref(shows.value[0])

/* =========================================================
   STEPPER — หน้าเลือกโซนเป็นขั้นที่ 2
========================================================= */
const currentStep = 2

/* =========================================================
   ZONES — รายการโซนให้เลือก (แก้ไขชื่อ/ราคา/จำนวนคงเหลือตามจริง)
   - qty: จำนวนที่เลือก (ตั้งต้นเป็น 0; จะตัดกับ remaining เอง)
========================================================= */
const zones = ref([
  { id:'A', label:'Zone A', desc:'ที่นั่งติดเวทีที่สุด', price: 12000, remaining: 31, qty: 0 },
  { id:'B', label:'Zone B', desc:'ที่นั่งติดเวทีที่สุด', price:  6500, remaining: 10, qty: 0 },
  { id:'C', label:'Zone C', desc:'ด้านข้างซ้าย-ขวา',   price:  5000, remaining: 10, qty: 0 },
  { id:'D', label:'Zone D', desc:'หลังสุด',             price:  3500, remaining: 10, qty: 1 }, // TODO: ตั้งค่าเริ่มต้นตามต้องการ
])

/* ติดตามโซนที่เพิ่งแก้ไขหลังสุด เพื่อเอาไปแสดงในสรุปด้านล่างให้เหมือนภาพ */
const lastChangedIndex = ref(
  zones.value.findIndex(z => z.qty > 0) === -1 ? 0 : zones.value.findIndex(z => z.qty > 0)
)

function inc(i){
  const z = zones.value[i]
  if (z.qty < z.remaining) {
    z.qty++
    lastChangedIndex.value = i
  }
}
function dec(i){
  const z = zones.value[i]
  if (z.qty > 0) {
    z.qty--
    lastChangedIndex.value = i
  }
}

/* สรุปผล */
const totalQty    = computed(() => zones.value.reduce((s,z)=> s + z.qty, 0))
const totalAmount = computed(() => zones.value.reduce((s,z)=> s + z.qty * z.price, 0))

/* โซนหลักที่โชว์ในแถบสรุป (เอาอันที่เพิ่งแก้ไขล่าสุด ถ้าไม่มีให้เอาอันแรกที่ qty>0) */
const primaryZone = computed(()=>{
  const picked = zones.value.findIndex(z => z.qty > 0)
  const idx = (zones.value[lastChangedIndex.value]?.qty ?? 0) > 0
    ? lastChangedIndex.value
    : (picked === -1 ? 0 : picked)
  return zones.value[idx]
})

/* ฟอร์แมตราคา */
function formatTHB(n){
  return n.toLocaleString('en-US') + ' THB'
}
</script>

<template>
  <div class="page">
    <!-- Back -->
    <div class="back-row">
      <button class="back-btn" @click="goBack">← ย้อนกลับ</button>
    </div>

    <!-- การ์ดหัวเรื่อง gradient -->
    <section class="hero-card">
      <div class="poster-wrap">
        <!-- TODO: เปลี่ยน poster เป็นไฟล์จริง (URL หรือไฟล์ใน src/assets) -->
        <img :src="poster" alt="Poster" class="poster" />
      </div>

      <div class="hero-info">
        <h1 class="event-title">{{ title }}</h1>

        <div class="link-row">
          <!-- TODO: แก้ id ให้ตรงกับ event จริง หรือผูกจาก route param -->
          <router-link :to="{ name: 'event-detail', params: { id: routeId || 1 } }" class="link-chip">
            รายละเอียด
          </router-link>
        </div>

        <!-- รอบการแสดง + สถานะ -->
        <div class="chip-row">
          <label for="show" class="show-label">รอบการแสดง</label>
          <select v-model="selectedShow" id="show" aria-label="รอบการแสดง">
            <option v-for="(s,i) in shows" :key="i" :value="s">{{ s }}</option>
          </select>
          <button class="status-chip">ที่นั่งว่าง</button>
        </div>
      </div>
    </section>

    <!-- STEP 2 -->
    <section class="stepper2">
      <div class="track"></div>
      <div class="steps">
        <div class="step" :class="{ active: currentStep >= 1 }">
          <div class="ball">1</div>
          <div class="label">ดูผังและที่นั่ง</div>
        </div>
        <div class="step" :class="{ active: currentStep >= 2 }">
          <div class="ball">2</div>
          <div class="label">เลือกประเภทที่นั่ง</div>
        </div>
        <div class="step" :class="{ active: currentStep >= 3 }">
          <div class="ball">3</div>
          <div class="label">ชำระเงิน</div>
        </div>
      </div>
    </section>

    <h2 class="section-title">เลือกที่นั่ง</h2>

    <!-- ===== รายการโซน ===== -->
    <div class="zones">
      <div v-for="(z,i) in zones" :key="z.id" class="zone-card">
        <div class="zone-left">
          <div class="zone-title">
            <strong>{{ z.label }}</strong>
            <span class="muted"> {{ z.desc }}</span>
          </div>
          <div class="zone-sub">ราคา {{ formatTHB(z.price) }}</div>
          <div class="zone-leftover muted">เหลือ {{ z.remaining }} ที่นั่ง</div>
        </div>

        <div class="zone-qty">
          <button class="qty-btn" @click="dec(i)">−</button>
          <div class="qty-num">{{ z.qty }}</div>
          <button class="qty-btn" @click="inc(i)">＋</button>
        </div>
      </div>
    </div>

    <!-- ===== สรุปด้านล่าง ===== -->
    <section class="summary">
  <div class="sum-row">
    <div class="sum-left">
      <h3 class="sum-zone" v-if="totalQty > 0">{{ primaryZone.label }}</h3>
      <h3 class="sum-zone" v-else>ยังไม่เลือกที่นั่ง</h3>
      <div class="sum-qty" v-if="totalQty > 0">จำนวน {{ totalQty }} ที่นั่ง</div>
    </div>

    <div class="sum-right">
      <div class="sum-price">{{ formatTHB(totalAmount) }}</div>
    </div>
  </div>

  <div class="sum-actions">
    <button class="btn-back" @click="goBack">ย้อนกลับ</button>
    <button class="btn-pay" @click="goPay">ชำระเงิน</button>
  </div>
</section>

  </div>
</template>

<style scoped>
:root{
  --orange:#ff6a13;
  --ink:#0f172a;
  --muted:#6b7280;
}

.page{
  max-width: 1120px;
  margin: 0 auto;
  padding: 16px 18px 40px;
  background: #fff;
}

/* Back */
.back-row{ margin: 6px 0 14px; }
.back-btn{
  background:none; border:0; font-weight:700; color:#333; cursor:pointer; font-size:16px;
}

/* HERO */
.hero-card{
  display:flex; align-items:center; gap:20px;
  padding:22px 28px; border-radius:16px;
  background: linear-gradient(90deg, #20f00d8f 10%, #4cf3ff6a 60%);
  box-shadow:0 6px 22px rgba(0,0,0,.07);
}
.poster{
  width:120px; height:160px; object-fit:cover; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,.25);
}
.hero-info{ display:flex; flex-direction:column; gap:10px; }
.event-title{ margin:0; font-size:22px; font-weight:800; color:#111; }

.chip-row{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.link-chip{ color:#0b4b44; text-decoration:underline; font-weight:600; }
.show-chip{ display:flex; flex-direction:column; gap:6px; }
.show-label{ font-size:13px; color:#333; font-weight:600; }
select{
  padding:8px 12px; border-radius:8px; border:1px solid #cfcfcf; font-size:14px; background:#fff;
}
.status-chip{
  background:#fff; border:1px solid #cfcfcf; padding:8px 14px; border-radius:10px; font-weight:800; color:#111;
}

/* STEPPER แบบภาพ */
.stepper2{ --ball: 64px; --track: 8px; position:relative; margin:22px 0 10px; }
.stepper2 .track{
  position:absolute; left:calc(var(--ball)/2); right:calc(var(--ball)/2);
  top:calc(var(--ball)/2 - var(--track)/2); height:var(--track); background:#e5e7eb; border-radius:999px;
}
.stepper2 .steps{ display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1; }
.stepper2 .step{ text-align:center; width:33.33%; }
.stepper2 .ball{
  width:var(--ball); height:var(--ball); border-radius:50%; display:grid; place-items:center;
  background:#e0e0e0; color:#000; font-weight:800; font-size:26px; margin:0 auto 6px;
}
.stepper2 .label{ font-weight:800; color:#111; }
.stepper2 .step:not(.active) .label{ color:#9aa0a6; }
.stepper2 .step.active:nth-child(2) .ball{ background:var(--orange); color:#fff; } /* step 2 active */

/* Title */
.section-title{ font-size:22px; font-weight:800; color:#111; margin:18px 0 12px; }

/* ZONE LIST */
.zones{ display:grid; gap:14px; }
.zone-card{
  display:flex; justify-content:space-between; align-items:center;
  background:#f6f7f8; border-radius:14px; padding:18px 16px;
  border:1px solid #eee;
}
.zone-left{ display:flex; flex-direction:column; gap:8px; }
.zone-title{ font-size:18px; font-weight:800; color:#111; }
.zone-title .muted{ font-size:18px; font-weight:800; color:#111; margin-left:6px; }
.zone-sub{ font-size:16px; font-weight:800; color:#111; }
.zone-leftover{ font-size:14px; }

.zone-qty{ display:flex; align-items:center; gap:14px; }
.qty-btn{
  width:48px; height:48px; border-radius:10px; border:1px solid #e5e7eb; background:#f3f4f6;
  font-size:28px; font-weight:800; color:#222; cursor:pointer;
}
.qty-num{ min-width:28px; text-align:center; font-size:28px; font-weight:800; }

/* SUMMARY */
/* ===== Summary (ส่วนล่าง) ===== */
.summary { padding: 14px 0 26px; }

/* บรรทัด Zone / จำนวน / ราคา */
.sum-row{
  display: flex;
  justify-content: space-between; /* ให้ซ้าย-ขวาไปสุด */
  align-items: flex-start;
  margin-bottom: 12px;
}

.sum-left { display: flex; flex-direction: column; gap: 4px; }
.sum-zone { margin: 0; font-size: 22px; font-weight: 800; color: #111; }
.sum-qty { color: #111; font-size: 16px; }

.sum-right { display: flex; align-items: center; }
.sum-price { font-size:22px; font-weight:900; color:#111; }

/* แถวปุ่ม */
.sum-actions{
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}


/* ปุ่มย้อนกลับ (เทา) — ซ้าย */
.btn-back{
  background: #bdbdbd;          /* เทาเหมือนภาพตัวอย่าง */
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
}

/* ปุ่มชำระเงิน (ไล่เฉดส้ม) — ขวา */
.btn-pay{
  background: linear-gradient(90deg, #ff6a13, #ff3d00);
  color: #fff;
  border: none;
  padding: 10px 26px;
  border-radius: 999px;          /* โค้งมนแบบแคปซูล */
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(255, 106, 19, .25);
}

/* Responsive */
@media (max-width: 720px){
  .poster{ width:100px; height:140px; }
  .zone-title{ font-size:16px; }
  .qty-btn{ width:44px; height:44px; }
  .qty-num{ font-size:24px; }
  .summary{ flex-direction:column; align-items:flex-start; }
  .sum-right{ width:100%; justify-content:space-between; }
}
</style>

