
<!-- EventCardSection.vue -->
<template>
  <section class="event-section">
    <!-- Title -->
    <div class="title-row" style="margin-bottom: -50px;">
      <svg class="title-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm14-1h2a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2h-2"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <h1 >My Event Tickets</h1>
    </div>

    <!-- ===== Ticket Popup (Modal) ===== -->
<!-- ===== Ticket Popup (Modal) ===== -->
<div v-if="showTicket" class="modal-backdrop" @click.self="closeTicket">
  <div class="ticket-modal">
    <div class="ticket-card">
      <!-- Header -->
      <div class="ticket-head">
        <img class="brand-logo" :src="logoUrl" alt="JoinUp" />
        <button class="close-x" @click="closeTicket" aria-label="Close">×</button>
      </div>
      <div class="divider"></div>
      <p class="hint">Please show it when you arrive at the venue</p>

      <!-- QR Placeholder ตายตัว ไม่ต้องโหลดรูป -->
      <div class="qr qr-fallback">QR</div>

      <!-- Details -->
      <div class="details">
        <div class="row">
          <span class="label red">Event Name</span>
          <div class="value name">{{ activeTicket?.eventName || 'Event' }}</div>
        </div>

        <div class="row grid3">
          <div class="cell">
            <span class="label">Event Time</span>
            <div class="value">{{ activeTicket?.timeRange || '-' }}</div>
          </div>
          <div class="cell">
            <span class="label">Zone</span>
            <div class="value">{{ activeTicket?.zone || '-' }}</div>
          </div>
          <div class="cell">
            <span class="label red">Ticket ID</span>
            <div class="value">{{ activeTicket?.ticketCode || activeTicket?.id || '-' }}</div>
          </div>
        </div>
      </div>

      <!-- Dots สำหรับหลายรอบ -->
      <div v-if="tickets.length > 1" class="dots">
        <button
          v-for="(t,i) in tickets"
          :key="t.id || i"
          :class="['dot', {active: i === activeIdx}]"
          @click="goTicket(i)"
        />
      </div>
    </div>
</div>
</div>


    <!-- Profile -->
    <div class="profile-box">
      
      <i class="fa-solid fa-user avatar"></i>
      <div class="info">
        <p class="name" style="margin-bottom: 0px;">{{ user.name }}</p>
        <p class="email">{{ user.email }}</p>
      </div>
      <!-- <button class="edit-btn">Edit Profile</button> -->
    </div>

    <!-- Single list: ประวัติบัตร -->
    <h3 style="margin: 16px 2px 8px; font-weight: 800;">บัตรของฉัน</h3>

    <div class="event-list">
      <article v-for="event in allEvents" :key="event.registrationId" class="event-card">
        <img
          v-if="event.currentImage"
          :src="event.currentImage"
          alt="Event Poster"
          class="poster"
          @error="onImgError(event)"
        />

        <div class="event-info">
          <p class="date">{{ formatDate(event.date) }}</p>
          <h3 class="event-title">{{ event.title }}</h3>
          <p class="location">{{ event.location }}</p>
          <button class="view-btn" @click="openTicketModal(event.registrationId)">
  <i class="fa-solid fa-qrcode"></i>
  <span>View Ticket</span>
</button>

        </div>
      </article>

      <p v-if="!allEvents.length" class="empty">ยังไม่มีประวัติบัตร</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted ,onUnmounted} from 'vue'
import axios from 'axios'
import api from '@/lib/api' // สำหรับ /registrations/me
const logoUrl = new URL('../assets/logo.png', import.meta.url).href

const regMap = new Map()
const user = ref({ name: '', email: '' })
const cards = ref([])
const loading = ref(true)
const error = ref(null)

