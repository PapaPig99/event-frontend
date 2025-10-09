<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'

/* ========= state ========= */
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const err = ref('')
const event = ref({
  category: '',
  title: '',
  dateText: '',
  venueText: '',
  timeText: '',
  priceText: '',
  poster: '',
  seatmap: '',
})

/* ========= รูป fallback ========= */
const fallbackPoster  = new URL('../assets/poster-fallback.jpg',  import.meta.url).href
const fallbackSeatmap = new URL('../assets/seatmap-fallback.png', import.meta.url).href

/* ========= มีผังหรือไม่ ========= */
const hasSeatmap = computed(() =>
  !!event.value.seatmap && event.value.seatmap !== fallbackSeatmap
)

/* ========= โหลดจาก API ========= */
onMounted(async () => {
  loading.value = true; err.value = ''
  try {
    const { data: d } = await api.get(`/events/${route.params.id}`)
    event.value = {
      title: d.title ?? '',
      category: d.category ?? '',
      dateText: fmtThaiDate(d.startDate),
      venueText: d.location ?? '',
      timeText: fmtThaiTime(d.doorOpenTime),
      priceText: buildPriceText(d),
      poster: d.posterImageUrl || d.detailImageUrl || fallbackPoster,
      seatmap: d.seatmapImageUrl || d.detailImageUrl || fallbackSeatmap,
    }
  } catch (e) {
    const s = e?.response?.status
    if (s === 401 || s === 403) {
      router.replace({ name: 'home', query: { login: 1, redirect: route.fullPath } })
      return
    }
    if (s === 404) { err.value = 'ไม่พบงานนี้'; return }
    err.value = 'เกิดข้อผิดพลาดภายใน'
  } finally {
    loading.value = false
  }
})



/* ========= utils ========= */
function fmtThaiDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' })
}
function fmtThaiTime(hms) {
  if (!hms) return ''
  return String(hms).slice(0, 5) + ' น.'
}
function isNum(v) { return v !== null && v !== undefined && !isNaN(Number(v)) }

function buildPriceText(d) {
  if (d && typeof d.priceText === 'string' && d.priceText.trim()) return d.priceText.trim()
  const set = new Set()
  if (isNum(d?.minPrice)) set.add(Number(d.minPrice))
  if (isNum(d?.maxPrice)) set.add(Number(d.maxPrice))
  if (Array.isArray(d?.zones)) {
    d.zones.forEach(z => {
      if (isNum(z?.price)) set.add(Number(z.price))
      if (isNum(z?.minPrice)) set.add(Number(z.minPrice))
      if (isNum(z?.maxPrice)) set.add(Number(z.maxPrice))
    })
  }
  if (Array.isArray(d?.sessions)) {
    d.sessions.forEach(s => {
      if (isNum(s?.minPrice)) set.add(Number(s.minPrice))
      if (isNum(s?.maxPrice)) set.add(Number(s.maxPrice))
      if (Array.isArray(s?.zones)) {
        s.zones.forEach(z => {
          if (isNum(z?.price)) set.add(Number(z.price))
          if (isNum(z?.minPrice)) set.add(Number(z.minPrice))
          if (isNum(z?.maxPrice)) set.add(Number(z.maxPrice))
        })
      }
    })
  }
  const prices = [...set].filter(Number.isFinite).sort((a, b) => b - a)
  if (!prices.length) return '—'
  const txt = prices.map(n => n.toLocaleString('th-TH')).join(' / ')
  const unit = (d?.currency && String(d.currency).toUpperCase() !== 'THB') ? d.currency : 'บาท'
  return `${txt} ${unit}`
}

/* ========= seatmap modal ========= */
const isSeatmapOpen = ref(false)
const seatmapLarge = ref('')
function openSeatmap(){ isSeatmapOpen.value = true; seatmapLarge.value = event.value.seatmap }
function closeSeatmap(){ isSeatmapOpen.value = false }

/* ========= scroll helper ========= */
const stageSection = ref(null)
function scrollToStage() {
  const el = stageSection.value
  if (!el) return
  const y = el.getBoundingClientRect().top + window.pageYOffset - 80
  window.scrollTo({ top: y, behavior: 'smooth' })
}






