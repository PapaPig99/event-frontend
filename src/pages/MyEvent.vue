<!-- EventCardSection.vue -->
<template>
  <section class="event-section">
    <!-- Title -->
    <div class="title-row" style="margin-bottom: -50px;">
      <svg class="title-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm14-1h2a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2h-2"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <h1>My Event Tickets</h1>
    </div>

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

          <p class="ticket-code-label">Ticket Code</p>
          <!-- QR Placeholder ตายตัว ไม่ต้องโหลดรูป -->
          <div class="ticket-code-box">
  {{ activeTicket?.ticketCode || 'TICKET CODE' }}
</div>

          <!-- Details -->
          <div class="details">
            <div class="row">
              <span class="label red">Event Name</span>
              <div class="value name">{{ activeTicket?.eventName || 'Event' }}</div>
            </div>

            <div class="row grid3">
              <div class="cell">
  <span class="label red">Event Time</span>
  <div class="value">{{ activeTicket?.timeRange || '-' }}</div>
</div>
              <div class="cell">
  <span class="label red">Zone</span>
  <div class="value">{{ activeTicket?.zone || '-' }}</div>
</div>
              <div class="cell">
                <span class="label red">Ticket ID</span>
                <div class="value">{{ activeTicket?.ticketID || activeTicket?.id || '-' }}</div>
              </div>
        
            </div>
          </div>

          <!-- Dots สำหรับหลายรอบ -->
          <!-- Dots + ปุ่มเลื่อน สำหรับหลายใบ -->
<div v-if="tickets.length > 1">
  <div class="dots">
    <button
      v-for="(t, i) in tickets"
      :key="t.id || i"
      :class="['dot', { active: i === activeIdx }]"
      @click="goTicket(i)"
    />
  </div>

  <div class="nav">
    <button @click="prevTicket">‹</button>
    <button @click="nextTicket">›</button>
  </div>
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
  <!-- 1 การ์ด = 1 รอบแสดง -->
  <article
    v-for="group in groupedEvents"
    :key="group.groupKey"
    class="event-card"
  >
    <img
      v-if="group.currentImage"
      :src="group.currentImage"
      alt="Event Poster"
      class="poster"
      @error="onImgError(group)"
    />

    <div class="event-info">
      <p class="date">{{ group.displayDateTop }}</p>
      <h3 class="event-title">{{ group.title }}</h3>

      <!-- ชื่อรอบแสดง -->
      <p v-if="group.sessionName" class="round-name">
        รอบแสดง: {{ group.sessionName }}
      </p>

      
      <p class="location">{{ group.location }}</p>

      <!-- จำนวนตั๋วในรอบนี้ -->
      <p v-if="group.totalTickets > 1" class="ticket-count">
        จำนวนบัตร {{ group.totalTickets }} ใบ
      </p>

      <button
        class="view-btn"
        @click="openTicketModal(group.registrationIds[0])"
      >
        <i class="fa-solid fa-qrcode"></i>
        <span>View Ticket</span>
      </button>
    </div>
  </article>

  <p v-if="!groupedEvents.length" class="empty">ยังไม่มีประวัติบัตร</p>
</div>



  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
  } catch { }
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

// ↑ วางใกล้ ๆ buildImageCandidates()/imageCandidatesFromEvent()
function getEventLiteSessionDate(eventId, sessionId) {
  try {
    const raw = sessionStorage.getItem(`eventLite:${eventId}`)
    if (!raw) return null
    const obj = JSON.parse(raw)
    // หา session ที่ id ตรง
    const s = (obj.sessions || []).find(x => String(x.id) === String(sessionId))
    return s?.startAt || s?.start_at || s?.startDate || s?.date || null
  } catch {
    return null
  }
}

