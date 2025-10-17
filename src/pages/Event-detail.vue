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
  description: '',
  dateText: '',
  venueText: '',
  timeText: '',
  priceText: '',
  poster: '',
  seatmap: '',
  saleStartAt: null,        // ISO ที่เป็น “พ.ศ.” จาก API
  saleEndAt: null,          // อาจเป็น null
  saleUntilSoldout: false,  // true/false
})

// ================== SOLD OUT STATE ==================
const soldOut = ref(new Set())          // เก็บ sessionId ที่บัตรหมด
const showSoldOut = ref(false)          // เปิด/ปิด overlay
const soldOutMsg = ref('บัตรหมดแน้ว 🥲')

function isSoldOut(sessionId) {
  return soldOut.value.has(Number(sessionId))
}
async function prefetchAvailability() {
  if (!Array.isArray(sessions.value) || !sessions.value.length) return
  const tasks = sessions.value
    .filter(s => s?.id)
    .map(async (s) => {
      try {
        const { data } = await api.get(`/zones/session/${s.id}/availability`)
        const totalAvailable = Array.isArray(data)
          ? data.reduce((sum, z) => sum + Number(z?.available || 0), 0)
          : 0
        if (event.value.saleUntilSoldout && totalAvailable <= 0) {
          soldOut.value.add(Number(s.id))
        } else {
          soldOut.value.delete(Number(s.id))
        }
      } catch {
        // ถ้าเรียกไม่สำเร็จ ไม่ mark sold out เพื่อไม่บล็อกผู้ใช้
      }
    })
  await Promise.allSettled(tasks)
}
const showDateText = computed(() => {
  if (!event.value.startDateRaw || !event.value.endDateRaw) return "-";

  const start = new Date(event.value.startDateRaw);
  const end = new Date(event.value.endDateRaw);

  const formatShort = (d, withYear = false) => {
    const opts = { day: "numeric", month: "short" };
    if (withYear) opts.year = "numeric";
    return d.toLocaleDateString("th-TH", opts);
  };

  if (start.toDateString() === end.toDateString()) {
    return `${formatShort(start, true)}`;
  }

  return `${formatShort(start)} - ${formatShort(end, true)}`;
});


