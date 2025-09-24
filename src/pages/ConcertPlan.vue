<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/* ===== Router ===== */
const router = useRouter()
const route  = useRoute()
const routeId = computed(() => route.params.id)

const currentStep = ref(1)   // ให้ step เริ่มต้นที่ 1

/* ===== State สำหรับ UI ===== */
const poster  = ref('')
const title   = ref('')
const seatmap = ref('')
const shows   = ref([])         // ['Sat 11 Oct 2025 20:00', ...]
const selectedShow = ref('')
const statusText = ref('ที่นั่งว่าง') // ใส่ค่า default ไว้ก่อน

/* ===== Helpers ===== */
function readEventLite(id) {
  // 1) history.state
  const st = history.state?.eventLite
  if (st && typeof st === 'object') return st

  // 2) sessionStorage
  try {
    const raw = sessionStorage.getItem(`eventLite:${id}`)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object') return obj
    }
  } catch {}
  return null
}

function fmtThaiDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  // แปลงเป็นอังกฤษย่อวันแบบอย่างง่ายให้ตรงกับ UI ตัวอย่าง
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }) // Sat
  const day  = d.toLocaleDateString('en-GB', { day: '2-digit' })      // 11
  const mon  = d.toLocaleDateString('en-US', { month: 'short' })      // Oct
  const year = d.getFullYear()                                        // 2025
  return `${weekday} ${day} ${mon} ${year}`
}
function fmtHHmm(hms) {
  if (!hms) return ''
  return String(hms).slice(0,5) // '20:00'
}

/** รวมข้อมูลจาก API + eventLite (API ทับ) */
function mergeEvent(api, lite) {
  return { ...(lite || {}), ...(api || {}) }
}

/** แปลง sessions + start_date ให้เป็นรายการโชว์สำหรับ select */
function buildShows(merged) {
  const out = []

  // กรณีมี sessions
  if (Array.isArray(merged.sessions) && merged.sessions.length > 0) {
    merged.sessions.forEach(s => {
      // ถ้าฐานข้อมูลคุณเก็บ start_time เป็น TIME และวันที่อยู่ที่ events.start_date
      const d = merged.startDate || merged.start_date
      const t = s.start_time || s.startTime
      if (d && t) {
        out.push(`${fmtThaiDate(d)} ${fmtHHmm(t)}`)
      } else if (d) {
        out.push(`${fmtThaiDate(d)}`)
      } else if (t) {
        out.push(`${fmtHHmm(t)}`)
      }
    })
  }

  // ถ้าไม่มี sessions แต่มี startDate/doorOpenTime จาก lite หรือ api
  if (out.length === 0) {
    const d = merged.startDate || merged.start_date || merged.startDateRaw
    const t = merged.doorOpenTime || merged.door_open_time
    if (d && t) out.push(`${fmtThaiDate(d)} ${fmtHHmm(t)}`)
    else if (d) out.push(`${fmtThaiDate(d)}`)
  }

  // อย่างน้อยให้มี 1 รายการ เพื่อไม่ให้ select ว่าง
  if (out.length === 0) out.push('รอประกาศรอบ')

  return out
}