function getSavedSessionId(eventId) {
  try {
    const v = sessionStorage.getItem(`sessionId:${eventId}`)
    return v ? Number(v) : null
  } catch { return null }
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
  } catch { }
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

    // 3) ประกอบการ์ด 
    cards.value = regs.map(r => {
      // ---- ดึง session ที่จอง ----
const ev = eventMap.get(r.eventId) || {}
const allSessions = ev.eventSessions || ev.sessions || []

// 1) ใช้ sessionId ที่กดจริง: จาก BE (registration) > จาก sessionStorage
const chosenSessionId =
  r.sessionId ?? r.session_id ?? getSavedSessionId(r.eventId)

// 2) หา session object ให้ได้ก่อน (ไว้ดึงเวลา HH:mm ถ้ามี)
const session = allSessions.find(s => String(s.id) === String(chosenSessionId)) || {}

// 3) “วันของรอบที่กดจริง” → ดึงจาก eventLite:<eventId> โดยใช้ chosenSessionId
const liteDateLike = getEventLiteSessionDate(r.eventId, chosenSessionId)

// ---- ดึง start/end ของ "รอบที่จอง" ----
const startRaw =
  session?.startTime || session?.start_time ||
  session?.startAt   || session?.start_at ||
  r.startTime        || r.start_time ||
  r.startAt          || r.start_at || null

const endRaw =
  session?.endTime   || session?.end_time ||
  session?.endAt     || session?.end_at ||
  r.endTime          || r.end_time ||
  r.endAt            || r.end_at || null

// ---- เวลาโชว์ (10.00 น. หรือ 10.00 - 12.00 น.) ----
const displayTime = buildTimeRange(startRaw, endRaw)

// ---- helpers ----
const isTimeOnly = v => typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v)
const toDate = (v) => {
  if (!v && v !== 0) return null
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v)
  if (/^\d+$/.test(String(v))) { const n = Number(v); return new Date(n < 1e12 ? n * 1000 : n) }
  const d = new Date(String(v).replace(/\s+/, 'T'))
  return isNaN(d) ? null : d
}
const prefer = (...cands) => cands.find(x => x != null && String(x).trim?.() !== '' ) ?? null

// ---- วันของ "รอบที่จอง" (ใช้ในวันแสดง:) ----
const sessionDateLike = prefer(
  liteDateLike,                          // ✅ วันจากรอบที่กดจริง (cache)
  session?.startAt, session?.start_at,   // fallback จากรายละเอียด event
  session?.startDate, session?.date,
  r.startAt, r.start_time, r.start_at,   // เผื่อ BE เก็บไว้ใน registration
  ev.startAt, ev.start_at, ev.startDate, ev.date
)

let dateOfShow = null
if (isTimeOnly(startRaw)) {
  const base = toDate(sessionDateLike)
  if (base) {
    const [h='0',m='0',s='0'] = String(startRaw).split(':')
    const yyyy = base.getFullYear()
    const mm = String(base.getMonth()+1).padStart(2,'0')
    const dd = String(base.getDate()).padStart(2,'0')
    dateOfShow = new Date(`${yyyy}-${mm}-${dd}T${h}:${m}:${s}`)
  }
} else {
  dateOfShow = toDate(startRaw) || toDate(sessionDateLike)
}

// ---- “วันที่ด้านบน” = วันที่ปัจจุบัน ----
const dateTop = new Date()

// ---- format ไทย เฉพาะวันที่ด้านบน (วันนี้) ----
const displayDateTop = dateTop ? formatThaiDate(dateTop) : 'TBA'

// สำหรับ "วันแสดง" ให้โชว์ค่าดิบจาก BE / cache เลย ไม่แปลง format
const displayDateShow =
  sessionDateLike
    ? String(sessionDateLike)
    : (startRaw ? String(startRaw) : 'TBA')

// ---- รูป/โซน ----
const candidates = imageCandidatesFromEvent(ev, r.eventId)
const z = resolveZoneFromReg(r, ev)


const sessionName =
  session?.name ||
  session?.label ||
  session?.title ||
  r.sessionName ||
  r.session_name ||
  r.roundName ||
  r.round_name ||
  null


