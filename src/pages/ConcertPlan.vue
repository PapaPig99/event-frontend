<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import { watch, onUnmounted } from 'vue'

/* ====== ใช้สำหรับ map label -> sessionId ====== */
const sessionsRaw = ref([])           // เก็บ sessions จาก API (ดิบ)
const sessionLabelToId = ref({})  
function toTimeLabel(t){ return String(t||'').slice(0,5) }
function toDateLabel(iso){
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US',
    { weekday:'short', month:'short', day:'2-digit', year:'numeric' })
}

function makeShowLabel(dateIsoOrDateTime, timeStr){
  // รองรับทั้ง startAt (มีเวลาในตัว) หรือแยกวัน/เวลา
  const d = dateIsoOrDateTime ? new Date(dateIsoOrDateTime) : null
  const datePart = d ? toDateLabel(d.toISOString()) : toDateLabel(null)
  const timePart = timeStr || (d ? toTimeLabel(`${d.getHours()}`.padStart(2,'0')+':' + `${d.getMinutes()}`.padStart(2,'0')) : '')
  return `${datePart} ${toTimeLabel(timePart)}`
}

/* ===== Router ===== */
const router = useRouter()
const route  = useRoute()
const routeId = computed(() => route.params.id)

const currentStep = ref(1)   // ให้ step เริ่มต้นที่ 1

/* ===== State สำหรับ UI ===== */
const poster  = ref('')
const title   = ref('')
const seatmap = ref('')
const hasSeatmap = computed(() => {
  const v = String(seatmap.value || '')
  // ไม่มีรูป หรือเป็นรูป fallback ที่ชื่อมีคำว่า seatmap-fallback ให้ถือว่า "ไม่มีผัง"
  return v.length > 0 && !/seatmap-fallback/i.test(v)
})

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
/** แปลง sessions + start_date -> รายการโชว์ และเตรียม map label->id */
function buildShows(merged) {
  const out = []
  sessionLabelToId.value = {}
  sessionsRaw.value = Array.isArray(merged.sessions) ? merged.sessions : []

  if (sessionsRaw.value.length > 0){
    sessionsRaw.value.forEach(s => {
      const startDateTime = s.startAt || s.start_at || s.startDate || s.date || null
      const startTime = s.startTime || s.start_time || null
      const label = s.name || makeShowLabel(startDateTime, startTime)

      out.push(label)
      sessionLabelToId.value[label] = s.id
    })
  }

  // fallback (ไม่มี sessions)
  if (out.length === 0) {
    const d = merged.startDate || merged.start_date || merged.startDateRaw
    const t = merged.doorOpenTime || merged.door_open_time
    if (d && t) out.push(`${fmtThaiDate(d)} ${fmtHHmm(t)}`)
    else if (d) out.push(fmtThaiDate(d))
  }

  if (out.length === 0) out.push('รอประกาศรอบ')
  return out
}