function deepFindZoneLikeValue(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 3) return null
  const ZONE_KEYS = /(zone|section|block|area|row|seat|category)/i

  // 1) ตรงๆจากชั้นปัจจุบัน
  for (const [k, v] of Object.entries(obj)) {
    if (!ZONE_KEYS.test(k)) continue
    if (v == null) continue
    if (typeof v === 'string' && v.trim()) return v
    if (typeof v === 'number') return String(v)
    if (typeof v === 'object') {
      // เผื่อเจอ { name: 'VIP' }
      if (typeof v.name === 'string' && v.name.trim()) return v.name
    }
  }
  // 2) ไล่ลงไปชั้นลูก (ลึกสุด ~3 ชั้น)
  for (const v of Object.values(obj)) {
    const got = deepFindZoneLikeValue(v, depth + 1)
    if (got) return got
  }
  return null
}


function getToken() {
  const keys = ['access_token', 'accessToken', 'jwt', 'token']
  for (const k of keys) {
    const v = localStorage.getItem(k)
    if (v) return v.replace(/^"|"$/g, '')
  }
  return null
}

/** อ่านโปสเตอร์จาก sessionStorage (eventLite:<id> / plan:<id>) */
function getCachedPoster(eventId) {
  try {
    const keys = []
    for (let i = 0; i < sessionStorage.length; i++) keys.push(sessionStorage.key(i))
    for (const k of keys) {
      if (!k || !/^eventLite:|^plan:/.test(k)) continue
      const raw = sessionStorage.getItem(k)
      if (!raw) continue
      const obj = JSON.parse(raw)
      const id = String(obj?.id ?? obj?.eventId ?? obj?.event?.id ?? '')
      if (id === String(eventId)) {
        return (
          obj?.posterImageUrl ||
          obj?.poster ||
          obj?.image ||
          obj?.imageUrl ||
          obj?.event?.posterImageUrl ||
          obj?.event?.poster ||
          obj?.event?.image ||
          null
        )
      }
    }
  } catch {}
  return null
}

/** แปลง path รูปเป็น URL ที่น่าจะถูกต้องใน 8081 */
function buildImageCandidates(raw) {
  if (!raw) return []
  if (/^https?:\/\//i.test(raw)) return [raw]
  const urls = []
  if (raw.startsWith('/')) {
    urls.push(raw)                      // เช่น /images/poster.jpg
  } else {
    urls.push(`/images/${raw}`)
    urls.push(`/uploads/${raw}`)
    urls.push(`/static/uploads/${raw}`)
  }
  return [...new Set(urls)]
}

/** สกัดรูปจาก cache ก่อน แล้วค่อย fallback จาก event API */
function imageCandidatesFromEvent(ev, eventId) {
  let raw = getCachedPoster(eventId)
  if (!raw) {
    raw =
      ev?.posterImageUrl ||
      ev?.image?.url ||
      ev?.media?.poster ||
      ev?.assets?.cover ||
      ev?.image ||
      ev?.imageUrl || ev?.imageURL ||
      ev?.imagePath || ev?.image_path ||
      ev?.posterUrl || ev?.poster ||
      ev?.coverUrl || ev?.cover ||
      ev?.bannerUrl || ev?.banner ||
      ev?.thumbnail || ev?.eventImage
  }
  return buildImageCandidates(String(raw || ''))
}

function resolveDate(ev, reg) {
  return ev?.startAt || ev?.start_at || ev?.start_time || ev?.date || reg?.registeredAt || null
}

function getCachedPlan(eventId) {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (!k || !/^plan:/.test(k)) continue
      const raw = sessionStorage.getItem(k)
      if (!raw) continue
      const obj = JSON.parse(raw)
      const id = String(obj?.id ?? obj?.eventId ?? obj?.event?.id ?? '')
      if (String(eventId) === id) return obj
    }
  } catch {}
  return null
}

function findZoneNameById(plan, zoneId) {
  if (!plan || zoneId == null) return null
  const zid = String(zoneId)

  // 1) แม่แบบโครงสร้างยอดฮิต: [{ id, name }] หรือ [{ zoneId, name }] หรือ code เป็นรหัส
  const hit = plan?.zones?.find(
    z => String(z.id) === zid || String(z.zoneId) === zid || String(z.code) === zid
  )
  if (hit?.name) return hit.name

  // 2) บางโปรเจ็กต์เก็บเป็น map
  const map = plan?.seatMap?.zones || plan?.zonesMap
  if (map && typeof map === 'object') {
    const z = map[zid]
    if (z?.name) return z.name
  }
  return null
}

