<script setup>
import api from '@/lib/api'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/* ===== Router ===== */
const router = useRouter()
const route  = useRoute()
const routeId = computed(() => route.params.id)
const hasSeatmap = ref(false)

/* ===== HERO / State ===== */
const poster = ref('')
const title  = ref('')
const shows  = ref([])
const selectedShow = ref('')

/* ===== Sessions mapping (อย่าไปประกาศซ้ำในฟังก์ชันอื่น) ===== */
const sessionsRaw      = ref([])     // [{id,...}]
const sessionLabelToId = ref({})     // label -> id

/* ===== Zones ===== */
const zones = ref([])                // [{id,label,price,remaining,qty}, ...]
const lastChangedIndex = ref(0)

/* ===== UI Helpers ===== */
const selectedItems = computed(() =>
  zones.value.filter(z => z.qty > 0).map(z => ({
    zoneId: z.id, zoneLabel: z.label, unitPrice: z.price, qty: z.qty
  }))
)
const canProceed  = computed(() => selectedItems.value.length > 0)
const totalQty    = computed(() => zones.value.reduce((s,z)=> s + z.qty, 0))
const totalAmount = computed(() => zones.value.reduce((s,z)=> s + z.qty * z.price, 0))
const primaryZone = computed(()=> {
  const picked = zones.value.findIndex(z => z.qty > 0)
  const idx = (zones.value[lastChangedIndex.value]?.qty ?? 0) > 0
    ? lastChangedIndex.value
    : (picked === -1 ? 0 : picked)
  return zones.value[idx]
})
function formatTHB(n){ return `${Number(n||0).toLocaleString('en-US')} THB` }

/* ===== Assets ===== */
const fallbackPoster  = new URL('../assets/poster-fallback.jpg',  import.meta.url).href
const fallbackSeatmap = new URL('../assets/seatmap-fallback.png', import.meta.url).href

/* ===== Stepper ===== */
const currentStep = 2

/* ===== Utils ===== */
function normalizeKey(v){ return String(v ?? '').trim().toLowerCase() }
function toTimeLabel(t){ return String(t||'').slice(0,5) }
function toDateLabel(iso){
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'2-digit',year:'numeric'})
}
function makeShowLabel(dateOrIso, timeStr){
  // รองรับ name/วันที่/เวลา ตาม backend
  if (dateOrIso && !timeStr && !isNaN(Date.parse(dateOrIso))) {
    const d = new Date(dateOrIso)
    const hh = String(d.getHours()).padStart(2,'0')
    const mm = String(d.getMinutes()).padStart(2,'0')
    return `${toDateLabel(d.toISOString())} ${toTimeLabel(`${hh}:${mm}`)}`
  }
  return `${toDateLabel(dateOrIso)} ${toTimeLabel(timeStr)}`
}

/* ===== Read state passed from previous pages ===== */
function readEventLite(id) {
  const st = history.state?.eventLite
  if (st && typeof st === 'object') return st
  try {
    const raw = sessionStorage.getItem(`eventLite:${id}`)
    if (raw) { const obj = JSON.parse(raw); if (obj && typeof obj === 'object') return obj }
  } catch {}
  return null
}
function readPlan(id) {
  const st = history.state?.plan
  if (st && typeof st === 'object') return st
  try {
    const raw = sessionStorage.getItem(`plan:${id}`)
    if (raw) { const obj = JSON.parse(raw); if (obj && typeof obj === 'object') return obj }
  } catch {}
  return null
}

/* ===== Back ===== */
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

/* ===== Availability (ต่อโซนเท่านั้น) ===== */
const showAvail = ref(false)
const loadingAvail = ref(false)
const availError = ref('')
const latestAvail = ref([])           // raw list [{ zoneId, zoneName, available }, ...]
const capacityByZone = ref({})   // { [id or nameKey]: capacity }
const liveAvailByZone = ref({})       // { [id]: n, [nameKey]: n }
let availTimer = null

function liveAvailableFor(z) {
  const byId = liveAvailByZone.value?.[String(z.id)]
  if (Number.isFinite(byId)) return Math.max(0, Number(byId))
  const key = normalizeKey(z.label ?? z.name ?? z.id)
  const byName = liveAvailByZone.value?.[key]
  if (Number.isFinite(byName)) return Math.max(0, Number(byName))
  return Math.max(0, Number(z.remaining ?? 0))
}
function left(z) {
  const live = Math.max(0, liveAvailableFor(z))
  const q    = Math.max(0, Number(z.qty || 0))
  return Math.max(0, live - q)
}

