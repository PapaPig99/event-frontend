<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const err = ref('')

const event = ref({
  category: '',
  title: '',
  dateText: '',
  venueText: '',
  gateOpenText: '',
  startTimeText: '',
  priceText: '',
  poster: '',
  seatmap: '',
})

const fallbackPoster  = new URL('../assets/poster-fallback.jpg',  import.meta.url).href
const fallbackSeatmap = new URL('../assets/seatmap-fallback.png', import.meta.url).href

const hasSeatmap = computed(() =>
  !!event.value.seatmap && event.value.seatmap !== fallbackSeatmap
)

function fmtThaiDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' })
}
function normalizeToHHmm(str) {
  if (!str) return ''
  const v = String(str).trim()
  const m24 = v.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (m24) {
    const hh = String(m24[1]).padStart(2, '0')
    const mm = m24[2]
    return `${hh}:${mm}`
  }
  const m12 = v.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (m12) {
    let hh = parseInt(m12[1], 10)
    const mm = m12[2]
    const ap = m12[3].toUpperCase()
    if (ap === 'PM' && hh < 12) hh += 12
    if (ap === 'AM' && hh === 12) hh = 0
    return `${String(hh).padStart(2,'0')}:${mm}`
  }
  return ''
}
function fmtThaiTime(anyTime) {
  const hhmm = normalizeToHHmm(anyTime)
  return hhmm ? `${hhmm} น.` : ''
}
function getFirstSessionStart(d) {
  const list = Array.isArray(d?.sessions) ? d.sessions : []
  for (const s of list) {
    const t = s?.startTime ?? s?.time ?? s?.start_at ?? s?.start
    const hhmm = normalizeToHHmm(t)
    if (hhmm) return hhmm
  }
  return ''
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

onMounted(async () => {
  loading.value = true; err.value = ''
  try {
    const { data: d } = await api.get(`/events/${route.params.id}`)
    const sessionHHmm = getFirstSessionStart(d)
    event.value = {
      title: d.title ?? '',
      category: d.category ?? '',
      dateText: fmtThaiDate(d.startDate),
      venueText: d.location ?? '',
      gateOpenText: fmtThaiTime(d?.doorOpenTime),
      startTimeText: sessionHHmm ? `${sessionHHmm} น.` : '—',
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

const isSeatmapOpen = ref(false)
const seatmapLarge = ref('')
function openSeatmap(){ isSeatmapOpen.value = true; seatmapLarge.value = event.value.seatmap }
function closeSeatmap(){ isSeatmapOpen.value = false }

const stageSection = ref(null)
function scrollToStage() {
  const el = stageSection.value
  if (!el) return
  const y = el.getBoundingClientRect().top + window.pageYOffset - 80
  window.scrollTo({ top: y, behavior: 'smooth' })
}
function goToConcertPlan() {
  const id = route.params.id
  const eventLite = {
    id,
    title: event.value.title,
    posterImageUrl: event.value.poster,
    seatmapImageUrl: event.value.seatmap,
    location: event.value.venueText,
    doorOpenTime: event.value.gateOpenText?.replace(' น.','') || undefined
  }
  router.push({ name: 'concert-plan', params: { id }, state: { eventLite } })
  sessionStorage.setItem(`eventLite:${id}`, JSON.stringify(eventLite))
}
</script>

<template>
  <div v-if="loading" style="padding:16px">กำลังโหลด...</div>
  <p v-else-if="err" style="padding:16px; color:#b91c1c">{{ err }}</p>

  <div class="detail-page" v-else>
    <section class="hero fullbleed">
      <div class="container">
        <div class="crumb"><a href="#desc" class="back">รายละเอียด</a></div>

        <div class="hero-body">
          <div class="poster-wrap">
            <img :src="event.poster" alt="Event Poster" class="poster" />
          </div>

          <div class="main-info">
            <div class="category">{{ event.category }}</div>
            <h1 class="title">{{ event.title }}</h1>

            <div class="info-card">
              <div class="info-grid">
                <div class="info-item">
                  <div class="ico-wrap"><i class="fa-regular fa-calendar"></i></div>
                  <div>
                    <div class="label">วันแสดง</div>
                    <div class="val">{{ event.dateText }}</div>
                  </div>
                </div>
                <div class="info-item">
                  <div class="ico-wrap"><i class="fa-solid fa-location-dot"></i></div>
                  <div>
                    <div class="label">สถานที่แสดง</div>
                    <div class="val">{{ event.venueText }}</div>
                  </div>
                </div>
                <div class="info-item">
                  <div class="ico-wrap"><i class="fa-regular fa-clock"></i></div>
                  <div>
                    <div class="label">ประตูเปิด</div>
                    <div class="val">{{ event.gateOpenText }}</div>
                  </div>
                </div>
                <div class="info-item">
                  <div class="ico-wrap"><i class="fa-regular fa-money-bill-1"></i></div>
                  <div>
                    <div class="label">ราคาบัตร</div>
                    <div class="val">{{ event.priceText }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="cta-row">
              <button class="choose-btn" @click="scrollToStage">เลือกรอบ/ประเภทบัตร</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="stage" ref="stageSection" id="stage-section">
      <div class="container">
        <h2 class="section-title">ผังการแสดง & รอบการแสดง</h2>

        <div class="stage-card" :class="{ 'noimg': !hasSeatmap }">
          <img v-if="hasSeatmap" :src="event.seatmap" alt="Seat map" class="seatmap" @click="openSeatmap"/>

          <div class="stage-info">
            <div v-if="!hasSeatmap" class="no-seatmap-banner">งานนี้ไม่ได้ระบุผัง</div>

            <div class="venue-line">
              <svg viewBox="0 0 24 24" class="ic"><path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>
              <span>{{ event.venueText }}</span>
            </div>

            <div class="stage-price">
              <span class="muted">ราคาบัตร</span>
              <span class="price-text">{{ event.priceText }}</span>
            </div>
          </div>

          <div class="date-table">
            <div class="dt-row dt-header">
              <div class="dt-col">วันที่แสดง</div>
              <div class="dt-col right">เวลา</div>
            </div>
            <div class="dt-row dt-body">
              <div class="dt-col">{{ event.dateText }}</div>
              <div class="dt-col right">
                <button class="time-pill" @click="goToConcertPlan">{{ event.startTimeText }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="desc" class="desc">
      <div class="container">
        <h2 class="section-title">รายละเอียด</h2>
        <h3 class="desc-title">{{ event.title }}</h3>
        <p>จำหน่ายบัตร</p>
      </div>
    </section>

    <div v-if="isSeatmapOpen && hasSeatmap" class="modal-backdrop" @click.self="closeSeatmap">
      <div class="modal-content">
        <button class="modal-close" @click="closeSeatmap">×</button>
        <img :src="seatmapLarge" alt="Seat map large" class="modal-img" />
      </div>
    </div>
  </div>
</template>

<style>
:root{ --orange:#ff6a13; --red:#ff3d00; --ink:#0f172a; --muted:#6b7280; }
body { margin: 0; }
#app { max-width: none; padding: 0; }

.date-table{ margin-top:8px; border-radius:12px; overflow:hidden; box-shadow:0 8px 18px rgba(0,0,0,.10); border:1px solid #e5e7eb; background:#fff; }
.dt-row{ display:grid; grid-template-columns:1fr 140px; align-items:center; }
.dt-header{ background:#f3f4f6; color:#111; font-weight:800; padding:10px 14px; }
.dt-body{ background:#fff; color:#111; padding:10px 14px; border-top:1px solid #e5e7eb; }
.dt-col.right{ text-align:right; }

.time-pill{ background:linear-gradient(90deg,#ff3d00,#ff6a13); color:#fff; font-weight:900; border:none; border-radius:999px; padding:10px 18px; cursor:pointer; box-shadow:0 6px 14px rgba(255,106,19,.25); }

.stage-card{ background:#fff; color:#111; border-radius:14px; padding:16px; display:grid; grid-template-columns:280px 1fr; gap:20px; box-shadow:0 10px 24px rgba(0,0,0,.06); border:1px solid #e5e7eb; align-items:start; }
.stage-card.noimg{ grid-template-columns:1fr; }
.stage-info{ display:grid; gap:12px; }
.stage-card .date-table{ grid-column:1 / -1; width:100%; margin-top:10px; }
.no-seatmap-banner{ background:#f8fafc; color:#0f172a; border:1px dashed #cbd5e1; border-radius:10px; padding:8px 12px; font-weight:700; margin-bottom:8px; }
.seatmap{ width:100%; height:170px; object-fit:cover; border-radius:8px; background:#e5e7eb; cursor:zoom-in; }

@media (max-width: 980px){ .stage-card{ grid-template-columns:1fr; } }
</style>

<style scoped>
.fullbleed{ width:100vw; position:relative; left:50%; right:50%; margin-left:-50vw; margin-right:-50vw; }
.container{ max-width:1160px; margin:0 auto; padding:0 20px; }
.hero{ background: linear-gradient(90deg, #e6fff4 10%, #e3f6ff 60%); padding:18px 0 28px; }
.crumb{ margin:10px 0 14px; }
.back{ color:#0b4b44; font-weight:700; }
.hero-body{ display:grid; grid-template-columns:320px 1fr; gap:26px; align-items:start; }
.poster-wrap{ display:flex; }
.poster{ width:100%; aspect-ratio:420 / 594; object-fit:cover; border-radius:0; box-shadow:0 6px 14px rgba(0,0,0,.12); background:#f2f2f2; }
.main-info .category{ font-weight:700; color:#111; margin-top:6px; }
.main-info .title{ font-size:24px; font-weight:800; margin:8px 0 14px; color:var(--ink); text-align:left; }
.info-card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; box-shadow:0 8px 18px rgba(0,0,0,.05); }
.info-grid{ display:grid; grid-template-columns:1fr 1fr; gap:16px 24px; }
.info-item{ display:flex; gap:12px; align-items:flex-start; }
.ico-wrap{ width:32px; height:32px; border-radius:50%; background:#f3f4f6; display:flex; align-items:center; justify-content:center; color:#111; }
.label{ color:#6b7280; font-weight:700; font-size:13px; }
.val{ color:#111; font-weight:600; }
.cta-row{ display:flex; justify-content:flex-end; margin-top:14px; }
.choose-btn{ background: var(--red); color:#fff; border:none; padding:10px 18px; border-radius:22px; font-weight:800; cursor:pointer; }
.stage{ padding:22px 0 10px; scroll-margin-top:80px; }
.section-title{ font-size:18px; font-weight:800; margin:8px 0 14px; color:#111; }
.venue-line{ display:flex; align-items:center; gap:8px; font-weight:700; color:#111; }
.venue-line .ic{ fill:#111; width:20px; height:20px; }
.stage-price{ display:grid; gap:4px; }
.muted{ color:#6b7280; }
.price-text{ color:#111; }
.desc{ padding:10px 0 44px; }
.desc-title{ font-size:18px; font-weight:800; margin:10px 0 14px; }
.desc p{ line-height:1.9; color:#000; margin:10px 0; }
</style>
