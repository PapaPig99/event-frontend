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
          <!-- ✅ แสดงรอบงาน -->
<p class="round" style="margin: 4px 0 6px; color:#ED3F27; font-weight:700;">
  {{ event.roundLabel }}
</p>
<!-- ✅ แสดงจำนวนที่นั่ง -->
<p class="qty" style="margin: 0 0 12px; color:#374151;">
  จำนวนที่นั่ง: <strong>{{ event.quantity }}</strong>
</p>
          <!-- <button class="view-btn" @click="viewTicket(event.registrationId)">
            <i class="fa-solid fa-ticket"></i><span>View Ticket</span>
          </button> -->
        </div>
      </article>

      <p v-if="!allEvents.length" class="empty">ยังไม่มีประวัติบัตร</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import api from '@/lib/api' // สำหรับ /registrations/me

const user = ref({ name: '', email: '' })
const cards = ref([])
const loading = ref(true)
const error = ref(null)

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
function toTimeLabel(t){ return String(t||'').slice(0,5) }
function toDateLabel(iso){
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('th-TH', {
    weekday:'short', day:'2-digit', month:'short', year:'numeric'
  })
}
function makeShowLabel(dateOrIso, timeStr){
  if (dateOrIso && !timeStr && !isNaN(Date.parse(dateOrIso))) {
    const d = new Date(dateOrIso)
    const hh = String(d.getHours()).padStart(2,'0')
    const mm = String(d.getMinutes()).padStart(2,'0')
    return `${toDateLabel(d.toISOString())} ${toTimeLabel(`${hh}:${mm}`)}`
  }
  return `${toDateLabel(dateOrIso)} ${toTimeLabel(timeStr)}`
}

/** หาชื่อรอบจาก ev.sessions โดยใช้ reg.sessionId ถ้ามี; fallback ชื่อ/เวลาแรกของอีเวนต์ */
function resolveRoundLabel(ev, reg){
  const sessions = Array.isArray(ev?.sessions) ? ev.sessions : []
  if (sessions.length === 0) return 'รอบ: TBA'

  let s = null
  if (reg?.sessionId != null) {
    s = sessions.find(x => String(x.id) === String(reg.sessionId))
  }
  if (!s) s = sessions[0]

  const d = ev.startDate || ev.start_date || s.startDate || s.start_date
  const t = s.startTime || s.start_time
  const name = s.name || null
  return `รอบ: ${name || makeShowLabel(d, t)}`
}

onMounted(async () => {
  try {
    initUser()
    const token = getToken()

    // 1) รายการที่ผู้ใช้จอง
    const { data: regs } = await api.get('/registrations/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
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
    cards.value = regs.map(r => {
      const ev = eventMap.get(r.eventId) || {}
      const candidates = imageCandidatesFromEvent(ev, r.eventId)
      return {
        registrationId: r.id,
        id: r.eventId,
        title: ev.title || ev.name || `Event #${r.eventId}`,
        date: resolveDate(ev, r),
        location: ev.location || ev.venue?.name || ev.venue || ev.city || 'TBA',
        quantity: Number(r.quantity ?? 1),
    roundLabel: resolveRoundLabel(ev, r),
        registrationStatus: r.registrationStatus,
        paymentStatus: r.paymentStatus,
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



function viewTicket(registrationId) {
  window.location.href = `/my-ticket/${registrationId}`
}





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
.event-title{font-size:18px;font-weight:900;color:var(--text);margin:2px 0 6px;margin-bottom: -10px;}
.location{color:#374151;margin-bottom:0px;}
.view-btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;}
.view-btn i{font-size:14px;}
.empty{text-align:center;color:#98a2b3;margin-top:28px;}

@media (max-width:640px){
  .event-card{grid-template-columns:88px 1fr;}
  .poster{width:88px;height:124px;}
  .event-title{font-size:18px;}
}
</style>