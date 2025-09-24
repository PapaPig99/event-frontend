<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/* ===== Router ===== */
const router = useRouter()
const route  = useRoute()
const routeId = computed(() => route.params.id)
const hasSeatmap = ref(false)
// เดิม: const goBack = () => router.back()
const goBack = () => {
  const id = routeId.value
  if (hasSeatmap.value) {
    const eventLite = readEventLite(id)
    router.replace({
      name: 'concert-plan',
      params: { id },
      ...(eventLite ? { state: { eventLite } } : {})
    })
  } else {
    router.push({ name: 'event-detail', params: { id } })
  }
}




const selectedItems = computed(() =>
  zones.value
    .filter(z => z.qty > 0)
    .map(z => ({ zoneId: z.id, zoneLabel: z.label, unitPrice: z.price, qty: z.qty }))
)
const canProceed = computed(() => selectedItems.value.length > 0)

function goToPayment() {
  if (selectedItems.value.length === 0) {
    // แจ้งเตือน และเลื่อนจอไปโซนเลือกบัตร
    alert('กรุณาเลือกที่นั่งอย่างน้อย 1 ที่นั่ง')
    const zonesEl = document.querySelector('.zones')
    if (zonesEl) {
      const y = zonesEl.getBoundingClientRect().top + window.pageYOffset - 80
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
    return
  }

  
  const id = route.params.id
  const order = {
    eventId: id,
    title: title.value,
    poster: poster.value || fallbackPoster,
    show: selectedShow.value,
    items: selectedItems.value,
    fee: Math.round(selectedItems.value.reduce((s, it) => s + it.unitPrice * it.qty, 0) * 0.10)
  }

  router.push({ name: 'payment', params: { id }, state: { order } })
  sessionStorage.setItem(`order:${id}`, JSON.stringify(order))
}



/* ===== Fallback รูป ===== */
const fallbackPoster  = new URL('../assets/poster-fallback.jpg',  import.meta.url).href
const fallbackSeatmap = new URL('../assets/seatmap-fallback.png', import.meta.url).href

/* ===== HERO data (เริ่มว่าง แล้วค่อยเติมตอน mount) ===== */
const poster = ref('')
const title  = ref('')
const shows  = ref([])
const selectedShow = ref('')

/* ===== Stepper ===== */
const currentStep = 2

function readEventLite(id) {
  // 1) จาก router state
  const st = history.state?.eventLite
  if (st && typeof st === 'object') return st

  // 2) จาก sessionStorage (สำรอง)
  try {
    const raw = sessionStorage.getItem(`eventLite:${id}`)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object') return obj
    }
  } catch {}
  return null
}


/* ===== อ่าน plan payload จาก state / session ===== */
function readPlan(id) {
  const st = history.state?.plan
  if (st && typeof st === 'object') return st
  try {
    const raw = sessionStorage.getItem(`plan:${id}`)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object') return obj
    }
  } catch {}
  return null
}

onMounted(() => {
  const id = routeId.value
  const plan = readPlan(id)

  // เติมค่าจาก plan
  if (plan) {
    title.value       = plan.title || ''
    poster.value      = plan.poster || ''
    shows.value       = Array.isArray(plan.shows) ? plan.shows : []
    selectedShow.value = plan.selectedShow || shows.value[0] || ''
  }

  // 🔽 เพิ่ม: อ่าน eventLite เพื่อตัดสินว่ามีผังไหม
  const lite = readEventLite(id)
  const seatmapUrl = lite?.seatmapImageUrl || lite?.seatmap || ''
  hasSeatmap.value = !!seatmapUrl && !/seatmap-fallback/i.test(seatmapUrl)

  // fallback รูป กันรูปหาย/ว่าง
  if (!poster.value)  poster.value  = fallbackPoster
})

/* ===== โซน (เดิมของคุณ) ===== */
const zones = ref([])

const lastChangedIndex = ref(0)


const totalQty    = computed(() => zones.value.reduce((s,z)=> s + z.qty, 0))
const totalAmount = computed(() => zones.value.reduce((s,z)=> s + z.qty * z.price, 0))
const primaryZone = computed(()=>{
  const picked = zones.value.findIndex(z => z.qty > 0)
  const idx = (zones.value[lastChangedIndex.value]?.qty ?? 0) > 0
    ? lastChangedIndex.value
    : (picked === -1 ? 0 : picked)
  return zones.value[idx]
})
function formatTHB(n){ return n.toLocaleString('en-US') + ' THB' }