function capacityFor(z){
  const byId = capacityByZone.value?.[String(z.id)]
  if (Number.isFinite(byId)) return Math.max(0, Number(byId))
  const key = normalizeKey(z.label ?? z.name ?? z.id)
  const byName = capacityByZone.value?.[key]
  if (Number.isFinite(byName)) return Math.max(0, Number(byName))
  return undefined
}
function reconcileQtyWithLive() {
  zones.value.forEach(z => {
    const live = liveAvailableFor(z)           // จากแผนที่ live
    const cap  = capacityFor(z)                // ถ้ามี
    const ceiling = cap != null ? Math.min(live, cap) : live
    if (z.qty > ceiling) z.qty = ceiling
    if (z.qty < 0) z.qty = 0
  })
}

function qtyClass(n){ if (n<=0) return 'zero'; if (n<=10) return 'low'; return 'ok' }

const rowsToShow = computed(() => {
  if (Array.isArray(latestAvail.value) && latestAvail.value.length > 0) {
    return latestAvail.value.map(item => {
      const zoneId   = item.zoneId ?? item.id
      const zoneName = item.zoneName ?? item.zone ?? item.name ?? item.code
      const base     = Math.max(0, Number(item.available ?? item.remaining ?? item.left ?? 0))

      // หักเฉพาะ qty ของ “โซนเดียวกัน”
      let z = zones.value.find(zz => String(zz.id) === String(zoneId))
      if (!z) {
        const key = normalizeKey(zoneName)
        z = zones.value.find(zz => normalizeKey(zz.label ?? zz.name ?? zz.id) === key)
      }
      const picked = Math.max(0, Number(z?.qty ?? 0))
      return { code: zoneName ?? zoneId ?? '-', left: Math.max(0, base - picked) }
    })
  }
  // fallback ใช้สถานะในหน้า
  return zones.value.map((z,i)=>({ code: z.label || z.name || z.id || `Zone ${i+1}`, left: left(z) }))
})

/* เติมโซนให้ตรงกับ availability หาก backend ไม่ส่งรายการโซน */
function ensureZonesFromAvailability() {
  const existingKeys = new Set(zones.value.map(z => String(z.id)))
  const priceByName = {}
  ;(history.state?.plan?.zones || []).forEach(z => {
    const key = normalizeKey(z.name || z.label || z.code)
    if (key) priceByName[key] = Number(z.price ?? 0)
  })
  const toPush = []
  for (const it of latestAvail.value || []) {
    const zoneId   = it.zoneId ?? it.id
    const zoneName = it.zoneName ?? it.zone ?? it.name ?? it.code ?? `Zone`
    const keyName  = normalizeKey(zoneName)
    const existsById   = existingKeys.has(String(zoneId))
    const existsByName = zones.value.some(z => normalizeKey(z.label ?? z.name ?? z.id) === keyName)
    if (!existsById && !existsByName) {
      toPush.push({
        id: zoneId ?? `Z${zones.value.length + toPush.length + 1}`,
        label: zoneName,
        desc: '',
        price: Number.isFinite(priceByName[keyName]) ? priceByName[keyName] : 0,
        remaining: Math.max(0, Number(it.available ?? it.remaining ?? it.left ?? 0)),
        qty: 0
      })
    }
  }
  if (toPush.length) zones.value.push(...toPush)
}

/* ===== Fetch availability (ปัจจุบัน) ===== */
async function getCurrentSessionId() {
  const id = route.params.id
  let sid = sessionLabelToId.value?.[selectedShow.value]
  if (!sid && Array.isArray(sessionsRaw.value) && sessionsRaw.value.length === 1) {
    sid = sessionsRaw.value[0]?.id
  }
  if (!sid) {
    try {
      const { data: view } = await api.get(`/events/${id}/view`)
      const options = (view.sessions || []).map(s => {
        const dt = s.startAt || s.start_at || view.startDate || view.start_date
        const tm = s.startTime || s.start_time
        return { id: s.id, label: s.name || makeShowLabel(dt, tm) }
      })
      const found = options.find(o => o.label === selectedShow.value)
      sid = found?.id || options[0]?.id
    } catch (e) {
      console.warn('getCurrentSessionId() failed', e)
    }
  }
  return sid
}