/* ===== โหลดข้อมูลเมื่อเข้าหน้า ===== */
onMounted(async () => {
  const id = routeId.value
  const lite = readEventLite(id)
  const passedSessionId = history.state?.sessionId

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
    availability.value = buildAvailability(merged || lite || {})

    title.value   = merged.title || title.value
    poster.value  = merged.posterImageUrl  || merged.detailImageUrl || poster.value
    seatmap.value = merged.seatmapImageUrl || merged.detailImageUrl || seatmap.value

    shows.value = buildShows(merged)

    if (passedSessionId && sessionsRaw.value.length) {
   const s = sessionsRaw.value.find(x => String(x.id) === String(passedSessionId))
   if (s) {
     const label = (s.name) || makeShowLabel(
       s.startAt || s.start_at || s.startDate || s.date,
       s.startTime || s.start_time
     )
     if (shows.value.includes(label)) selectedShow.value = label
     else selectedShow.value = shows.value[0]
   } else {
     selectedShow.value = shows.value[0]
   }
 } else {
   selectedShow.value = shows.value[0]
 }

    // ข้ามหน้า ถ้าไม่มีผัง
if (!hasSeatmap.value) {
  goToSeatzone()
  return
}

    // สถานะง่าย ๆ ตาม event.status / session.status
    const evStatus = (merged.status || '').toUpperCase()
    statusText.value = evStatus === 'CLOSED' ? 'ปิดการขาย' : 'ที่นั่งว่าง'
  } 
  catch (e) {
    // ถ้า API ล้ม ก็ใช้ lite ต่อไป
    shows.value = buildShows(lite || {})
    selectedShow.value = shows.value[0]
    // ข้ามหน้า ถ้าไม่มีผัง
if (!hasSeatmap.value) {
  goToSeatzone()
  return
}
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

/* ===== ดรอปดาวน์/โมดัลที่นั่งว่าง ===== */
const showAvail = ref(false)
const loadingAvail = ref(false)
const availError = ref('')
const latestAvail = ref([])           // ข้อมูลสดจาก API
let availTimer = null 

const rowsToShow = computed(() => {
  if (latestAvail.value?.length) {
    return latestAvail.value.map(z => ({
      code: z.zoneName ?? z.zone ?? z.code ?? z.name ?? z.zoneId ?? '-',
      left: Number(z.available ?? z.remaining ?? z.left ?? 0)
    }))
  }
  return availability.value // [{code,left}] ที่คุณสร้างไว้เดิม
})


function qtyClass(n){
  if (n <= 0) return 'zero'
  if (n <= 10) return 'ok'   // ถ้าต้องแยกสี “เหลือน้อย” ใส่คลาสอื่นเองได้
  return 'ok'
}

// หา sessionId จาก label ที่เลือก
async function getCurrentSessionId() {
  // 1) map ตรง ๆ
  let sid = sessionLabelToId.value?.[selectedShow.value]

  // 2) ถ้ารอบเดียว
  if (!sid && sessionsRaw.value?.length === 1) sid = sessionsRaw.value[0]?.id

  // 3) fallback โหลด /view เมื่อยัง map ไม่ได้จริง ๆ
  if (!sid) {
    try {
      const id = routeId.value
      const res = await fetch(`/api/events/${id}/view`)
      if (res.ok) {
        const api = await res.json()
        const options = (api.sessions || []).map(s => {
          const dt = s.startAt || s.start_at || s.startDate || s.date
          const tm = s.startTime || s.start_time
          return { id: s.id, label: s.name || makeShowLabel(dt, tm) }
        })
        const found = options.find(o => o.label === selectedShow.value)
        sid = found?.id || options[0]?.id
      }
    } catch (e) {
      console.warn('map session failed', e)
    }
  }
  return sid
}


// โหลด availability 1 ครั้ง (ใช้ตอนเปิดโมดัล + ตอนเปลี่ยนรอบ)
async function loadAvailOnce(){
  loadingAvail.value = true
  availError.value = ''
  latestAvail.value = []
  try{
    const sid = await getCurrentSessionId()
    if (!sid) throw new Error('ไม่พบรอบการแสดง')

    const res = await fetch(`/api/zones/session/${sid}/availability`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    latestAvail.value = Array.isArray(data) ? data : []
  }catch(err){
    availError.value = err?.message || 'โหลดข้อมูลไม่สำเร็จ'
  }finally{
    loadingAvail.value = false
  }}


async function openAvail(){
  showAvail.value = true
  await loadAvailOnce()               // ← ดึงตาม selectedShow ปัจจุบัน
  if (availTimer) clearInterval(availTimer)
  availTimer = setInterval(loadAvailOnce, 5000)
}
watch(selectedShow, async () => {
  if (showAvail.value) await loadAvailOnce()  // ← เปลี่ยนรอบระหว่างเปิดโมดัล → รีโหลด
})
onUnmounted(() => { if (availTimer){ clearInterval(availTimer); availTimer = null } })

function closeAvail(){
  showAvail.value = false
  if (availTimer){ clearInterval(availTimer); availTimer = null }
}

// เปลี่ยนรอบแล้วรีโหลด (ถ้าโมดัลเปิดอยู่)
watch(selectedShow, async () => {
  if (showAvail.value) await loadAvailOnce()
})
onUnmounted(() => { if (availTimer){ clearInterval(availTimer); availTimer = null } })
/** คืนรายการโซน + คงเหลือ เพื่อไปแสดงในดรอปดาวน์
 * พยายามอ่านจาก API > eventLite > fallback
 */
const availability = ref([])  // [{ code:'A1', left:156 }, ...]

function buildAvailability(mergedOrLite){
  const rows = []

  // กรณีมี zones มากับ API/lite: ใช้ชื่อ/รหัสโซนและ remaining โดยตรง
  if (Array.isArray(mergedOrLite?.zones) && mergedOrLite.zones.length){
    mergedOrLite.zones.forEach((z, i)=>{
      rows.push({
        code: z.code || z.name || z.label || `Zone ${i+1}`,
        left: Number(z.remaining ?? z.capacity ?? 0)
      })
    })
  }

  // บางอีเวนท์ไม่มี zone แต่มีที่นับจากแถวที่นั่ง (เช่น sessions/max_participants)
  // ถ้าต้องใช้ sessions ให้สรุปต่อท้าย
  if (rows.length === 0 && Array.isArray(mergedOrLite?.sessions)){
    mergedOrLite.sessions.forEach((s, i)=>{
      rows.push({
        code: s.name || s.code || `รอบที่ ${i+1}`,
        left: Number(s.max_participants ?? s.remaining ?? 0)
      })
    })
  }
  return rows
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
          <button class="status-chip" @click="openAvail">ที่นั่งว่าง</button>

        </div>
      </div>

      <!-- Modal / Dropdown: โซนที่นั่ง -->
<div v-if="showAvail" class="avail-backdrop" @click.self="closeAvail">
  <div class="avail-card">
    <div class="avail-head">
      <div class="title">โซนที่นั่ง</div>
      <button class="close" @click="closeAvail">✕</button>
    </div>

    <div class="avail-table">
      <!-- loading -->
      <div v-if="loadingAvail" class="row" style="justify-content:center; font-weight:700;">
        กำลังโหลด...
      </div>

      <!-- error -->
      <div v-else-if="availError" class="row" style="justify-content:center; color:#d30000; font-weight:700;">
        โหลดไม่สำเร็จ: {{ availError }}
      </div>

      <!-- table -->
      <template v-else>
        <div class="row header">
          <div class="col zone">โซนที่นั่ง</div>
          <div class="col left">ที่นั่งว่าง</div>
          <div class="col arrow"></div>
        </div>

        <div v-for="(r, idx) in rowsToShow" :key="idx" class="row">
          <div class="col zone">{{ r.code }}</div>
          <div class="col left" :class="qtyClass(r.left)">
            {{ r.left.toLocaleString('en-US') }}
          </div>
        </div>

        <div v-if="rowsToShow.length === 0" class="empty">ไม่พบข้อมูลที่นั่ง</div>
      </template>
    </div>
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

    <h2 class="section-title" v-if="hasSeatmap">ดูผังการแสดง</h2>

    <div class="seatmap-wrap" v-if="hasSeatmap">
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

/* Backdrop */
.avail-backdrop{
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  display: grid; place-items: center;
  z-index: 50;
}

/* Card */
.avail-card{
  width: min(520px, 92vw);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(0,0,0,.18);
  overflow: hidden;
}

/* Header */
.avail-head{
  display:flex; align-items:center; justify-content:center;
  position: relative;
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
}
.avail-head .title{
  font-size: 22px; font-weight: 800; color:#111;
}
.avail-head .close{
  position:absolute; right:10px; top:10px;
  background:transparent; border:none; font-size:20px; cursor:pointer;
}

/* Table */
.avail-table{ max-height: 60vh; overflow:auto; }
.avail-table .row{
  display:grid; grid-template-columns: 1fr 100px 28px;
  align-items:center;
  padding: 12px 16px;
  border-bottom:1px solid #f3f3f3;
}
.avail-table .row.header{
  position: sticky; top:0; background:#fff; z-index:1;
  font-weight:700; color:#666;
}
.avail-table .row .col.zone{ font-weight:700; color:#111; }
.avail-table .row .col.left{ text-align:right; font-weight:800; }
.avail-table .row .col.arrow{ text-align:center; color:#999; }

.avail-table .row .col.left.ok{ color:#15a915; }  /* เขียว */
.avail-table .row .col.left.zero{ color:#d30000; } /* แดง */

.avail-table .empty{
  padding: 18px; text-align:center; color:#666;
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