// ดึงชื่อโซนจาก registration (รองรับซ้อนชั้น + zoneId → ไปแมปชื่อ)
function resolveZoneFromReg(reg, ev) {
  // 1) ชุด flat ที่คาดหวัง
  const flat =
    reg?.seatZoneName || reg?.zoneName || reg?.zone ||
    reg?.seatZone || reg?.seat_zone || reg?.section ||
    reg?.block || reg?.area || reg?.row || reg?.seat
  if (flat) return flat

  // 2) ชุด nested ฮิตๆ
  const nested =
    reg?.seat?.zoneName || reg?.seat?.zone || reg?.seat?.section ||
    reg?.seatInfo?.zoneName || reg?.seat_info?.zone_name
  if (nested) return nested

  // 3) บางระบบใช้ประเภทตั๋ว/หมวดเป็นโซน
  const byCategory =
    reg?.ticketTypeName || reg?.ticket_type_name ||
    reg?.ticketType?.name || reg?.ticket?.typeName ||
    reg?.categoryName || reg?.category?.name ||
    reg?.ticketCategory || reg?.category
  if (byCategory) return byCategory

  // 4) zoneId → map กับ plan cache หรือ ev.zones[]
  const zoneId =
    reg?.zoneId || reg?.seatZoneId || reg?.seat_zone_id || reg?.seat?.zoneId
  if (zoneId != null) {
    const plan = getCachedPlan(ev?.id ?? reg?.eventId)
    const name = findZoneNameById(plan, zoneId)
    if (name) return name
    // เผื่อ BE ใส่ zones มาตรง event
    const hit = ev?.zones?.find?.(z =>
      String(z.id) === String(zoneId) ||
      String(z.zoneId) === String(zoneId) ||
      String(z.code) === String(zoneId)
    )
    if (hit?.name) return hit.name
  }

  // 5) ท่ายึดโลก: ค้นหากว้างๆใน reg เผื่อเก็บไว้ใน metadata/detail อื่นๆ
  const deep = deepFindZoneLikeValue(reg)
  if (deep) return deep

  return null
}