// ===== helper: แปลง sessions -> zones =====
function buildZonesFromSessions(sessions, startDate) {
  if (!Array.isArray(sessions) || sessions.length === 0) return []
  const toHHmm = (t) => (t ? String(t).slice(0,5) : '')
  const toThaiDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const dd = d.toLocaleDateString('en-GB', { day:'2-digit' })
    const mon = d.toLocaleDateString('en-US', { month:'short' })
    const yyyy = d.getFullYear()
    return `${dd} ${mon} ${yyyy}`
  }

  return sessions.map((s, i) => {
    const labelTime = toHHmm(s.start_time || s.startTime)
    const labelDate = toThaiDate(startDate)
    const label = s.name || (labelDate && labelTime ? `${labelDate} ${labelTime}` : (labelTime || labelDate || `รอบที่ ${i+1}`))
    return {
      id: s.id || `S${i+1}`,
      label,
      desc: s.name ? labelTime : '',                 // โชว์เวลาใต้ชื่อถ้ามี
      price: Number(s.price ?? 0),
      remaining: Number(s.max_participants ?? 0),
      qty: 0
    }
  })
}

// ===== onMounted ใน SeatZone =====
onMounted(async () => {
  const id = routeId.value
  const plan = readPlan(id)

  // HERO จาก plan ก่อน
  if (plan) {
    title.value  = plan.title || ''
    poster.value = plan.poster || fallbackPoster
    shows.value  = Array.isArray(plan.shows) ? plan.shows : []
    selectedShow.value = plan.selectedShow || shows.value[0] || ''
  }
  if (!poster.value) poster.value = fallbackPoster

  // 1) ใช้ zones/sessions ที่ติดมาจาก plan ก่อน
  if (plan?.zones?.length) {
    zones.value = plan.zones.map((z, i) => ({
      id: z.id || `Z${i+1}`,
      label: z.name || z.label || `Zone ${i+1}`,
      desc: z.desc || '',
      price: Number(z.price ?? 0),
      remaining: Number(z.capacity ?? z.remaining ?? 0),
      qty: 0,
    }))
    return
  }
  if (plan?.sessions?.length) {
    const startDate = plan.startDate || plan.start_date || plan.startDateRaw
    zones.value = buildZonesFromSessions(plan.sessions, startDate)
    return
  }

  // 2) ถ้า plan ไม่มีอะไรเลย → ดึงจาก API
  try {
    const res = await fetch(`/api/events/${id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const api = await res.json()

    // HERO เสริมจาก API
    if (!title.value)  title.value = api.title || ''
    if (!poster.value) poster.value = api.posterImageUrl || api.detailImageUrl || fallbackPoster
    if (!shows.value?.length) {
      // สร้าง shows แบบง่ายจาก sessions
      if (Array.isArray(api.sessions) && api.sessions.length) {
        const toDate = (iso)=> new Date(iso).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'2-digit',year:'numeric'})
        const toTime = (t)=> String(t||'').slice(0,5)
        const d = api.startDate || api.start_date
        shows.value = api.sessions.map(s => `${toDate(d)} ${toTime(s.start_time || s.startTime)}`)
        selectedShow.value = shows.value[0] || ''
      }
    }

    // ทำ zones
    if (Array.isArray(api.zones) && api.zones.length) {
      zones.value = api.zones.map((z, i) => ({
        id: z.id || `Z${i+1}`,
        label: z.name || `Zone ${i+1}`,
        desc: '',
        price: Number(z.price ?? 0),
        remaining: Number(z.capacity ?? 0),
        qty: 0,
      }))
    } else if (Array.isArray(api.sessions) && api.sessions.length) {
      const startDate = api.startDate || api.start_date
      zones.value = buildZonesFromSessions(api.sessions, startDate)
    } else {
      zones.value = []
    }
  } catch (e) {
    console.error('SeatZone load failed:', e)
    zones.value = []
  }
})

// คงเหลือจริง = โควตาเดิม (remaining) - จำนวนที่เลือก (qty)
function left(z) {
  const cap = Number(z.remaining || 0)
  const q   = Number(z.qty || 0)
  return Math.max(0, cap - q)
}

function inc(i) {
  const z = zones.value[i]
  if (left(z) > 0) {        // เพิ่มได้ก็ต่อเมื่อยังเหลือ
    z.qty++
    lastChangedIndex.value = i
  }
}

function dec(i) {
  const z = zones.value[i]
  if (z.qty > 0) {
    z.qty--
    lastChangedIndex.value = i
  }
}

/* ===== Dropdown ที่นั่งว่าง ===== */
const showAvail = ref(false)

/* แถวสำหรับโชว์ในดรอปดาวน์ (คำนวณจาก zones ทุกครั้ง → อัปเดตอัตโนมัติ) */
const availRows = computed(() =>
  zones.value.map((z, i) => ({
    code: z.label || z.name || z.id || `Zone ${i + 1}`,
    left: left(z),                                // ใช้ฟังก์ชัน left ที่มีอยู่แล้ว
  }))
)


</script>


<template>

  <div class="page">
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
          <button class="status-chip" @click="showAvail = !showAvail">ที่นั่งว่าง</button>
        </div>
      </div>
      <!-- ===== Modal / Dropdown: โซนที่นั่งว่าง ===== -->
<div v-if="showAvail" class="avail-backdrop" @click.self="showAvail = false">
  <div class="avail-card">
    <div class="avail-head">
      <div class="title">โซนที่นั่ง</div>
      <button class="close" @click="showAvail = false">✕</button>
    </div>

    <div class="avail-table">
      <div class="row header">
        <div class="col zone">โซนที่นั่ง</div>
        <div class="col left">ที่นั่งว่าง</div>
        <div class="col arrow"></div>
      </div>

      <div v-for="(r, idx) in availRows" :key="idx" class="row">
        <div class="col zone">{{ r.code }}</div>
        <div class="col left" :class="{ ok: r.left > 0, zero: r.left === 0 }">
          {{ r.left.toLocaleString('en-US') }}
        </div>
      </div>

      <div v-if="availRows.length === 0" class="empty">ไม่พบข้อมูลโซน</div>
    </div>
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
      <!-- ใช้คงเหลือจริง -->
      <div class="zone-leftover muted">เหลือ {{ left(z) }} ที่นั่ง</div>
    </div>

    <div class="zone-qty">
      <button class="qty-btn" :disabled="z.qty === 0" @click="dec(i)">−</button>
      <div class="qty-num">{{ z.qty }}</div>
      <button class="qty-btn" :disabled="left(z) === 0" @click="inc(i)">＋</button>
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
    <button class="btn-pay" :disabled="!canProceed" @click="goToPayment">ชำระเงิน</button>
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
}

.btn-pay:disabled{
  opacity: .5;
  cursor: not-allowed;
  filter: grayscale(40%);
}

.qty-btn:disabled{
  opacity:.45;
  cursor:not-allowed;
  filter:grayscale(30%);
}

/* ที่นั่งว่าง */
/* ===== Availability Modal ===== */
.avail-backdrop{
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  display: grid; place-items: center;
  z-index: 50;
}
.avail-card{
  width: min(520px, 92vw);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(0,0,0,.18);
  overflow: hidden;
}
.avail-head{
  display:flex; align-items:center; justify-content:center;
  position: relative;
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
}
.avail-head .title{ font-size:22px; font-weight:800; color:#111; }
.avail-head .close{
  position:absolute; right:10px; top:10px;
  background:transparent; border:none; font-size:20px; cursor:pointer;
}

.avail-table{ max-height: 60vh; overflow:auto; }
.avail-table .row{
  display:grid; grid-template-columns: 1fr 100px 28px;
  align-items:center; gap: 8px;
  padding: 12px 16px;
  border-bottom:1px solid #f3f3f3;
}
.avail-table .row.header{
  position: sticky; top:0; background:#fff; z-index:1;
  font-weight:700; color:#666;
}
.avail-table .col.zone{ font-weight:700; color:#111; }
.avail-table .col.left{ text-align:right; font-weight:800; }
.avail-table .col.arrow{ text-align:center; color:#999; }

.avail-table .col.left.ok{ color:#15a915; }   /* เขียว */
.avail-table .col.left.zero{ color:#d30000; } /* แดง */

.avail-table .empty{
  padding: 18px; text-align:center; color:#666;
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
.link-chip{ color:#000000; text-decoration:underline; font-weight:600; }
.show-chip{ display:flex; flex-direction:column; gap:6px; }
.show-label{ font-size:13px; color:#333; font-weight:600; }
select{
  padding:8px 12px; border-radius:8px; border:1px solid #cfcfcf; font-size:14px; background:#fff;
}
.status-chip{
  background:#fff; border:1px solid #cfcfcf; padding:8px 14px; border-radius:10px; font-weight:800; color:#111;
}

/* STEPPER แบบภาพ */
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

.stepper2 .step.active:nth-child(2) .ball{ background:var(--orange); color:#fff; } /* step 2 active */

/* Title */
.section-title{ font-size:22px; font-weight:800; color:#111; margin:18px 0 12px; }

/* ZONE LIST */
.zones{ display:grid; gap:14px; }
.zone-card{
  display:flex; justify-content:space-between; align-items:center;
  background:#e6e6e6; border-radius:14px; padding:18px 16px;
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
  background: #20f00dcc;          /* เทาเหมือนภาพตัวอย่าง */
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 999px; 
  font-weight: 800;
  font-size: 16px;
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