async function loadAvailOnce() {
  loadingAvail.value = true
  availError.value = ''
  latestAvail.value = []

  try {
    const sid = await getCurrentSessionId()
    if (!sid) throw new Error('ไม่พบรอบการแสดง (sessionId)')

    const { data } = await api.get(`/zones/session/${sid}/availability`)
    latestAvail.value = Array.isArray(data) ? data : []

    // === rebuild live+capacity map (ทั้ง by id และ by name) ===
    const liveMap = {}
    const capMap  = {}
    latestAvail.value.forEach(item => {
      const zoneId   = item.zoneId ?? item.id
      const zoneName = item.zoneName ?? item.zone ?? item.name ?? item.code
      const capacity = Number(item.capacity ?? item.cap ?? 0)
      // available บางทีติดลบจาก backend → clamp เป็น 0
      const availableRaw = Number(item.available ?? item.remaining ?? item.left ?? 0)
      const available    = Math.max(0, availableRaw)

      if (zoneId != null) {
        liveMap[String(zoneId)] = available
        if (Number.isFinite(capacity)) capMap[String(zoneId)] = Math.max(0, capacity)
      }
      if (zoneName) {
        const key = normalizeKey(zoneName)
        liveMap[key] = available
        if (Number.isFinite(capacity)) capMap[key] = Math.max(0, capacity)
      }
    })
    liveAvailByZone.value = liveMap
    capacityByZone.value  = capMap

    // sync โซนที่มีอยู่ให้สอดคล้องกับ live (และเพดาน capacity ถ้ามี)
    zones.value = zones.value.map(z => {
      const live = liveAvailableFor(z)
      const cap  = capacityFor(z)
      const remaining = cap != null ? Math.min(live, cap) : live
      return { ...z, remaining: remaining }
    })
    reconcileQtyWithLive()
    ensureZonesFromAvailability()
  } catch (err) {
    availError.value = err?.message || 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loadingAvail.value = false
  }
}


async function refreshAvailabilityForSelectedShow() {
  await loadAvailOnce()
  // sync remaining ตาม live ต่อโซน
  zones.value = zones.value.map(z => ({ ...z, remaining: liveAvailableFor(z) }))
  reconcileQtyWithLive()
}

/* ===== UI: open/close modal ===== */
async function openAvail() {
  showAvail.value = true
  await loadAvailOnce()
  if (availTimer) clearInterval(availTimer)
  availTimer = setInterval(loadAvailOnce, 5000)
}
function closeAvail() {
  showAvail.value = false
  if (availTimer) { clearInterval(availTimer); availTimer = null }
}