/* ========= ไปหน้าเลือกแผน/ประเภทบัตร ========= */
function goToConcertPlan() {
  const id = route.params.id

  // เก็บข้อมูลย่อส่งต่อไปหน้า ConcertPlan (ใส่เท่าที่มีจากหน้านี้)
  const eventLite = {
    id,
    title: event.value.title,
    posterImageUrl: event.value.poster,
    seatmapImageUrl: event.value.seatmap,
    // ถ้าอยากส่งเวลาแบบดิบ ให้ลอกจาก API ฝั่ง ConcertPlan; ที่นี่มีเฉพาะข้อความแสดงผล
    location: event.value.venueText,
    doorOpenTime: event.value.timeText?.replace(' น.','') || undefined
  }

  // ส่งผ่าน router state และกันพลาดเก็บไว้ใน sessionStorage
  router.push({
    name: 'concert-plan',
    params: { id },
    state: { eventLite }
  })
  sessionStorage.setItem(`eventLite:${id}`, JSON.stringify(eventLite))
}

</script>





<template>
  <!-- ด้านบนของ template ภายใน .detail-page -->
<div v-if="loading" style="padding:16px">กำลังโหลด...</div>
<p v-else-if="err" style="padding:16px; color:#b91c1c">{{ err }}</p>

  <div class="detail-page" v-else>
    <!-- HERO: แถบไล่สี + หัวเรื่อง -->
    <section class="hero fullbleed">
      <div class="container">
        <div class="crumb">
          <a href="#desc" class="back">รายละเอียด</a>
        </div>

        <div class="hero-body">
          <div class="poster-wrap">
            <img :src="event.poster" alt="Event Poster" class="poster" />
          </div>

          <div class="main-info">
            <div class="category">{{ event.category }}</div>
            <h1 class="title">{{ event.title }}</h1>

            <div class="facts">
              <ul class="fact-list">
                <li>
                  <i class="fa-regular fa-calendar"></i>
                  <div>
                    <div class="label">วันที่แสดง</div>
                    <div class="val">{{ event.dateText }}</div>
                  </div>
                </li>
                <li>
                  <i class="fa-solid fa-location-dot"></i>
                  <div>
                    <div class="label">สถานที่แสดง</div>
                    <div class="val">{{ event.venueText }}</div>
                  </div>
                </li>
                <li>
                  <i class="fa-regular fa-clock"></i>
                  <div>
                    <div class="label">ประตูเปิด</div>
                    <div class="val">{{ event.timeText }}</div>
                  </div>
                </li>
              </ul>

              <div class="price-box">
                <div class="price-head">
                  <i class="fa-regular fa-money-bill-1"></i>
                  <span>ราคาบัตร</span>
                </div>
                <div class="price-text">{{ event.priceText }}</div>
              </div>
            </div>

            <div class="cta-row">
  <button class="choose-btn" @click="scrollToStage">เลือกรอบ/ประเภทบัตร</button>
</div>

          </div>
        </div>
      </div>
    </section>

   <!-- ผังการแสดง & รอบการแสดง -->