onMounted(async () => {
  try {
    initUser()
    // 1) รายการที่ผู้ใช้จอง
const token = getToken()
const headers = token ? { Authorization: `Bearer ${token}` } : {}

// ดึง email จาก state/cache
const cachedUser = JSON.parse(localStorage.getItem('user') || '{}')
const emailParam = user.value?.email || cachedUser?.email
if (!emailParam) {
  error.value = 'ไม่พบอีเมลผู้ใช้ (กรุณาเข้าสู่ระบบก่อน)'
  loading.value = false
  return
}

const { data: regs } = await api.get('/registrations/me', {
  params: { email: emailParam },   // 🔴 เพิ่มอันนี้
  headers
})

    regMap.clear()
for (const r of regs) regMap.set(String(r.id), r)

    if (!Array.isArray(regs) || regs.length === 0) {
      cards.value = []
      return
    }

    // 2) ดึงรายละเอียด event จาก 8081
    const eventIds = [...new Set(regs.map(r => r.eventId).filter(Boolean))]
    const eventMap = new Map()
    await Promise.all(
      eventIds.map(async (id) => {
        try {
          const { data: ev } = await axios.get(`/api/events/${id}`)
          eventMap.set(id, ev)
        } catch (e) {
          console.warn('GET /api/events/' + id + ' failed:', e?.response?.status || e)
        }
      })
    )

    // 3) ประกอบการ์ด (รวมทั้งหมดยิงเป็น “ประวัติบัตร” รายการเดียว)
    // ตอนประกอบ cards.value = regs.map(...)
// ตอนสร้างการ์ด (เดิมคุณมีแล้ว เพิ่ม mapping เผื่อ ๆ)
cards.value = regs.map(r => {
  const ev = eventMap.get(r.eventId) || {}
  const candidates = imageCandidatesFromEvent(ev, r.eventId)
  const z =
   resolveZoneFromReg(r, ev) ||
  r.seatZoneName || r.zoneName || r.zone ||
 r.seatZone || r.seat_zone || r.section || r.block || r.area || r.row || r.seat || null
  return {
    registrationId: r.id,
    id: r.eventId,
    title: ev.title || ev.name || `Event #${r.eventId}`,
    date: resolveDate(ev, r),
    location: ev.location || ev.venue?.name || ev.venue || ev.city || 'TBA',
    registrationStatus: r.registrationStatus,
    paymentStatus: r.paymentStatus,

    // fallback ที่ใช้กับตั๋ว
    fallbackStart:
      ev.startAt || ev.start_at || ev.start_time || ev.startDateTime || ev.start || r.startTime || r.start_time || r.doorTime,
    fallbackEnd:
      ev.endAt || ev.end_at || ev.end_time || ev.endDateTime || ev.end || r.endTime || r.end_time,
    fallbackZone: z, 
    _imgCandidates: candidates,
    _imgIdx: 0,
    currentImage: candidates[0] || '',
  }
})


  } catch (e) {
    console.error('load my registrations with images failed:', e)
    error.value = 'โหลดรายการตั๋วไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

/** ถ้ารูปพัง → ลองตัวถัดไป */
function onImgError(card) {
  if (!card || !Array.isArray(card._imgCandidates)) return
  const next = card._imgIdx + 1
  if (next < card._imgCandidates.length) {
    card._imgIdx = next
    card.currentImage = card._imgCandidates[next]
  } else {
    card.currentImage = '' // หมดทางแล้ว
  }
}

/** รวมทั้งหมด: sort จากใหม่→เก่า */
const allEvents = computed(() => {
  return [...cards.value].sort((a, b) => new Date(b.date) - new Date(a.date))
})

function formatDate(dateStr) {
  const date = new Date(dateStr)
  if (isNaN(date)) return 'TBA'

  return date.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// === Ticket Modal State ===
const showTicket = ref(false)
const loadingTicket = ref(false)
const tickets = ref([])          // ใบตั๋วทั้งหมดใน registration (รองรับหลายรอบ)
const activeIdx = ref(0)
const activeTicket = computed(() => tickets.value[activeIdx.value])

function closeTicket() {
  showTicket.value = false
  tickets.value = []
  activeIdx.value = 0
  loadingTicket.value = false
}

function goTicket(i) {
  if (i >= 0 && i < tickets.value.length) activeIdx.value = i
}
function nextTicket() {
  activeIdx.value = (activeIdx.value + 1) % tickets.value.length
}
function prevTicket() {
  activeIdx.value = (activeIdx.value - 1 + tickets.value.length) % tickets.value.length
}

// map field ให้เป็นมาตรฐานเดียว
function normalizeTicket(raw, fb) {
  const eventName =
    raw.eventName || raw.event_title || raw.event || fb?.title || fb?.name

  const zone =
    raw.zone || raw.zoneName || raw.seatZone || raw.seat_zone ||
    raw.seatZoneName || raw.section || raw.block ||
    raw.area || raw.row || raw.seat || fb?.fallbackZone

  const ticketCode =
    raw.ticketCode || raw.ticket_id || raw.code || raw.ticketNo || raw.ticket_no || raw.id

  // เวลา: รองรับคีย์หลากหลาย
  const start =
    raw.startTime || raw.start_time || raw.doorTime || raw.time_start ||
    raw.startAt   || raw.start_at   || raw.time || raw.start_date || fb?.fallbackStart

  const end =
    raw.endTime || raw.end_time || raw.time_end ||
    raw.endAt   || raw.end_at   || raw.end_date || fb?.fallbackEnd

  return {
    id: ticketCode || cryptoRandom(),
    eventName,
    zone,
    ticketCode,
    timeRange: buildTimeRange(start, end),
    qrUrl: null
  }
}



function buildTimeRange(start, end) {
  const isPureTime = v => typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v)

  // ถ้าเป็นเวลาอย่างเดียว
  if (isPureTime(start) || isPureTime(end)) {
    if (start && end) return `${start} - ${end}`
    return start || end || null
  }

  const parse = (v) => {
    if (!v && v !== 0) return null
    // epoch number หรือ string ที่เป็นตัวเลข
    if (typeof v === 'number' || (/^\d+$/.test(String(v)))) {
      const d = new Date(Number(v))
      return isNaN(d) ? null : d
    }
    if (typeof v === 'string') {
      let s = v.trim()
      // 'YYYY-MM-DD HH:mm' -> 'YYYY-MM-DDTHH:mm'
      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) {
        s = s.replace(/\s+/, 'T')
      }
      const d = new Date(s)
      return isNaN(d) ? null : d
    }
    const d = new Date(v)
    return isNaN(d) ? null : d
  }

  const s = parse(start), e = parse(end)
  const fmt = (d) =>
    d?.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }) || null

  const fs = fmt(s), fe = fmt(e)
  if (fs && fe) return `${fs} - ${fe}`
  return fs || fe || null
}