/* ===== โหลดข้อมูลเมื่อเข้าหน้า ===== */
onMounted(async () => {
  const id = routeId.value
  const lite = readEventLite(id)

  // ใส่ค่าจาก lite ก่อน (หน้าโหลดไว)
  if (lite) {
    title.value   = lite.title || ''
    poster.value  = lite.posterImageUrl || lite.poster || ''
    seatmap.value = lite.seatmapImageUrl || lite.seatmap || ''
  }

  try {
    const res = await fetch(`/api/events/${id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const api = await res.json()

    const merged = mergeEvent(api, lite)

    title.value   = merged.title || title.value
    poster.value  = merged.posterImageUrl  || merged.detailImageUrl || poster.value
    seatmap.value = merged.seatmapImageUrl || merged.detailImageUrl || seatmap.value

    shows.value = buildShows(merged)
    selectedShow.value = shows.value[0]

    // สถานะง่าย ๆ ตาม event.status / session.status
    const evStatus = (merged.status || '').toUpperCase()
    statusText.value = evStatus === 'CLOSED' ? 'ปิดการขาย' : 'ที่นั่งว่าง'
  } catch (e) {
    // ถ้า API ล้ม ก็ใช้ lite ต่อไป
    shows.value = buildShows(lite || {})
    selectedShow.value = shows.value[0]
    console.error('load plan failed:', e)
  }
})

/* ===== ปุ่มกลับ / ไปหน้าเลือกโซน ===== */
const goBack = () => router.back()
function goToSeatzone() {
  const id = routeId.value
  const payload = {
    id,
    title: title.value,
    poster: poster.value,
    shows: shows.value,
    selectedShow: selectedShow.value,
    statusText: statusText.value,
    sessions: history.state?.eventLite?.sessions ?? [],   // 🔽 ส่ง sessions
    zones: history.state?.eventLite?.zones ?? []         // 🔽 ส่ง zones ถ้ามี
  }

  router.push({
    name: 'seat-zone',
    params: { id },
    state: { plan: payload }
  })

  sessionStorage.setItem(`plan:${id}`, JSON.stringify(payload))
}



</script>


<template>
  <div class="plan-page">
  

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

    <!-- Stepper(ภาพแบบที่ 2) -->
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

    <h2 class="section-title">ดูผังการแสดง</h2>

    <div class="seatmap-wrap">
      <!-- TODO:เปลี่ยน seatmap เป็นรูปใหญ่ของจริง -->
      <img :src="seatmap" alt="Seat map" class="seatmap-img" />
    </div>

    <div class="cta-row">
      <button class="btn-back" @click="goBack">ย้อนกลับ</button>
      <button class="next-btn" @click="goToSeatzone">ถัดไป</button>
    </div>
  </div>
</template>

<style scoped>
:root{
  --orange:#ff6a13;
  --ink:#0f172a;
  --muted:#6b7280;
}

.plan-page{
  max-width: 1120px;
  margin: 0 auto;
  padding: 16px 18px 40px;
  box-sizing: border-box;
}

/* Back */
.back-row { margin: 10px 0 20px; }
.btn-back{
  background: #20f00dcc;          /* เทาเหมือนภาพตัวอย่าง */
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 999px; 
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
}

/* ===== Hero card ===== */
.hero-card{
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 28px 36px;
  border-radius: 16px;
  background: linear-gradient(90deg, #20f00d8f 10%, #4cf3ff6a 60%);
  box-shadow: 0 6px 22px rgba(0,0,0,.10);
}
.poster-wrap{ flex-shrink: 0; }
.poster{
  width: 140px; height: 190px; object-fit: cover;
  border-radius: 12px; box-shadow: 0 6px 14px rgba(0,0,0,.25);
}
.hero-info{ display:flex; flex-direction:column; gap:12px; }
.event-title{
  margin:0; font-size:26px; font-weight:800; color:#111;
}
.link-row{ margin-bottom:6px; }
.link-chip{
  color:#000000; text-decoration: underline; font-weight:600; font-size:15px;
}

/* รอบการแสดง + สถานะ */
.chip-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.show-label {
  font-size: 15px;
  color: #111;
  font-weight: 700;
}
select {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #cfcfcf;
  font-size: 14px;
  background: #f4fdfb;
  cursor: pointer;
}
.status-chip {
  background: #fff;
  border: 1px solid #cfcfcf;
  padding: 8px 14px;
  border-radius: 10px;
  font-weight: 700;
  color: #111;
  cursor: default;
  white-space: nowrap;
}

/* ===== Stepper (แบบภาพที่ 2) ===== */
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

.stepper2 .step.active:nth-child(1) .ball{ background:var(--orange); color:#fff; }

/* ===== Section title ===== */
.section-title{
  text-align: center; font-size: 20px; font-weight: 800;
  color: #111; margin: 24px 0 16px;
}

/* ===== Seatmap ===== */
.seatmap-wrap{
  background: #000; border-radius: 14px; overflow: hidden;
  padding: 16px; box-shadow: 0 10px 24px rgba(0,0,0,.12);
}
.seatmap-img{ width: 100%; height: auto; display: block; }

/* ===== CTA ===== */
.cta-row{ display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px; }
.next-btn{
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
@media (max-width: 680px){
  .hero-card{ padding: 22px; }
  .poster{ width:110px; height:150px; }
  .event-title{ font-size:22px; }
}
</style>