const sessions = ref([])
const sessionsSorted = computed(() => {
  return [...sessions.value].sort((a, b) => {
    const ax = new Date(a.startAt || a.start_at || a.startDate || 0).getTime()
    const bx = new Date(b.startAt || b.start_at || b.startDate || 0).getTime()
    return ax - bx
  })
})
// แปลงวันที่/เวลา (รองรับปี พ.ศ. และรูปแบบทั่วไป)
function toDateFromBuddhistOrIso(input) {
  if (!input) return null
  const raw = String(input).trim()
  // YYYY-MM-DD(TH) [T HH:mm[:ss]]
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (!m) return new Date(raw)
  let y = +m[1]; const mo = +m[2] - 1; const d = +m[3]
  const hh = +(m[4] || 0), mm = +(m[5] || 0), ss = +(m[6] || 0)
  if (y > 2400) y -= 543
  const dt = new Date(y, mo, d, hh, mm, ss)
  return isNaN(dt) ? null : dt
}
function formatSessionDate(s) {
  const d = toDateFromBuddhistOrIso(s.startAt || s.start_at || s.startDate || s.date)
  if (!d) return '-'
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatSessionTime(s) {
  // ถ้า api ให้ startTime เป็น "HH:mm[:ss]"
  const t = s.startTime || s.start_time
  if (t && /^\d{1,2}:\d{2}/.test(String(t))) return String(t).slice(0, 5) + ' น.'
  const d = toDateFromBuddhistOrIso(s.startAt || s.start_at || s.startDate || s.date)
  if (!d) return '-'
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
}
/* ========= รูป fallback ========= */
const fallbackPoster = new URL('../assets/poster-fallback.jpg', import.meta.url).href
const fallbackSeatmap = new URL('../assets/seatmap-fallback.png', import.meta.url).href

/* ========= มีผังหรือไม่ ========= */
const hasSeatmap = computed(() =>
  !!event.value.seatmap && event.value.seatmap !== fallbackSeatmap
)

/* ========= โหลดจาก API ========= */
onMounted(async () => {
  loading.value = true; err.value = ''
  try {
    const id = Number(route.params.id)
    const { data: raw } = await api.get(`/events/${route.params.id}`)
    const d = Array.isArray(raw) ? (raw.find(e => Number(e.id) === id) || {}) : raw

    event.value = {
      title: d.title ?? '',
      description: d.description ?? '',
      category: d.category ?? '',
      dateText: fmtThaiDate(d.startDate),
      venueText: d.location ?? '',
      timeText: formatDoorOpen(d.doorOpenTime),
      priceText: buildPriceText(d),
      poster: d.posterImageUrl || d.detailImageUrl || fallbackPoster,
      seatmap: d.seatmapImageUrl || d.detailImageUrl || fallbackSeatmap,
      startDateRaw: d.startDate ?? null,
      endDateRaw: d.endDate ?? null,
      saleStartAt: d.saleStartAt ?? null,
      saleEndAt: d.saleEndAt ?? null,
      saleUntilSoldout: !!d.saleUntilSoldout,
    }
    if (Array.isArray(d.sessions) && d.sessions.length) {
      sessions.value = d.sessions
      // หลังตั้งค่า sessions.value เสร็จแล้ว
      await prefetchAvailability()

    } else {
      // 2.2 fallback: ลอง endpoint อื่นๆ ที่พบบ่อย
      const paths = [
        `/events/${route.params.id}/view`,
        `/events/${route.params.id}/sessions`,
        `/event_sessions?eventId=${route.params.id}`,
      ]
      for (const p of paths) {
        try {
          const { data: r } = await api.get(p)
          // /view อาจคืน object ใหญ่ ต้องเด้งไป field sessions
          const arr = Array.isArray(r) ? r : (Array.isArray(r?.sessions) ? r.sessions : [])
          if (arr.length) { sessions.value = arr; break }
        } catch { }
      }
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

// ===== Gate: เริ่มขาย / หมดเขตขาย / วันจบงาน =====
function endOfDay(d) {
  if (!d) return null
  const x = new Date(d.getTime())
  x.setHours(23, 59, 59, 999)
  return x
}
const now = () => new Date()
const saleStartAtDate = computed(() =>
  toDateFromThaiBuddhistISO(event.value.saleStartAt)
)
const saleEndAtDate = computed(() =>
  event.value.saleEndAt ? toDateFromThaiBuddhistISO(event.value.saleEndAt) : null
)
const eventEndAtDate = computed(() => {
  // endDateRaw = YYYY-MM-DD (อาจเป็น พ.ศ.) → แปลงเป็น Date แล้วชงปลายวัน
  const d = toDateFromBuddhistOrIso(event.value.endDateRaw)
  return endOfDay(d)
})
const saleStarted = computed(() => {
  const s = saleStartAtDate.value
  // ถ้าไม่ระบุ saleStartAt ถือว่าเริ่มขายแล้ว (เช่นงานฟรี/เปิดทันที)
  return s ? now() >= s : true
})
const saleEnded = computed(() => {
  const n = now()
  if (saleEndAtDate.value && n > saleEndAtDate.value) return true
  if (eventEndAtDate.value && n > eventEndAtDate.value) return true
  return false
})
const canSelectSession = computed(() => {
  return (
    saleStarted.value &&
    !saleEnded.value &&
    String(event.value?.status || 'OPEN') === 'OPEN'
  )
})

const saleStartText = computed(() => {
  if (!event.value.saleStartAt) return '-'
  const start = formatThaiDateTimeFromBuddhistISO(event.value.saleStartAt)
  const until = event.value.saleUntilSoldout
    ? ' จนกว่าบัตรจะหมด'
    : (event.value.saleEndAt ? ` ถึง ${formatThaiDateTimeFromBuddhistISO(event.value.saleEndAt)}` : '')
  return start + until
})

/* ========= utils ========= */
function fmtThaiDate(iso) {
  if (!iso) return ''
  // รองรับรูปแบบ "2568-01-10" (ปี พ.ศ.)
  const parts = String(iso).split('-')
  if (parts.length >= 3) {
    let year = Number(parts[0])
    const month = Number(parts[1]) - 1
    const day = Number(parts[2])
    // ถ้าปี > 2400 แปลว่าเป็นพ.ศ. → แปลงเป็น ค.ศ.
    if (year > 2400) year -= 543
    const d = new Date(year, month, day)
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return iso
}
function fmtThaiTime(hms) {
  if (!hms) return ''
  return String(hms).slice(0, 5) + ' น.'
}

function formatDoorOpen(v) {
  if (v == null) return '-'
  const s = String(v).trim()
  // ถ้าเป็นเวลาแบบ 9:00, 09:00 หรือ 09:00:00 → รูปแบบ HH:mm (น.)
  const isClock = /^\d{1,2}:\d{2}(?::\d{2})?$/.test(s)
  if (isClock) return s.slice(0, 5) + ' น.'
  // ไม่ใช่เวลา → คืนข้อความตามเดิม (เช่น "ก่อนเริ่มงาน 1 ชม.")
  return s
}

function isNum(v) { return v !== null && v !== undefined && !isNaN(Number(v)) }
// --- NEW: แปลง “พ.ศ.” → “ค.ศ.” จากสตริงรูปแบบ YYYY-MM-DDTHH:mm:ss
function toDateFromThaiBuddhistISO(isoBuddhist) {
  if (!isoBuddhist) return null
  const m = String(isoBuddhist).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (!m) return null
  const by = Number(m[1]) - 543     // ลบ 543 ปี
  const mm = Number(m[2]) - 1
  const dd = Number(m[3])
  const hh = Number(m[4] || 0)
  const mi = Number(m[5] || 0)
  const ss = Number(m[6] || 0)
  const d = new Date(by, mm, dd, hh, mi, ss)
  return isNaN(d) ? null : d
}

// --- NEW: ฟอร์แมท Date → “6 ธันวาคม 2567, 19:00 น.”
function formatThaiDateTimeFromBuddhistISO(isoBuddhist) {
  const d = toDateFromThaiBuddhistISO(isoBuddhist)
  if (!d) return '-'
  const dd = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  const tt = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return `${dd}, ${tt} น.`
}

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
function openSeatmap() { isSeatmapOpen.value = true; seatmapLarge.value = event.value.seatmap }
function closeSeatmap() { isSeatmapOpen.value = false }

/* ========= scroll helper ========= */
const stageSection = ref(null)
function scrollToStage() {
  const el = stageSection.value
  if (!el) return
  const y = el.getBoundingClientRect().top + window.pageYOffset - 80
  window.scrollTo({ top: y, behavior: 'smooth' })
}



/* ========= ไปหน้าเลือกแผน/ประเภทบัตร ========= */
function goToConcertPlan(session) {
  const id = route.params.id

  const sessionsLite = (Array.isArray(sessions.value) ? sessions.value : []).map(s => ({
    id: s.id,
    // รองรับหลายชื่อ field จาก backend
    startAt: s.startAt || s.start_at || s.startDate || s.date || null,
    startTime: (s.startTime || s.start_time || '').slice(0, 5),
    name: s.name || null
  }))

  // เก็บข้อมูลย่อส่งต่อไปหน้า ConcertPlan (ใส่เท่าที่มีจากหน้านี้)
  const eventLite = {
    id,
    title: event.value.title,
    posterImageUrl: event.value.poster,
    seatmapImageUrl: event.value.seatmap,
    // ถ้าอยากส่งเวลาแบบดิบ ให้ลอกจาก API ฝั่ง ConcertPlan; ที่นี่มีเฉพาะข้อความแสดงผล
    location: event.value.venueText,
    startAt: session?.startAt || session?.start_at || session?.startDate || null,
    startTime: (session?.startTime || session?.start_time || '').replace(/:00$/, ''),
    sessions: sessionsLite
  }

  // ส่งผ่าน router state และกันพลาดเก็บไว้ใน sessionStorage
  router.push({
    name: 'concert-plan',
    params: { id },
    state: { eventLite, sessionId: session?.id || null }
  })
  sessionStorage.setItem(`eventLite:${id}`, JSON.stringify(eventLite))
  if (session?.id) sessionStorage.setItem(`sessionId:${id}`, String(session.id))
}
function goToPayment() {
  router.push({ name: 'payment', params: { id: route.params.id }, state: { order /* ข้อมูลที่เลือก */ } })
}





async function checkAvailabilityAndGo(session) {
  if (!canSelectSession.value) { err.value = 'ปิดจำหน่ายแล้ว'; return }

  const sid = session?.id
  if (!sid) { err.value = 'ไม่พบรหัสรอบ'; return }

  try {
    const { data } = await api.get(`/zones/session/${sid}/availability`)
    const totalAvailable = Array.isArray(data)
      ? data.reduce((sum, z) => sum + Number(z?.available || 0), 0)
      : 0

    if (event.value.saleUntilSoldout && totalAvailable <= 0) {
      soldOut.value.add(Number(sid))
      showSoldOut.value = true
      soldOutMsg.value = 'รอบนี้บัตรหมดแน้ว 🥲'
      return
    }

    goToConcertPlan(session)
  } catch {
    err.value = 'ตรวจสอบจำนวนที่ว่างไม่สำเร็จ'
  }
}


// ===== Ticket Status (แบบเดียวกับไฟล์แรก) =====
const allSessionsSoldOut = computed(() => {
  // ใช้ก็ต่อเมื่อเป็นงานที่ขายจนกว่าจะหมดเท่านั้น
  if (!event.value.saleUntilSoldout) return false
  const arr = Array.isArray(sessions.value) ? sessions.value : []
  if (!arr.length) return false
  // ทุก session หมด (อิงจาก prefetchAvailability ที่ใส่ลง soldOut แล้ว)
  return arr.every(s => soldOut.value.has(Number(s.id)))
})

// รวมเงื่อนไขต่าง ๆ เพื่อสรุปสถานะ
const ticketSaleStatus = computed(() => {
  if (!saleStarted.value) return 'UPCOMING'
  if (saleEnded.value) return 'CLOSED'
  if (allSessionsSoldOut.value) return 'CLOSED'
  // เพิ่ม safety: ถ้า backend มี field status != OPEN ให้ถือว่าปิด
  if (String(event.value?.status || 'OPEN') !== 'OPEN') return 'CLOSED'
  return 'OPEN'
})

// ข้อความและคลาสสำหรับป้าย
const tsText = computed(() => {
  switch (ticketSaleStatus.value) {
    case 'UPCOMING': return 'เร็ว ๆ นี้'
    case 'OPEN': return 'เปิดให้ซื้อตั๋วแล้ว'
    case 'CLOSED': return 'ปิดการขายแล้ว'
    default: return '-'
  }
})
const tsClass = computed(() => {
  switch (ticketSaleStatus.value) {
    case 'UPCOMING': return 'soon'
    case 'OPEN': return 'open'
    case 'CLOSED': return 'closed'
    default: return ''
  }
})


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
                  <div>
                    <div class="label"><i class="fa-regular fa-calendar"></i>
                      วันงาน</div>
                <div class="value">{{ showDateText }}</div>
                  </div>
                </li>
                <li>

                  <div>
                    <div class="label"><i class="fa-solid fa-location-dot"></i>
                      สถานที่งาน</div>
                    <div class="val">{{ event.venueText }}</div>
                  </div>
                </li>
                <li>

                  <div>
                    <div class="label"> <i class="fa-regular fa-clock"></i>
                      ประตูเปิด</div>
                    <div class="val">{{ event.timeText }}</div>
                  </div>
                </li>

              </ul>

              <div class="price-box">
                <div style="margin-bottom: 10px;">
                  <div class="label"><i class="fa-solid fa-cart-shopping"></i> วันเปิดจำหน่าย</div>
                  <div class="val">{{ saleStartText }}</div>
                </div>
                <div class="price-head">
                  <i class="fa-regular fa-money-bill-1"></i>
                  <span>ราคาบัตร</span>
                </div>
                <div class="price-text">{{ event.priceText }}</div>

                <!-- Ticket Status -->
                <div class="info-item status">
                  <i class="fa-solid fa-ticket"></i>
                  <div class="status-wrap">
                    <div class="label">Ticket Status</div>
                    <div class="value">
                      <span class="status-pill" :class="tsClass">{{ tsText }}</span>
                    </div>
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

    <!-- ผังงาน & รอบของงาน -->
    <section class="stage" ref="stageSection" id="stage-section">
      <div class="container">
        <h2 class="section-title">ผังงาน & รอบของงาน</h2>

        <div class="stage-card" :class="{ 'noimg': !hasSeatmap }">
          <!-- ซ้าย: รูปผัง (เฉพาะมีผัง) -->
          <img v-if="hasSeatmap" :src="event.seatmap" alt="Seat map" class="seatmap" @click="openSeatmap" />

          <!-- ขวา: ข้อมูลหลัก -->
          <div class="stage-info">
            <div class="venue-line">
              <svg viewBox="0 0 24 24" class="ic">
                <path
                  d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
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
              <div class="dt-col">วันงาน</div>
              <div class="dt-col right">เวลา</div>
            </div>
            <div v-if="sessionsSorted.length" class="dt-row dt-body" v-for="s in sessionsSorted" :key="s.id">
              <div class="dt-col">
                {{ s.name || formatSessionDate(s) }}
              </div>
              <div class="dt-col right">
                <button class="time-pill" :disabled="!canSelectSession || isSoldOut(s.id)"
                  :aria-disabled="!canSelectSession || isSoldOut(s.id)"
                  :title="!canSelectSession ? 'ปิดจำหน่ายแล้ว' : (isSoldOut(s.id) ? 'บัตรหมดแล้ว' : 'เลือกเวลานี้')"
                  @click="checkAvailabilityAndGo(s)">
                  {{ formatSessionTime(s) }}
                </button>


              </div>
            </div>
            <div v-else class="dt-row dt-body">
              <div class="dt-col">—</div>
              <div class="dt-col right">—</div>
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
        <p class="description">{{ event.description }}</p>
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
.stage-card.noimg {
  grid-template-columns: 1fr;
}


/* ===== Date/Time table inside black stage card ===== */
.date-table {
  margin-top: 8px;
  border-radius: 12px;
  overflow: hidden;
  /* ให้หัว/ตัวตารางโค้งต่อกัน */
  box-shadow: 0 8px 18px rgba(0, 0, 0, .25);
}

.dt-row {
  display: grid;
  grid-template-columns: 1fr 140px;
  /* ซ้าย: วันที่ (ยืด), ขวา: เวลา (กว้างคงที่) */
  align-items: center;
}

.dt-header {
  background: #4b5563d8;
  /* เทาเข้มตามภาพ */
  color: #fff;
  font-weight: 800;
  padding: 10px 14px;
}

.dt-body {
  background: #ffffff;
  color: #111;
  padding: 10px 14px;
  border-top: 1px solid #e5e7eb;
}

.dt-col.right {
  text-align: right;
}

/* ปุ่มเวลาแดง (เม็ดกลมขวา) */
.time-pill {
  background: linear-gradient(90deg, #ff3d00, #ff6a13);
  color: #fff;
  font-weight: 900;
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(255, 106, 19, .25);
}

.time-pill[disabled],
.time-pill[aria-disabled="true"] {
  opacity: .45;
  cursor: not-allowed;
  box-shadow: none;
  filter: grayscale(0.25);
}

/* ไม่มีผัง */
/* การ์ดผังพื้นดำ (ของเดิม) */
/* การ์ดผังพื้นดำ */
.stage-card {
  background: #000;
  color: #fff;
  border-radius: 14px;
  padding: 16px;
  display: grid;
  grid-template-columns: 280px 1fr;
  /* ซ้ายผัง / ขวาข้อมูล */
  gap: 20px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, .25);
  align-items: start;
}

/* ถ้าไม่มีผัง → เป็นคอลัมน์เดียว */
.stage-card.noimg {
  grid-template-columns: 1fr;
}

/* ข้อมูลฝั่งขวา */
.stage-info {
  display: grid;
  gap: 12px;
}

/* ตารางวันที่/เวลา: ให้กินเต็มแถว (ทั้งการ์ด) */
.stage-card .date-table {
  grid-column: 1 / -1;
  /* ← สำคัญ: span ทั้งกริด */
  width: 100%;
  margin-top: 10px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 18px rgba(0, 0, 0, .25);
}

/* โครงตาราง */
.dt-row {
  display: grid;
  grid-template-columns: 1fr 140px;
  align-items: center;
}

.dt-header {
  background: #4b5563d8;
  color: #fff;
  font-weight: 800;
  padding: 10px 14px;
}

.dt-body {
  background: #fff;
  color: #111;
  padding: 10px 14px;
  border-top: 1px solid #e5e7eb;
}

.dt-col.right {
  text-align: right;
}

/* ปุ่มเวลา */
.time-pill {
  background: linear-gradient(90deg, #ff3d00, #ff6a13);
  color: #fff;
  font-weight: 900;
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(255, 106, 19, .25);
}



/* รูปผัง */
.seatmap {
  width: 100%;
  height: 170px;
  object-fit: cover;
  border-radius: 8px;
  background: #1f2937;
}

/* จอเล็ก */
@media (max-width: 980px) {
  .stage-card {
    grid-template-columns: 1fr;
  }
}




/* ปรับระยะบน/ล่างในการ์ด */
.stage-card .date-table {
  margin-top: 10px;
}


:root {
  --orange: #ff6a13;
  --red: #ff3d00;
  --ink: #0f172a;
  --muted: #6b7280;
}

body {
  margin: 0;
}

#app {
  max-width: none;
  padding: 0;
}
</style>

<!-- ===== Styles ของหน้านี้ ===== -->
<style scoped>
/* ticket status */

/* Ticket Status pill */
/* Ticket Status pill (modern minimal) */
.info-item.status .status-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-pill {
  display: inline-block;
  padding: 10px 18px;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  border: none;
  background-color: #fff;

}

/* สีตามสถานะ */
.status-pill.open {
  /* เขียวจาง */
  color: #107c38;
}

.status-pill.soon {
  /* เหลืองจาง */
  color: #ca8a04;
}

.status-pill.closed {
  /* แดงจาง */
  color: #dc2626;
}
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

.crumb {
  margin: 10px 0 14px;
}

.back {
  color: #0b4b44;
  font-weight: 700;
}

.hero-body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 26px;
  align-items: start;
}

.poster-wrap {
  display: flex;
}

.poster {
  width: 260px;
  height: 340px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, .2);
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

.fact-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.fact-list li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.ic {
  width: 22px;
  height: 22px;
  fill: #111;
  flex: 0 0 auto;
}

.label {
  color: #111;
  font-weight: 700;
}

.val {
  color: #222;
}

/* ===== Stage card (พื้นหลังดำ) ===== */
.stage-card .venue-line {
  color: #fff;
  /* ให้ข้อความขาว */
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.stage-card .venue-line .ic {
  fill: #fff;
  /* บังคับให้ SVG icon เป็นขาว */
  width: 20px;
  height: 20px;
}


.stage {
  padding: 22px 0 10px;
  scroll-margin-top: 80px;
  /* ปรับตามความสูง header ถ้ามี */
}


.price-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

/* .price-text { display: block; margin-top: 6px; color: #ffffff; } */
.price-text {
  display: block;
  margin-top: 6px;
}

.cta-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

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
.stage {
  padding: 22px 0 10px;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
  margin: 8px 0 14px;
  color: #111;
}

.stage-card {
  background: #000;
  color: #ffffff;
  border-radius: 14px;
  padding: 16px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, .25);
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
  width: 100%;
  height: 170px;
  object-fit: cover;
  border-radius: 8px;
  background: #1f2937;
}

.stage-info {
  display: grid;
  gap: 12px;
}

.venue-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.stage-price {
  display: grid;
  gap: 4px;
}

.muted {
  color: #cbd5e1;
}

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

.date-chip .chip-label {
  color: #6b7280;
  margin-bottom: 6px;
}

.date-chip .chip-val {
  font-weight: 800;
}

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
.desc {
  padding: 10px 0 44px;
}

.desc-title {
  font-size: 18px;
  font-weight: 800;
  margin: 10px 0 14px;
}

.desc p {
  line-height: 1.9;
  color: #000000;
  margin: 10px 0;
}

/* ให้ thumbnail แสดงว่า “คลิกได้” */
.seatmap {
  cursor: zoom-in;
}

/* ===== Modal Overlay ===== */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, .7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-content {
  position: relative;
  background: #111;
  /* ขอบภาพดำสวย ๆ */
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .6);
  max-width: min(1200px, 92vw);
  max-height: min(92vh, 1200px);
  padding: 12px;
}

.modal-img {
  display: block;
  max-width: 100%;
  max-height: calc(92vh - 56px);
  height: auto;
  width: auto;
  border-radius: 8px;
}

.modal-close {
  position: absolute;
  top: 6px;
  right: 10px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: #222;
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.modal-close:hover {
  background: #333;
}


/* responsive */
@media (max-width: 980px) {
  .hero-body {
    grid-template-columns: 1fr;
  }

  .poster {
    width: 220px;
    height: 300px;
  }

  .facts {
    grid-template-columns: 1fr;
  }

  .stage-card {
    grid-template-columns: 1fr;
  }
}
</style>