// ---- ส่งออกค่าให้การ์ด ----
return {
  registrationId: r.id,
  id: r.eventId,
  title: ev.title || ev.name || `Event #${r.eventId}`,
  date: dateOfShow || null,
  displayDateTop,      // วันนี้
  displayDateShow,     // วันรอบที่จอง
  displayTime,
  location: ev.location || ev.venue?.name || ev.city || 'TBA',
  paymentStatus: r.paymentStatus,
  paymentReference: r.paymentReference || null,
  ticketCode: r.ticketCode || r.ticket_code || null,
  fallbackStart: startRaw,
  fallbackEnd:   endRaw,
  fallbackZone: z,
  // 👇 เพิ่มสองบรรทัดนี้
  sessionId: chosenSessionId,
  sessionName,

  _imgCandidates: candidates,
  _imgIdx: 0,
  currentImage: candidates[0] || ''
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
  return [...cards.value].sort((a, b) => {
    const ax = a.date ? new Date(a.date).getTime() : 0
    const bx = b.date ? new Date(b.date).getTime() : 0
    return bx - ax
  })
})

/**
 * groupedEvents:
 * - 1 การ์ด = 1 รอบการแสดง
 * - key ใช้: eventId + sessionId (ถ้าไม่มี sessionId ค่อย fallback ใช้ชื่อรอบ)
 */
const groupedEvents = computed(() => {
  const groups = new Map()

  for (const c of allEvents.value) {
    const sid = c.sessionId != null ? String(c.sessionId) : ''
    const sname = c.sessionName || ''
    const key = [c.id ?? '', sid, sname].join('|')

    if (!groups.has(key)) {
      groups.set(key, {
        groupKey: key,
        eventId: c.id,
        sessionId: c.sessionId,
        sessionName: c.sessionName,

        title: c.title,
        displayDateTop: c.displayDateTop,
        displayDateShow: c.displayDateShow,
        displayTime: c.displayTime,
        location: c.location,

        currentImage: c.currentImage,
        _imgCandidates: c._imgCandidates,
        _imgIdx: c._imgIdx || 0,

        registrationIds: [c.registrationId],
        totalTickets: 1
      })
    } else {
      const g = groups.get(key)
      g.registrationIds.push(c.registrationId)
      g.totalTickets += 1
    }
  }

  return Array.from(groups.values())
})

function formatThaiDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return null
  return d.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
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


function isTimeOnly(v) {
  return typeof v === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(v.trim())
}
function parseDateLike(v) {
  if (!v && v !== 0) return null
  if (typeof v === 'number' || /^\d+$/.test(String(v))) {
    const n = Number(v)
    return new Date(n < 1e12 ? n * 1000 : n)
  }
  if (typeof v === 'string') {
    let s = v.trim()
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) s = s.replace(/\s+/, 'T')
    const d = new Date(s)
    return isNaN(d) ? null : d
  }
  const d = new Date(v)
  return isNaN(d) ? null : d
}
/** รวม "วัน" + "เวลา" เป็น Date จริง (ถ้า time เป็น “HH:mm” จะยัดลงวันนั้น) */
function composeDateTime(dayLike, timeLike) {
  const day = parseDateLike(dayLike)
  if (!day) return null
  if (!timeLike) return day
  if (!isTimeOnly(timeLike)) return parseDateLike(timeLike) || day
  const [h='0', m='0', s='0'] = String(timeLike).split(':')
  const yyyy = day.getFullYear()
  const mm = String(day.getMonth()+1).padStart(2,'0')
  const dd = String(day.getDate()).padStart(2,'0')
  return new Date(`${yyyy}-${mm}-${dd}T${h.padStart(2,'0')}:${m.padStart(2,'0')}:${(s||'0').padStart(2,'0')}`)
}