<section class="stage" ref="stageSection" id="stage-section">
  <div class="container">
    <h2 class="section-title">ผังการแสดง & รอบการแสดง</h2>

    <div class="stage-card" :class="{ 'noimg': !hasSeatmap }">
      <!-- ซ้าย: รูปผัง (เฉพาะมีผัง) -->
      <img
        v-if="hasSeatmap"
        :src="event.seatmap"
        alt="Seat map"
        class="seatmap"
        @click="openSeatmap"
      />

      <!-- ขวา: ข้อมูลหลัก -->
      <div class="stage-info">
        <div v-if="!hasSeatmap" class="no-seatmap-banner">งานนี้ไม่ได้ระบุผัง</div>

        <div class="venue-line">
          <svg viewBox="0 0 24 24" class="ic">
            <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>
          </svg>
          <span>{{ event.venueText }}</span>
        </div>

        <div class="stage-price">
          <span class="muted">ราคาบัตร</span>
          <span class="price-text">{{ event.priceText }}</span>
        </div>
      </div>

      <!-- ตารางวันที่/เวลา: ย้ายออกมาเป็นพี่น้องของ stage-info -->
      <div class="date-table">
        <div class="dt-row dt-header">
          <div class="dt-col">วันที่แสดง</div>
          <div class="dt-col right">เวลา</div>
        </div>
        <div class="dt-row dt-body">
          <div class="dt-col">{{ event.dateText }}</div>
          <div class="dt-col right">
            <button class="time-pill" @click="goToConcertPlan">
              {{ event.timeText || '—' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
<!-- รายละเอียด -->
    <section id="desc" class="desc">
  <div class="container">
    <h2 class="section-title">รายละเอียด</h2>
    <h3 class="desc-title">{{ event.title }}</h3>
    <p>จำหน่ายบัตร</p>
  </div>
</section>
<!-- โมดัลซูมผัง (ถ้ามี) -->
<div v-if="isSeatmapOpen && hasSeatmap" class="modal-backdrop" @click.self="closeSeatmap">
  <div class="modal-content">
    <button class="modal-close" @click="closeSeatmap">×</button>
    <img :src="seatmapLarge" alt="Seat map large" class="modal-img" />
  </div>
</div>

  </div>
</template>

<!-- ===== Global minimal reset (กัน Vite บีบ #app) ===== -->
<style>

/* ===== Date/Time table inside black stage card ===== */
.date-table{
  margin-top: 8px;
  border-radius: 12px;
  overflow: hidden;               /* ให้หัว/ตัวตารางโค้งต่อกัน */
  box-shadow: 0 8px 18px rgba(0,0,0,.25);
}

.dt-row{
  display: grid;
  grid-template-columns: 1fr 140px; /* ซ้าย: วันที่ (ยืด), ขวา: เวลา (กว้างคงที่) */
  align-items: center;
}

.dt-header{
  background: #4b5563d8;            /* เทาเข้มตามภาพ */
  color: #fff;
  font-weight: 800;
  padding: 10px 14px;
}

.dt-body{
  background: #ffffff;
  color: #111;
  padding: 10px 14px;
  border-top: 1px solid #e5e7eb;
}

.dt-col.right{
  text-align: right;
}

/* ปุ่มเวลาแดง (เม็ดกลมขวา) */
.time-pill{
  background: linear-gradient(90deg, #ff3d00, #ff6a13);
  color: #fff;
  font-weight: 900;
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(255, 106, 19, .25);
}

/* ไม่มีผัง */
/* การ์ดผังพื้นดำ (ของเดิม) */
/* การ์ดผังพื้นดำ */
.stage-card{
  background:#000;
  color:#fff;
  border-radius:14px;
  padding:16px;
  display:grid;
  grid-template-columns: 280px 1fr; /* ซ้ายผัง / ขวาข้อมูล */
  gap:20px;
  box-shadow:0 10px 24px rgba(0,0,0,.25);
  align-items:start;
}

/* ถ้าไม่มีผัง → เป็นคอลัมน์เดียว */
.stage-card.noimg{
  grid-template-columns: 1fr;
}

/* ข้อมูลฝั่งขวา */
.stage-info{
  display:grid;
  gap:12px;
}

/* ตารางวันที่/เวลา: ให้กินเต็มแถว (ทั้งการ์ด) */
.stage-card .date-table{
  grid-column: 1 / -1;    /* ← สำคัญ: span ทั้งกริด */
  width: 100%;
  margin-top: 10px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 18px rgba(0,0,0,.25);
}

/* โครงตาราง */
.dt-row{
  display:grid;
  grid-template-columns: 1fr 140px;
  align-items:center;
}
.dt-header{
  background:#4b5563d8; color:#fff; font-weight:800; padding:10px 14px;
}
.dt-body{
  background:#fff; color:#111; padding:10px 14px; border-top:1px solid #e5e7eb;
}
.dt-col.right{ text-align:right; }

/* ปุ่มเวลา */
.time-pill{
  background: linear-gradient(90deg, #ff3d00, #ff6a13);
  color:#fff; font-weight:900; border:none; border-radius:999px;
  padding:10px 18px; cursor:pointer;
  box-shadow:0 6px 14px rgba(255,106,19,.25);
}

/* ป้าย "ไม่มีผัง" */
.no-seatmap-banner{
  background:#f1f5f9; color:#0f172a;
  border:1px dashed #cbd5e1;
  border-radius:10px; padding:8px 12px; font-weight:700; margin-bottom:8px;
}

/* รูปผัง */
.seatmap{
  width:100%; height:170px; object-fit:cover; border-radius:8px; background:#1f2937;
}

/* จอเล็ก */
@media (max-width: 980px){
  .stage-card{ grid-template-columns: 1fr; }
}




/* ปรับระยะบน/ล่างในการ์ด */
.stage-card .date-table{ margin-top: 10px; }


:root{ --orange:#ff6a13; --red:#ff3d00; --ink:#0f172a; --muted:#6b7280; }
body { margin: 0; }
#app { max-width: none; padding: 0; }
</style>

<!-- ===== Styles ของหน้านี้ ===== -->
<style scoped>
.fullbleed {
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
}

.container {
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 20px;
}

/* HERO */
.hero {
  background: linear-gradient(90deg, #20f00d8f 10%, #4cf3ff6a 60%);
  padding: 18px 0 28px;
}

.crumb { margin: 10px 0 14px; }
.back { color: #0b4b44; font-weight: 700; }

.hero-body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 26px;
  align-items: start;
}

.poster-wrap { display: flex; }
.poster {
  width: 260px;
  height: 340px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 6px 14px rgba(0,0,0,.2);
  background: #f2f2f2;
}

.main-info .category {
  font-weight: 700;
  color: #111;
  margin-top: 6px;
}
.main-info .title {
  font-size: 24px;
  font-weight: 800;
  margin: 8px 0 14px;
  color: var(--ink);
  text-align: left;
}

/* grid: ซ้ายรายละเอียด / ขวาราคา */
.facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 24px;
}

.fact-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.fact-list li { display: flex; gap: 10px; align-items: flex-start; }
.ic { width: 22px; height: 22px; fill: #111; flex: 0 0 auto; }
.label { color: #111; font-weight: 700; }
.val { color: #222; }

/* ===== Stage card (พื้นหลังดำ) ===== */
.stage-card .venue-line {
  color: #fff;                /* ให้ข้อความขาว */
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.stage-card .venue-line .ic {
  fill: #fff;                 /* บังคับให้ SVG icon เป็นขาว */
  width: 20px;
  height: 20px;
}


.stage { 
  padding: 22px 0 10px; 
  scroll-margin-top: 80px; /* ปรับตามความสูง header ถ้ามี */
}


.price-head { display: flex; align-items: center; gap: 8px; font-weight: 800; }
/* .price-text { display: block; margin-top: 6px; color: #ffffff; } */
.price-text { display:block; margin-top:6px; }

.cta-row { display: flex; justify-content: flex-end; margin-top: 14px; }
.choose-btn {
  background: var(--red);
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 22px;
  font-weight: 800;
  cursor: pointer;
}

/* ผังการแสดง */
.stage { padding: 22px 0 10px; }
.section-title {
  font-size: 18px; font-weight: 800; margin: 8px 0 14px; color: #111;
}
.stage-card {
  background: #000;
  color: #ffffff;
  border-radius: 14px;
  padding: 16px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  box-shadow: 0 10px 24px rgba(0,0,0,.25);
}


/* HERO (พื้นหลังไล่สี) ให้ตัวหนังสือเป็น “ดำ” */
.hero .price-box .price-text {
  color: #111;
}

/* การ์ดผังพื้นดำ ให้ตัวหนังสือเป็น “ขาว” */
.stage-card .price-text {
  color: #fff;
}


.seatmap {
  width: 100%; height: 170px; object-fit: cover; border-radius: 8px;
  background: #1f2937;
}
.stage-info { display: grid; gap: 12px; }

.venue-line { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.stage-price { display: grid; gap: 4px; }
.muted { color: #cbd5e1; }

.date-buy {
  background: #fff;
  color: #111;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.date-chip .chip-label { color: #6b7280; margin-bottom: 6px; }
.date-chip .chip-val { font-weight: 800; }

.buy-btn {
  background: var(--red);
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 22px;
  font-weight: 800;
  cursor: pointer;
}

/* รายละเอียด */
.desc { padding: 10px 0 44px; }
.desc-title { font-size: 18px; font-weight: 800; margin: 10px 0 14px; }
.desc p { line-height: 1.9; color: #000000; margin: 10px 0; }

/* ให้ thumbnail แสดงว่า “คลิกได้” */
.seatmap { cursor: zoom-in; }

/* ===== Modal Overlay ===== */
.modal-backdrop{
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

.modal-content{
  position: relative;
  background: #111;               /* ขอบภาพดำสวย ๆ */
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
  max-width: min(1200px, 92vw);
  max-height: min(92vh, 1200px);
  padding: 12px;
}

.modal-img{
  display: block;
  max-width: 100%;
  max-height: calc(92vh - 56px);
  height: auto; width: auto;
  border-radius: 8px;
}

.modal-close{
  position: absolute; top: 6px; right: 10px;
  width: 34px; height: 34px; border-radius: 50%;
  border: none; background: #222; color: #fff; font-size: 22px; line-height: 1;
  cursor: pointer;
}
.modal-close:hover{ background:#333; }


/* responsive */
@media (max-width: 980px) {
  .hero-body { grid-template-columns: 1fr; }
  .poster { width: 220px; height: 300px; }
  .facts { grid-template-columns: 1fr; }
  .stage-card { grid-template-columns: 1fr; }
}
</style>