function cryptoRandom() {
  try { return crypto.getRandomValues(new Uint32Array(1))[0].toString(16) }
  catch { return String(Date.now()) }
}

// ดึงตั๋วตาม registrationId (ลองได้หลาย endpoint)
async function fetchTicketsByRegistration(registrationId) {
  const token = getToken()
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  // 1) รายละเอียด registration (เผื่อ embed tickets)
  try {
    const { data } = await axios.get(`/api/registrations/${registrationId}`, { headers })
    if (Array.isArray(data?.tickets) && data.tickets.length) return { tickets: data.tickets }
  } catch (e) {
       if (e?.response?.status !== 404) console.warn('reg detail error', e?.response?.status)}

  // 2) endpoint เฉพาะ tickets
  const candidates = [
   `/api/registrations/${registrationId}/tickets`,
  `/api/tickets?registrationId=${registrationId}`,
   `/api/tickets/of/${registrationId}`,
   `/api/registration/${registrationId}/tickets`, // เผื่อสะกดอีกแบบใน BE
   `/api/ticket/of/${registrationId}`
 ]
  for (const url of candidates) {
    try {
      const { data } = await axios.get(url, { headers })
      if (data && (Array.isArray(data) || Array.isArray(data?.items) || Array.isArray(data?.tickets))) {
        return { tickets: Array.isArray(data) ? data : (data.items || data.tickets) }
      }
    } catch (e) {
if (e?.response?.status !== 404) console.warn('ticket url error', url, e?.response?.status)
    }
  }
  return { tickets: [] }
}

async function openTicketModal(registrationId) {
  
  showTicket.value = true
  loadingTicket.value = true
  activeIdx.value = 0
  tickets.value = []

  try {
  // ใน openTicketModal()
const card = cards.value.find(c => String(c.registrationId) === String(registrationId))
const reg  = regMap.get(String(registrationId)) || regMap.get(+registrationId) || null

const fb = card ? {
  title: card.title,
  // ถ้าไม่มีเวลา ใช้ date ของการ์ดเป็นที่มา (บางระบบเก็บเวลารวมใน date)
  fallbackStart: card.fallbackStart || reg?.startTime || reg?.start_time || reg?.doorTime || reg?.startAt || reg?.start_at || card?.date,
  fallbackEnd:   card.fallbackEnd   || reg?.endTime   || reg?.end_time   || reg?.endAt   || reg?.end_at   || null,
  fallbackZone:  card.fallbackZone ||
              reg?.seatZoneName || reg?.zoneName || reg?.zone ||
               reg?.seatZone || reg?.seat_zone || reg?.section || reg?.block || reg?.area || reg?.row || reg?.seat || null
} : null



    const payload = await fetchTicketsByRegistration(registrationId)
    const raws = Array.isArray(payload?.tickets) ? payload.tickets : []

    const normalized = raws.map(r => normalizeTicket(r, fb))

    if (!normalized.length && fb) {
      normalized.push({
        id: registrationId,
        eventName: fb.title,
        zone: fb.fallbackZone || '-',
        ticketCode: registrationId,
        timeRange: buildTimeRange(fb.fallbackStart, fb.fallbackEnd),
        qrUrl: null
      })
    }

    tickets.value = normalized
  } catch (e) {
    console.error('load tickets failed:', e)
    tickets.value = []
  } finally {
    loadingTicket.value = false
  }
}