function buildTimeRange(start, end) {
  const isPureTime = v => typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v)

  // ถ้าเป็นเวลาอย่างเดียว (เช่น "19:00:00" หรือ "07:30")
  if (isPureTime(start) || isPureTime(end)) {
    const fmt = (t) => {
      if (!t) return ''
      // 🔹 ตัดวินาทีออก เช่น "19:00:00" → "19:00"
      const parts = t.split(':')
      const hhmm = parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0')
      // 🔹 แปลงเป็นฟอร์แมตแบบไทย เช่น "19.00 น."
      return hhmm.replace(':', '.') + ' น.'
    }
    if (start && end) return `${fmt(start)} - ${fmt(end)}`
    return fmt(start || end)
  }

  // 🔸 กรณีเป็นวันที่เต็ม (DateTime)
  const parse = (v) => {
    if (!v && v !== 0) return null
    if (typeof v === 'number' || (/^\d+$/.test(String(v)))) {
      const d = new Date(Number(v))
      return isNaN(d) ? null : d
    }
    if (typeof v === 'string') {
      let s = v.trim()
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
    d?.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok'
    })?.replace(':', '.') + ' น.' || null

  const fs = fmt(s), fe = fmt(e)
  if (fs && fe) return `${fs} - ${fe}`
  return fs || fe || null
}




function cryptoRandom() {
  try { return crypto.getRandomValues(new Uint32Array(1))[0].toString(16) }
  catch { return String(Date.now()) }
}


function openTicketModal(registrationId) {
  // หาใบที่คลิกก่อน
  const clicked = cards.value.find(
    c => String(c.registrationId) === String(registrationId)
  )
  if (!clicked) return

  // ✅ กรองเฉพาะบัตรใน "รอบเดียวกัน"
  let group = cards.value.filter(c =>
    c.id === clicked.id &&
    String(c.sessionId ?? '') === String(clicked.sessionId ?? '')
  )

  // ถ้า BE ไม่ส่ง sessionId แต่มีชื่อรอบ → fallback ใช้ชื่อรอบ
  if (!group.length && clicked.sessionName) {
    group = cards.value.filter(c =>
      c.id === clicked.id && c.sessionName === clicked.sessionName
    )
  }

  if (!group.length) {
    group = [clicked]
  }

  tickets.value = group.map(c => ({
    id: c.registrationId,
    eventName: c.title,
    zone: c.fallbackZone || '-',
    ticketID: c.registrationId,
    ticketCode: c.ticketCode || c.paymentReference || c.registrationId,
    timeRange: buildTimeRange(c.fallbackStart, c.fallbackEnd),
  }))

  const idx = group.findIndex(
    c => String(c.registrationId) === String(registrationId)
  )
  activeIdx.value = idx >= 0 ? idx : 0

  showTicket.value = true
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
    } catch { }
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
.round {
  margin: 4px 0 8px;
  font-size: 14px;
  color: #111827;
}

.round-label {
  font-weight: 800;
  color: #ef4444; /* ให้เด่นนิดนึง */
  margin-right: 6px;
}

.round-val {
  font-weight: 700;
}

.ticket-code-box {
  margin: 1.5rem auto;
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 3px;
  color: #e63946;
  background: linear-gradient(135deg, #f9f9f9, #f0f0f0);
  border-radius: 16px;
  padding: 1.2rem 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  max-width: 280px;
}

.ticket-code-label {
  font-size: 20px;
  font-weight: 700;
  margin: 0.5rem 0 -0.5rem;
  letter-spacing: 0.5px;
}


:root {
  --brand-blue: #1e88ff;
  --line: #e9edf2;
  --muted: #667085;
  --text: #121417;
  --accent: #ff6a00;
  --surface: #fff;
}

.brand-logo {
  height: 25px;
  width: auto;
}

/* ===== Modal base ===== */
/* ===== Popup card style (แบบภาพที่ 2) ===== */
/* ===== Popup card style ===== */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .82);
  display: grid;
  place-items: center;
  z-index: 9999;
}

.ticket-modal {
  position: relative;
  width: 330px;
  max-width: 92vw;
}

.ticket-card {
  position: relative;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, .35);
  padding: 10px 12px 12px;
}

.ticket-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand-text {
  font-weight: 900;
  color: #ef4444;
  font-size: 18px;
}