/* ===== Qty buttons (ลด/เพิ่มเฉพาะโซน) ===== */
function inc(i) {
  const z = zones.value[i]
  if (left(z) > 0) {
    z.qty = Math.min(z.qty + 1, z.qty + left(z))
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


// ยิงล็อกที่นั่งตามที่เลือกแบบทีละโซน (sequential)
// - ลอง payload camelCase ก่อน ถ้า error ลอง snake_case อีกรอบ
// - ถ้าโซนไหน fail จะ throw พร้อมข้อความที่อ่านได้
async function reserveSelected(sessionId, eventId) {
  const items = selectedItems.value
    .filter(it => Number(it.qty) > 0)
    .map(it => ({
      eventId: Number(eventId),
      sessionId: Number(sessionId),
      zoneId: Number(it.zoneId),
      quantity: Number(it.qty),
    }))

  if (!items.length) throw new Error('ไม่มีรายการโซนที่ต้องล็อก')

  const results = []

  // OPTIONAL: เผื่ออนาคตมี batch endpoint – ไม่ถือเป็น error ถ้า 404
  try {
    const { data } = await api.post('/registrations/batch', { items })
    if (data && Array.isArray(data.results)) {
      const failed = data.results.find(r => !r.ok)
      if (failed) throw new Error(failed.message || 'บางโซนล็อกไม่สำเร็จ')
      return { mode: 'batch', results: data.results, groupId: data.groupId }
    }
  } catch (e) {
    // 404/405/501 หรือใด ๆ ที่ไม่รองรับ batch → ไปทีละโซนต่อ
  }

  // ยิงทีละโซน เพื่อเลี่ยง race/409 และดู error แยกแต่ละโซนได้
  for (const it of items) {
    // 1) camelCase
    const camelPayload = {
      eventId: it.eventId,
      sessionId: it.sessionId,
      zoneId: it.zoneId,
      quantity: it.quantity,
    }

    try {
      const { data } = await api.post('/registrations', camelPayload)
      results.push({ zoneId: it.zoneId, ok: true, reservationId: data?.reservationId || data?.id })
      continue
    } catch (err1) {
      const status = err1?.response?.status

      // ถ้าเป็น 401/403 → ให้ผู้ใช้ไปล็อกอิน
      if (status === 401 || status === 403) {
        throw new Error('กรุณาเข้าสู่ระบบก่อนทำรายการ')
      }

      // 2) snake_case fallback (บาง backend ต้อง snake_case)
      const snakePayload = {
        event_id: it.eventId,
        session_id: it.sessionId,
        zone_id: it.zoneId,
        quantity: it.quantity,
      }

      try {
        const { data } = await api.post('/registrations', snakePayload)
        results.push({ zoneId: it.zoneId, ok: true, reservationId: data?.reservationId || data?.id })
        continue
      } catch (err2) {
        // รวมข้อความ error อ่านง่ายขึ้น
        const status2 = err2?.response?.status
        const msg =
          err2?.response?.data?.message ||
          err2?.response?.data?.error ||
          err1?.response?.data?.message ||
          err1?.message ||
          (status2 === 404 ? 'ไม่พบปลายทาง /registrations' :
           status2 === 409 ? 'มีการจองชนกัน กรุณาลองใหม่' :
           status2 === 422 ? 'ข้อมูลไม่ถูกต้อง' :
           status2 >= 500 ? 'เซิร์ฟเวอร์มีปัญหา' : 'ไม่สามารถล็อกที่นั่งได้')

        // หยุดทั้งกลุ่ม เพราะต้องการ atomic feel: โซนใด fail ให้ผู้ใช้ตัดสินใจใหม่
        throw new Error(`โซน ${it.zoneId}: ${msg}`)
      }
    }
  }

  return { mode: 'sequential', results }
}

/* ===== Proceed (validate ต่อโซน + บันทึก order/draft) ===== */
async function goToPayment() {
  if (selectedItems.value.length === 0) {
    alert('กรุณาเลือกที่นั่งอย่างน้อย 1 ที่นั่ง')
    const zonesEl = document.querySelector('.zones')
    if (zonesEl) {
      const y = zonesEl.getBoundingClientRect().top + window.pageYOffset - 80
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
    return
  }

  // ตรวจความพอ “ต่อโซน”
  for (const it of selectedItems.value) {
    const z = zones.value.find(zz => String(zz.id) === String(it.zoneId))
    if (!z) continue
    const live = Math.max(0, liveAvailableFor(z))
    const cap  = capacityFor(z)
    const ceiling = cap != null ? Math.min(live, cap) : live
    if (it.qty > ceiling) {
      alert(`โซน "${it.zoneLabel}" เหลือไม่พอแล้ว (เลือก ${it.qty} แต่เหลือ ${ceiling})`)
      reconcileQtyWithLive()
      return
    }
  }

  const eventId   = route.params.id
  const sessionId = await getCurrentSessionId()
  if (!sessionId) { alert('ไม่พบรอบการแสดง'); return }

  // 🔒 ล็อกกับ API (หลายโซน)
  let lock
  try {
    lock = await reserveSelected(sessionId, eventId)
  } catch (e) {
    alert(e?.message || 'ไม่สามารถล็อกที่นั่งได้ กรุณาลองใหม่')
    await refreshAvailabilityForSelectedShow()   // sync availability ใหม่
    return
  }

  // === order สำหรับหน้า payment ===
  const order = {
    eventId,
    title: title.value,
    poster: poster.value || fallbackPoster,
    show: selectedShow.value,
    items: selectedItems.value,
    fee: Math.round(selectedItems.value.reduce((s, it) => s + it.unitPrice * it.qty, 0) * 0.10),
    lock, // เก็บผลล็อกไว้
  }

  // === draft หลายโซน ===
  const registrationsDraft = selectedItems.value.map(it => ({
    eventId: Number(eventId),
    sessionId: Number(sessionId),
    zoneId: Number(it.zoneId),
    quantity: Number(it.qty),
  }))
  const fallbackFirst = registrationsDraft[0] || null

  router.push({
    name: 'payment',
    params: { id: eventId },
    state: { order, registrationsDraft, registrationDraft: fallbackFirst }
  })

  sessionStorage.setItem(`order:${eventId}`, JSON.stringify(order))
  sessionStorage.setItem(`registrationsDraft:${eventId}`, JSON.stringify(registrationsDraft))
  if (fallbackFirst) {
    sessionStorage.setItem(`registrationDraft:${eventId}`, JSON.stringify(fallbackFirst))
  }
}




/* ===== Initial mount ===== */
onMounted(async () => {
  const id = routeId.value
  const plan = readPlan(id)

  // HERO จาก plan
  if (plan) {
    title.value        = plan.title || ''
    poster.value       = plan.poster || ''
    shows.value        = Array.isArray(plan.shows) ? plan.shows : []
    selectedShow.value = plan.selectedShow || shows.value[0] || ''
  }

  // sessions -> shows + mapping
  if (Array.isArray(plan?.sessions) && plan.sessions.length) {
    sessionsRaw.value = plan.sessions
    const d = plan.startDate || plan.start_date || plan.startDateRaw
    shows.value = plan.sessions.map(s => {
      const label = s.name || makeShowLabel(d, s.start_time || s.startTime)
      sessionLabelToId.value[label] = s.id
      return label
    })
    selectedShow.value ||= shows.value[0] || ''
    await refreshAvailabilityForSelectedShow()
  }

  // seatmap flag
  const lite = readEventLite(id)
  const seatmapUrl = lite?.seatmapImageUrl || lite?.seatmap || ''
  hasSeatmap.value = !!seatmapUrl && !/seatmap-fallback/i.test(seatmapUrl)

  if (!poster.value) poster.value = fallbackPoster

  // ถ้า plan ไม่มีอะไรเลย → ดึงจาก API อีเวนต์
  if (!plan?.sessions?.length && !plan?.zones?.length) {
    try {
      const { data: ev } = await api.get(`/events/${id}`)
      if (!title.value)  title.value  = ev.title || ''
      if (!poster.value) poster.value = ev.posterImageUrl || ev.detailImageUrl || fallbackPoster

      if (!shows.value?.length && Array.isArray(ev.sessions) && ev.sessions.length) {
        sessionsRaw.value = ev.sessions
        const d = ev.startDate || ev.start_date
        shows.value = ev.sessions.map(s => {
          const label = s.name || makeShowLabel(d, s.start_time || s.startTime)
          sessionLabelToId.value[label] = s.id
          return label
        })
        selectedShow.value = shows.value[0] || ''
        await refreshAvailabilityForSelectedShow()
      }

      // ถ้า backend มี zones fixed ติดอีเวนต์
      if (Array.isArray(ev.zones) && ev.zones.length) {
        zones.value = ev.zones.map((z, i) => ({
          id: z.id || `Z${i+1}`,
          label: z.name || `Zone ${i+1}`,
          desc: '',
          price: Number(z.price ?? 0),
          remaining: Math.max(0, Number(z.capacity ?? z.remaining ?? 0)),
          qty: 0,
        }))
      }
    } catch (e) {
      console.error('SeatZone load failed:', e)
      zones.value = []
    }
  }
})

/* ===== เปลี่ยนรอบ -> โหลด availability ใหม่ + sync โซน ===== */
watch(selectedShow, async () => {
  await refreshAvailabilityForSelectedShow()
})

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
          <button class="status-chip" @click="openAvail">ที่นั่งว่าง</button>
        </div>
      </div>
      <!-- ===== Modal / Dropdown: โซนที่นั่งว่าง ===== -->
<!-- ===== Modal / Dropdown: โซนที่นั่งว่าง ===== -->
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

        <div v-if="rowsToShow.length === 0" class="empty">ไม่พบข้อมูลโซน</div>
      </template>
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