// keyboard shortcut (Esc/Left/Right)
onMounted(() => {
  const onKey = (e) => {
    if (!showTicket.value) return
    if (e.key === 'Escape') closeTicket()
    if (e.key === 'ArrowLeft' && tickets.value.length > 1) prevTicket()
    if (e.key === 'ArrowRight' && tickets.value.length > 1) nextTicket()
  }
  window.addEventListener('keydown', onKey)
  onUnmounted(() => window.removeEventListener('keydown', onKey))
})
// function viewTicket(registrationId) {
//   window.location.href = `/my-ticket/${registrationId}`
// }





// --- วางเพิ่ม ---
function pickAuthToken() {
  const keys = ['access_token', 'accessToken', 'jwt', 'token']
  for (const k of keys) {
    let v = localStorage.getItem(k) || sessionStorage.getItem(k)
    if (!v) continue
    v = v.replace(/^"|"$/g, '')
    if (v.startsWith('Bearer ')) v = v.slice(7)
    if (v.split('.').length === 3) return v
  }
  return null
}

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return atob(s)
}

function initUser() {
  // 1) ลองจาก localStorage.user ก่อน
  const cached = localStorage.getItem('user')
if (cached) {
  try {
    const obj = JSON.parse(cached)
    if (obj && (obj.name || obj.email)) {
      const derivedName =
        (obj.name && String(obj.name).trim()) ||
        (obj.email ? obj.email.split('@')[0] : 'Guest')
      user.value = { name: derivedName, email: obj.email || '-' }
      localStorage.setItem('user', JSON.stringify(user.value)) // เขียนทับ cache เดิมที่ name ว่าง
      return
    }
  } catch {}
}


  // 2) ถ้าไม่มี → ถอดจาก JWT
  const token = pickAuthToken()
  if (token) {
    try {
      const payload = JSON.parse(b64urlDecode(token.split('.')[1]))
      const name =
        (payload.name && String(payload.name).trim()) ||
        payload.username ||
        payload.given_name ||
        payload.preferred_username ||
        (payload.email ? String(payload.email).split('@')[0] : '')
      const email = payload.email || payload.sub || '-'
      user.value = { name, email }
      localStorage.setItem('user', JSON.stringify(user.value)) // cache กันกระพริบ
      return
    } catch (e) {
      console.warn('JWT decode failed:', e)
    }
  }

}

</script>

<style scoped>
:root{
  --brand-blue:#1e88ff;
  --line:#e9edf2;
  --muted:#667085;
  --text:#121417;
  --accent:#ff6a00;
  --surface:#fff;
}
.brand-logo{ height:25px; width:auto; }

/* ===== Modal base ===== */
/* ===== Popup card style (แบบภาพที่ 2) ===== */
/* ===== Popup card style ===== */
.modal-backdrop{
  position: fixed; inset:0;
  background: rgba(0,0,0,.82);
  display:grid; place-items:center;
  z-index:9999;
}
.ticket-modal{ position:relative; width: 330px; max-width: 92vw; }

.ticket-card{
  position:relative;
  background:#fff;
  border-radius: 12px;
  box-shadow: 0 14px 34px rgba(0,0,0,.35);
  padding: 10px 12px 12px;
}