.close-x {
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.divider {
  height: 1px;
  background: #E5E7EB;
  margin: 8px 0 6px;
}

.hint {
  text-align: center;
  color: #6b7280;
  font-size: 11px;
  margin: 0 0 8px;
}

/* QR placeholder */
.qr {
  display: block;
  width: 210px;
  height: 210px;
  margin: 0 auto 10px;
  object-fit: contain;
  border-radius: 6px;
}

.qr-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #9aa3ad;
  font-weight: 800;
  border: 1px dashed #d1d5db;
}

.details {
  padding: 4px 4px 0;
}

.row {
  margin-bottom: 8px;
}

.row.grid3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.label {
  display: block;
  font-size: 11px;
  color: #6b7280;
  font-weight: 700;
  margin-bottom: 2px;
}

.label.red {
  color: #ef4444;
}

.value {
  font-size: 13px;
  color: #111827;
  font-weight: 800;
}

.value.name {
  font-size: 13px;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}
.ticket-count {
  margin: 4px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #cbd5e1;
  border: 0;
  cursor: pointer;
}

.dot.active {
  background: #111827;
}

.nav {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}

.nav button {
  background: #111827;
  color: #fff;
  border: 0;
  width: 40px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
}

@media (max-width:380px) {
  .ticket-modal {
    width: 310px;
  }

  .qr {
    width: 200px;
    height: 200px;
  }
}



.event-section {
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 20px 56px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 10px 14px;
  border: 3px solid var(--brand-blue);
  border-radius: 4px;
  margin-bottom: 5px;
}

.title-row h2 {
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
}

.title-icon {
  width: 22px;
  height: 22px;
  color: var(--brand-blue);
}

.profile-box {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, .04);
  margin: 12px 0 18px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f2f4f7;
  color: #2f2f2f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  font-weight: 700;
  color: var(--text);
}

.email {
  margin-top: 0px;
  font-size: 14px;
  color: #667085;
}

.edit-btn {
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid #d6e7ff;
  color: #1877f2;
  background: #eef6ff;
  border-radius: 999px;
  cursor: pointer;
}

.event-card {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 16px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px;
  margin-top: 14px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, .05);
}

.poster {
  width: 160px;
  height: 230px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid #ddd;
}

.event-info .date {
  font: 600 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #525252;
  margin-bottom: 6px;
}

.event-title {
  font-size: 22px;
  font-weight: 900;
  color: var(--text);
  margin: 2px 0 6px;
}

.location {
  color: #374151;
  margin-bottom: 12px;
  font-size: 13px;
}

.view-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;

  /* ขนาด & ฟอนต์ */
  font-weight: 500;
  font-size: 16px;
  line-height: 1;

  /* สี & รูปทรง */
  background: #ff6a00;
  /* ส้มแบบภาพ */
  color: #fff;
  border: 0;
  border-radius: 9999px;
  /* pill */
  padding: 10px 20px;

  /* เอฟเฟกต์ */
  box-shadow: 0 6px 12px rgba(255, 106, 0, .25);
  cursor: pointer;
  transition: transform .05s ease, box-shadow .15s ease, background .15s ease;
}

.view-btn i {
  font-size: 16px;
  /* ไอคอนใหญ่กำลังดี */
  line-height: 1;
}

/* hover/active/focus ให้มืออาชีพ */
.view-btn:hover {
  background: #ff730f;
  box-shadow: 0 8px 16px rgba(255, 106, 0, .33);
}

.view-btn:active {
  transform: translateY(1px);
  box-shadow: 0 4px 8px rgba(255, 106, 0, .28);
}

.view-btn:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}

.empty {
  text-align: center;
  color: #98a2b3;
  margin-top: 28px;
}

.round-name {
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
}

.ticket-count {
  font-size: 13px;
  font-weight: 600;
  color: #ff0000;
}

@media (max-width:640px) {
  .event-card {
    grid-template-columns: 88px 1fr;
  }

  .poster {
    width: 88px;
    height: 124px;
  }

  .event-title {
    font-size: 18px;
  }
}
</style>