.ticket-head{ display:flex; align-items:center; justify-content:space-between; }
.brand-text{ font-weight:900; color:#ef4444; font-size:18px; }
.close-x{ border:0; background:transparent; color:#2563eb; font-size:24px; line-height:1; cursor:pointer; }

.divider{ height:1px; background:#E5E7EB; margin:8px 0 6px; }
.hint{ text-align:center; color:#6b7280; font-size:11px; margin:0 0 8px; }

/* QR placeholder */
.qr{
  display:block;
  width:210px; height:210px;
  margin:0 auto 10px;
  object-fit:contain;
  border-radius:6px;
}
.qr-fallback{
  display:flex; align-items:center; justify-content:center;
  background:#f5f7fa; color:#9aa3ad; font-weight:800;
  border:1px dashed #d1d5db;
}

.details{ padding:4px 4px 0; }
.row{ margin-bottom:8px; }
.row.grid3{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
.label{ display:block; font-size:11px; color:#6b7280; font-weight:700; margin-bottom:2px; }
.label.red{ color:#ef4444; }
.value{ font-size:13px; color:#111827; font-weight:800; }
.value.name{ font-size:13px; }

.dots{ display:flex; justify-content:center; gap:8px; margin-top:8px; }
.dot{ width:8px; height:8px; border-radius:999px; background:#cbd5e1; border:0; cursor:pointer; }
.dot.active{ background:#111827; }

.nav{ display:flex; justify-content:space-between; margin-top:6px; }
.nav button{ background:#111827; color:#fff; border:0; width:40px; height:28px; border-radius:6px; cursor:pointer; }

@media (max-width:380px){
  .ticket-modal{ width:310px; }
  .qr{ width:200px; height:200px; }
}



.event-section{max-width:920px;margin:0 auto;padding:24px 20px 56px;}
.title-row{display:flex;align-items:center;gap:10px;width:fit-content;padding:10px 14px;border:3px solid var(--brand-blue);border-radius:4px;margin-bottom:5px;}
.title-row h2{font-size:22px;font-weight:800;color:var(--text);}
.title-icon{width:22px;height:22px;color:var(--brand-blue);}

.profile-box{display:flex;align-items:center;gap:14px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px;box-shadow:0 1px 0 rgba(0,0,0,.04);margin:12px 0 18px;}
.avatar{width:48px;height:48px;border-radius:50%;background:#f2f4f7;color:#2f2f2f;display:inline-flex;align-items:center;justify-content:center;font-size:22px;}
.info{flex:1;min-width:0;}
.name{font-weight:700;color:var(--text);}
.email{margin-top:0px;font-size:14px;color:#667085;}
.edit-btn{padding:6px 10px;font-size:13px;border:1px solid #d6e7ff;color:#1877f2;background:#eef6ff;border-radius:999px;cursor:pointer;}

.event-card{display:grid;grid-template-columns:120px 1fr;gap:16px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:14px;box-shadow:0 1px 0 rgba(0,0,0,.05);}
.poster{width:120px;height:160px;object-fit:cover;border-radius:10px;border:1px solid #ddd;}
.event-info .date{font:600 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:#525252;margin-bottom:6px;}
.event-title{font-size:22px;font-weight:900;color:var(--text);margin:2px 0 6px;}
.location{color:#374151;margin-bottom:12px;}
.view-btn{
  display:inline-flex;
  align-items:center;
  gap:10px;

  /* ขนาด & ฟอนต์ */
  font-weight: 500;
  font-size: 18px;
  line-height: 1;

  /* สี & รูปทรง */
  background:#ff6a00;        /* ส้มแบบภาพ */
  color:#fff;
  border:0;
  border-radius: 9999px;      /* pill */
  padding: 10px 20px;

  /* เอฟเฟกต์ */
  box-shadow: 0 6px 12px rgba(255,106,0,.25);
  cursor:pointer;
  transition: transform .05s ease, box-shadow .15s ease, background .15s ease;
}

.view-btn i{
  font-size: 20px;            /* ไอคอนใหญ่กำลังดี */
  line-height: 1;
}

/* hover/active/focus ให้มืออาชีพ */
.view-btn:hover{ background:#ff730f; box-shadow:0 8px 16px rgba(255,106,0,.33); }
.view-btn:active{ transform: translateY(1px); box-shadow:0 4px 8px rgba(255,106,0,.28); }
.view-btn:focus-visible{ outline:2px solid #fff; outline-offset:3px; }

.empty{text-align:center;color:#98a2b3;margin-top:28px;}

@media (max-width:640px){
  .event-card{grid-template-columns:88px 1fr;}
  .poster{width:88px;height:124px;}
  .event-title{font-size:18px;}
}
</style>