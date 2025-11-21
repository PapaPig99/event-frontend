<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'

const props = defineProps({ id: [String, Number] })
const route  = useRoute()
const router = useRouter()

// === state หลัก ===
const creating   = ref(false)
const confirming = ref(false)

const regIds       = ref([])   // เก็บ paymentReference (string)
const regByZone    = ref({})   // { [seatZoneId]: paymentReference }
const drafts       = ref([])
const createResult = ref(null) // เก็บ response จาก POST /registrations (มี ticketCodes)

// poster / order
const fallbackPoster = new URL('../assets/poster-fallback.jpg', import.meta.url).href
const order = ref({
  eventId: Number(route.params.id) || 0,
  title: '',
  poster: fallbackPoster,
  show: '',
  items: [],
  fee: 0,
})

function i(v){ return Math.max(0, parseInt(v, 10) || 0) }

// ===== helper: email ผู้ซื้อ (เอาจาก token หรือ sessionStorage) =====
function getBuyerEmail() {
  // 1) จาก token (กรณี user login ปกติ)
  const t = localStorage.getItem('access_token') || localStorage.getItem('token')
  if (t) {
    try {
      const payload = JSON.parse(
        atob((t.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/'))
      )
      if (payload?.email) return payload.email
      if (payload?.sub && payload.sub.includes('@')) return payload.sub
    } catch (_) {}
  }

  // 2) จาก session/local storage
  const fromStore =
    sessionStorage.getItem('buyerEmail') || localStorage.getItem('buyerEmail')
  if (fromStore && /\S+@\S+\.\S+/.test(fromStore)) return fromStore.trim()

  // 3) จาก query (?email=...) เวลา guest กดมาจากหน้า seat zone
  const fromQuery = typeof route.query.email === 'string' ? route.query.email : ''
  if (fromQuery && /\S+@\S+\.\S+/.test(fromQuery)) {
    sessionStorage.setItem('buyerEmail', fromQuery.trim())
    return fromQuery.trim()
  }

  // 4) จาก history.state.guest (เรา push มาจาก seatzone)
  const fromState = history.state?.guest?.email
  if (fromState && /\S+@\S+\.\S+/.test(fromState)) {
    sessionStorage.setItem('buyerEmail', fromState.trim())
    return fromState.trim()
  }

  // 5) ถ้ายังหาไม่ได้จริง ๆ ค่อย fallback
  return 'guest@example.com'
}


// ===== draft handling =====
function getDrafts() {
  const arr = history.state?.registrationsDraft
  if (Array.isArray(arr) && arr.length) return arr

  try {
    const raw = sessionStorage.getItem(`registrationsDraft:${route.params.id}`)
    if (raw) {
      const d = JSON.parse(raw)
      if (Array.isArray(d) && d.length) return d
    }
  } catch {}

  try {
    const single = history.state?.registrationDraft ||
      JSON.parse(sessionStorage.getItem(`registrationDraft:${route.params.id}`) || 'null')
    if (single && single.eventId && single.sessionId && single.zoneId && single.quantity) return [single]
  } catch {}

  return []
}

function pickIds(d, route) {
  const eventId    = i(d.eventId ?? d.event_id ?? route.params.id)
  const seatZoneId = i(d.seatZoneId ?? d.seat_zone_id ?? d.zoneId ?? d.zone_id)
  const quantity   = i(d.quantity ?? d.qty)
  return { eventId, seatZoneId, quantity }
}

function collectItemsFromDrafts(arr) {
  return arr
    .map(d => {
      const seatZoneId = i(d.seatZoneId ?? d.seat_zone_id ?? d.zoneId ?? d.zone_id)
      const quantity   = i(d.quantity ?? d.qty)
      const unitPrice  = Number(d.unitPrice ?? d.price ?? d.unit_price ?? 0)
      const zoneLabel  = d.zoneLabel ?? d.label ?? ''
      return { seatZoneId, quantity, unitPrice, zoneLabel }
    })
    .filter(x => x.seatZoneId > 0 && x.quantity > 0)
}

function resolveSessionId(draftsArr, route, orderObj) {
  const eventId = i(draftsArr?.[0]?.eventId ?? draftsArr?.[0]?.event_id ?? route.params.id)

  const fromDrafts = []
  for (const d of draftsArr || []) {
    if (d?.sessionId)   fromDrafts.push(i(d.sessionId))
    if (d?.session_id)  fromDrafts.push(i(d.session_id))
  }

  const cands = [
    ...fromDrafts,
    i(history.state?.sessionId),
    i(sessionStorage.getItem(`sessionId:${eventId}`)),
    i(sessionStorage.getItem(`selectedSessionId:${eventId}`)),
    i(localStorage.getItem(`sessionId:${eventId}`)),
    i(orderObj?.items?.[0]?.sessionId),
  ].filter(n => Number.isInteger(n) && n > 0)

  return cands[0] || 0
}

// ===== API: create registrations (รับ response ทั้งก้อน) =====
async function createRegistrationBulk(eventId, sessionId, items) {
  const first = items?.[0]
  if (!first || first.seatZoneId <= 0 || first.quantity <= 0) {
    throw new Error('Invalid items: need at least 1 item with seatZoneId and quantity > 0')
  }
  if (!Number.isInteger(eventId) || eventId <= 0) throw new Error(`Invalid eventId (${eventId})`)
  if (!Number.isInteger(sessionId) || sessionId <= 0) throw new Error(`Invalid sessionId (${sessionId})`)

  const email   = getBuyerEmail()
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' }

  const payloadZone = {
    eventId:   i(eventId),
    sessionId: i(sessionId),
    zoneId:    i(first.seatZoneId),
    quantity:  i(first.quantity),
  }

  const payloadSeat = {
    eventId:    i(eventId),
    sessionId:  i(sessionId),
    seatZoneId: i(first.seatZoneId),
    quantity:   i(first.quantity),
  }

  try {
    console.debug('[POST /registrations] try zoneId', payloadZone)
    const { data, status } = await api.post('/registrations', payloadZone, {
      params: { email },
      headers,
    })
    if (!(status >= 200 && status < 300)) throw new Error(`HTTP ${status}`)
    if (!data?.paymentReference && !data?.payment_reference) {
      console.warn('[POST /registrations] no paymentReference in response, data=', data)
      throw new Error('Missing paymentReference')
    }
    return data
  } catch (e) {
    const s   = e?.response?.status
    const msg = e?.response?.data || e?.message
    console.warn('[POST /registrations] zoneId failed → try seatZoneId', s, msg)

    if (s === 400 || s === 422) {
      console.debug('[POST /registrations] try seatZoneId', payloadSeat)
      const { data, status } = await api.post('/registrations', payloadSeat, {
        params: { email },
        headers,
      })
      if (!(status >= 200 && status < 300)) throw new Error(`HTTP ${status}`)
      if (!data?.paymentReference && !data?.payment_reference) {
        console.warn('[POST /registrations fallback] no paymentReference in response, data=', data)
        throw new Error('Missing paymentReference')
      }
      return data
    }
    throw e
  }
}

// ===== create registrations จาก draft =====
async function createRegistrations() {
  drafts.value = getDrafts()
  if (!drafts.value.length) {
    alert('ข้อมูลการเลือกไม่ครบ กรุณาเลือกที่นั่งใหม่')
    router.replace({ name: 'concert-plan', params: { id: route.params.id } })
    return
  }

  creating.value   = true
  regIds.value     = []
  regByZone.value  = {}
  createResult.value = null

  try {
    const items = collectItemsFromDrafts(drafts.value)
    if (!items.length) {
      console.error('[createRegistrations] items ว่างจาก draft:', drafts.value)
      alert('ข้อมูลที่นั่งไม่ครบ (จำนวนตั๋วเป็น 0) กรุณาเลือกใหม่อีกครั้ง')
      router.replace({ name: 'concert-plan', params: { id: route.params.id } })
      return
    }

    const { eventId } = pickIds(drafts.value[0], route)
    const sessionId   = resolveSessionId(drafts.value, route, order.value)

    if (!sessionId) {
      console.error('[createRegistrations] sessionId = 0 (resolve ไม่ได้)', {
        drafts: drafts.value,
        order : order.value,
        route : route.params,
      })
      alert('ไม่พบรอบการแสดง (sessionId) ของคำสั่งจอง กรุณาเลือกใหม่อีกครั้ง')
      router.replace({ name: 'concert-plan', params: { id: route.params.id } })
      return
    }

    // 🔹 สร้างแล้วได้ response ทั้งก้อน (มี ticketCodes)
    const data = await createRegistrationBulk(eventId, sessionId, items)
    createResult.value = data

    const paymentReference = String(data.paymentReference || data.payment_reference)
    regIds.value = [paymentReference]

    items.forEach(it => {
      regByZone.value[String(it.seatZoneId)] = paymentReference
    })

    setQrForRegistrations()
    startCountdown()
  } catch (err) {
    const s    = err?.response?.status
    const body = err?.response?.data
    console.error('Create registrations (bulk) failed:', s ?? '-', body ?? err?.message ?? err)
    if (s === 401 || s === 403) {
      router.replace({ name: 'home', query: { login: 1, redirect: route.fullPath } })
    } else if (s === 400) {
      alert(
        'เริ่มการจองไม่สำเร็จ (400)\n' +
        'สาเหตุที่พบบ่อย: eventId/sessionId/zoneId/quantity ไม่ถูกต้อง หรือจำนวนตั๋วเป็น 0\n' +
        (typeof body === 'string'
          ? `รายละเอียดเซิร์ฟเวอร์: ${body}`
          : (err?.message ? `\n${err.message}` : ''))
      )
    } else {
      alert('เริ่มการจองไม่สำเร็จ กรุณาลองใหม่')
    }
    await cancelAllRegistrations(true)
    router.replace({ name: 'concert-plan', params: { id: route.params.id } })
  } finally {
    creating.value = false
  }
}

// ===== SUCCESS + Ticket Slider =====
const showTicketModal = ref(false)
const ticketSlides    = ref([])
const activeTicketIdx = ref(0)

const activeTicket = computed(
  () => ticketSlides.value[activeTicketIdx.value] || null
)

function nextTicket() {
  if (!ticketSlides.value.length) return
  activeTicketIdx.value = (activeTicketIdx.value + 1) % ticketSlides.value.length
}

function prevTicket() {
  if (!ticketSlides.value.length) return
  activeTicketIdx.value = (activeTicketIdx.value - 1 + ticketSlides.value.length) % ticketSlides.value.length
}

function closeTicketModal() {
  showTicketModal.value = false
  router.replace({ name: 'home' })
}

async function confirmPayment() {
  if (!regIds.value.length) {
    alert('ยังไม่ได้เริ่มการจอง')
    return
  }

  confirming.value = true
  try {
    const paymentReference = String(regIds.value[0])

    // 1) confirm payment จริง ๆ
    const { data: confirmData } = await api.patch('/registrations/confirm', {
      paymentReference,
    })
    sessionStorage.setItem('lastPayment', JSON.stringify(confirmData))

    // 2) ✅ สร้าง ticketSlides จาก createResult โดยตรง (ไม่ใช้ /me แล้ว)
    let slides = []
    const payload = createResult.value

    if (payload) {
      const ticketCodes =
        payload.ticketCodes ||
        payload.tickets ||
        payload.ticket_codes ||
        []

      const quantity =
        payload.quantity ||
        payload.count ||
        (Array.isArray(ticketCodes) ? ticketCodes.length : 0) ||
        1

      const zoneName =
        payload.zoneName ||
        payload.zone ||
        order.value.items?.[0]?.zoneLabel ||
        '-'

      const codesArr = Array.isArray(ticketCodes) && ticketCodes.length
        ? ticketCodes
        : Array.from({ length: quantity }, () => paymentReference)

      slides = codesArr.map((code, idx) => ({
        id: `${paymentReference}-${idx + 1}`,
        ticketID: `${paymentReference}-${idx + 1}`,
        ticketCode: code,
        eventName:
          order.value.title ||
          `Event #${order.value.eventId || ''}`,
        zone: zoneName,
        timeRange: order.value.show || '',
      }))
    }

    if (slides.length) {
      ticketSlides.value    = slides
      activeTicketIdx.value = 0
      showTicketModal.value = true
    } else {
      // fallback → หน้า success เดิม
      router.replace({
        name: 'ticket-success',
        state: { paymentData: confirmData },
      })
    }

    // ล้าง draft
    sessionStorage.removeItem(`registrationDraft:${route.params.id}`)
    sessionStorage.removeItem(`registrationsDraft:${route.params.id}`)
  } catch (e) {
    console.error('[confirmPayment] failed:', e?.response?.data || e?.message || e)
    alert('ยืนยันการจ่ายไม่สำเร็จ กรุณาลองใหม่')
  } finally {
    confirming.value = false
    stopCountdown()
  }
}

// ===== Order summary =====
function loadOrder() {
  const st = history.state?.order
  if (st && typeof st === 'object') {
    order.value = {
      eventId: i(st.eventId ?? route.params.id),
      title: st.title ?? '',
      poster: st.poster || fallbackPoster,
      show: st.show ?? '',
      items: Array.isArray(st.items) ? st.items : [],
      fee: Number(st.fee || 0),
    }
    return
  }
  try {
    const raw = sessionStorage.getItem(`order:${route.params.id}`)
    if (raw) {
      const o = JSON.parse(raw)
      order.value = {
        eventId: i(o.eventId ?? route.params.id),
        title: o.title ?? '',
        poster: o.poster || fallbackPoster,
        show: o.show ?? '',
        items: Array.isArray(o.items) ? o.items : [],
        fee: Number(o.fee || 0),
      }
    }
  } catch {}
}

const fee = computed(() => Number(order.value.fee || 0))
const grandTotal = computed(() =>
  Number(
    order.value.items?.reduce(
      (s, it) => s + Number(it.unitPrice || 0) * i(it.qty || 0),
      0
    ) || 0
  ) + fee.value
)

// ===== QR + Countdown =====
const PAY_WINDOW_SEC = 5 * 60
const deadline  = ref(0)
const remaining = ref(0)
let   timer     = null

const isTimeoutOpen = ref(false)
const qr            = ref('')

const mmss = computed(() => {
  const s = Math.max(0, Math.floor(remaining.value))
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = (s % 60).toString().padStart(2, '0')
  return `${m}:${ss}`
})

function startCountdown(seconds = PAY_WINDOW_SEC) {
  stopCountdown()
  deadline.value = Date.now() + seconds * 1000
  tick()
  timer = setInterval(tick, 1000)
}

function stopCountdown() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function tick() {
  remaining.value = Math.ceil((deadline.value - Date.now()) / 1000)
  if (remaining.value <= 0) {
    stopCountdown()
    onTimeout()
  }
}

function setQrForRegistrations() {
  const ref = String(regIds.value[0] ?? '')
  if (!ref) {
    qr.value = ''
    return
  }
  // ถ้า backend ยังไม่มี /payments/qr → 404 แค่รูปแตก แต่ flow ไม่พัง
  qr.value = `/api/payments/qr?paymentReference=${encodeURIComponent(ref)}`
}

async function onTimeout() {
  isTimeoutOpen.value = true
  await cancelAllRegistrations(true)
}

function goHomeAfterTimeout() {
  isTimeoutOpen.value = false
  router.replace({ name: 'home' })
}

async function cancelAllRegistrations(silent = false) {
  try {
    if (!regIds.value.length) return

    for (const refOrId of regIds.value) {
      const isNumeric = /^\d+$/.test(String(refOrId))
      const candidates = isNumeric
        ? [
            { m: 'patch',  p: `/registrations/${refOrId}/cancel` },
            { m: 'patch',  p: `/registrations/${refOrId}`, body: { status: 'CANCELLED' } },
            { m: 'delete', p: `/registrations/${refOrId}` },
          ]
        : [
            { m: 'patch',  p: `/registrations/cancel`, params: { paymentReference: String(refOrId) } },
            { m: 'delete', p: `/registrations/by-ref/${encodeURIComponent(String(refOrId))}` },
          ]

      let done = false
      for (const c of candidates) {
        try {
          if (c.m === 'delete') {
            await api.delete(c.p, c.params ? { params: c.params } : undefined)
          } else {
            await api[c.m](c.p, c.body || {}, c.params ? { params: c.params } : undefined)
          }
          done = true
          break
        } catch (e) { /* ลองตัวถัดไป */ }
      }
      if (!done) console.warn('Cancel failed for', refOrId)
    }
  } catch (e) {
    if (!silent) alert('ยกเลิกไม่สำเร็จ กรุณาลองใหม่')
  }
}

async function cancelOrder() {
  await cancelAllRegistrations()
  sessionStorage.removeItem(`registrationDraft:${route.params.id}`)
  sessionStorage.removeItem(`registrationsDraft:${route.params.id}`)
  router.replace({ name: 'concert-plan', params: { id: route.params.id } })
}

// ===== lifecycle =====
onMounted(() => {
  loadOrder()
  createRegistrations()
})

onBeforeUnmount(() => stopCountdown())
</script>


<template>
  <div class="payment-page">
    <!-- HERO -->
    <section class="hero-card">
      <div class="poster-wrap">
        <img :src="order.poster" alt="Poster" class="poster" />
      </div>

      <div class="hero-info">
        <h1 class="event-title">{{ order.title }}</h1>

        <div class="link-row">
          <router-link
            :to="{ name: 'event-detail', params: { id: order.eventId || 1 } }"
            class="link-chip"
          >
            รายละเอียด
          </router-link>
        </div>

        <div class="chip-row">
          <label class="show-label">รอบการแสดง</label>
          <select :value="order.show" disabled>
            <option>{{ order.show }}</option>
          </select>
          <button class="status-chip" disabled>ที่นั่งว่าง</button>
        </div>
      </div>
    </section>

    <!-- STEP 3 -->
    <section class="stepper2">
      <div class="track"></div>
      <div class="steps">
        <div class="step active">
          <div class="ball">1</div>
          <div class="label">ดูผังและที่นั่ง</div>
        </div>
        <div class="step active">
          <div class="ball">2</div>
          <div class="label">เลือกประเภทที่นั่ง</div>
        </div>
        <div class="step active">
          <div class="ball orange">3</div>
          <div class="label">ชำระเงิน</div>
        </div>
      </div>
    </section>

    <h2 class="page-title">ชำระเงิน</h2>

    <section class="grid">
      <div class="qr-card">
        <div class="qr-head">ชำระเงินโดย QR Code</div>
        <p class="qr-note">
          ข้อมูลการชำระเงินของคุณได้รับการรักษาความปลอดภัยและไม่แบ่งปันกับบุคคลที่สาม
        </p>
        <div class="countdown">
          เวลาชำระเงินคงเหลือ <span class="time">{{ mmss }}</span>
        </div>
        <div class="qr-box">
          <img :src="qr" alt="QR code" class="qr-img" />
        </div>
      </div>

      <aside class="summary-card">
        <h3 class="sum-title">ข้อมูลการจอง</h3>

        <div class="sum-row">
          <div class="sum-left">
            <div class="sum-label">ชื่ออีเว้นท์</div>
            <div class="sum-text ellipsis">{{ order.title }}</div>
          </div>
        </div>

        <div
          v-for="(it, idx) in order.items"
          :key="idx"
          class="sum-row"
        >
          <div class="sum-left">
            <div class="sum-label">ตั๋ว</div>
            <div class="sum-text">
              {{ it.qty }} x {{ it.zoneLabel }}
            </div>
          </div>
          <div class="sum-right">
            {{ it.unitPrice.toLocaleString('en-US') }}
          </div>
        </div>

        <div class="sum-row">
          <div class="sum-left">
            <div class="sum-label">ค่าธรรมเนียม(10%)</div>
          </div>
          <div class="sum-right">
            {{ fee.toLocaleString('en-US') }}
          </div>
        </div>

        <div class="sum-row total">
          <div class="sum-left">
            <div class="sum-label strong">รวมทั้งสิ้น</div>
          </div>
          <div class="sum-right strong">
            {{ grandTotal.toLocaleString('en-US') }}
          </div>
        </div>

        <button class="pay-btn" @click="confirmPayment" :disabled="confirming">
          {{ confirming ? 'กำลังยืนยัน...' : 'ยืนยันการจ่าย' }}
        </button>
        <button class="cancel-btn" @click="cancelOrder">ยกเลิก</button>
      </aside>
    </section>
  </div>

  <!-- Timeout Modal -->
  <div
    v-if="isTimeoutOpen"
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="timeoutTitle"
    @click.self="goHomeAfterTimeout"
  >
    <div class="modal-card">
      <div class="modal-icon">
        <svg viewBox="0 0 24 24" class="modal-svg" aria-hidden="true">
          <path
            d="M6 2h12a1 1 0 0 1 1 1v2a5 5 0 0 1-2.46 4.3L14 11l2.54 1.7A5 5 0 0 1 19 17v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2a5 5 0 0 1 2.46-4.3L10 11 7.46 9.3A5 5 0 0 1 5 5V3a1 1 0 0 1 1-1zm1 3a3 3 0 0 0 1.48 2.58L12 10l3.52-2.42A3 3 0 0 0 17 5V4H7zm10 13v-1a3 3 0 0 0-1.48-2.58L12 12l-3.52 2.42A3 3 0 0 0 7 17v1h10z"
          />
        </svg>
      </div>
      <h3 id="timeoutTitle" class="modal-title">หมดเวลาการชำระเงิน</h3>
      <p class="modal-desc">
        ระบบได้ปลดการจองที่นั่งของคุณแล้ว กรุณาเริ่มทำการจองใหม่อีกครั้ง
      </p>
      <div class="modal-cta">
        <button class="modal-btn primary" @click="goHomeAfterTimeout">
          กลับหน้าแรก
        </button>
      </div>
    </div>
  </div>

  <!-- ✅ Ticket Success Modal + Slider -->
  <div
    v-if="showTicketModal"
    class="ticket-backdrop"
    @click.self="closeTicketModal"
  >
    <div class="ticket-modal-card">
      <div class="icon-ring">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="icon">
          <path
            d="M9 16.17 5.53 12.7a1 1 0 1 0-1.41 1.42l4.18 4.17a1 1 0 0 0 1.41 0l10-10a1 1 0 1 0-1.41-1.41L9 16.17z" />
        </svg>
      </div>
      <h2 class="ticket-title">ชำระเงินสำเร็จ 🎉</h2>
      <p class="ticket-sub">
       กรุณาถ่ายภาพหน้าจอเก็บไว้เพื่อแสดงหน้างาน <br>
          สามารถเข้าสู่ระบบเพื่อดูตั๋วได้ที่เมนู “My Event”
      </p>

      <div v-if="activeTicket" class="ticket-body">
        <div class="ticket-code-label">Ticket Code</div>
        <div class="ticket-code-box">
          {{ activeTicket.ticketCode }}
        </div>

        <div class="ticket-info">
          <div class="t-row">
            <span class="t-label">Event</span>
            <span class="t-value">{{ activeTicket.eventName }}</span>
          </div>
          <div class="t-row">
            <span class="t-label">รอบ</span>
            <span class="t-value">{{ activeTicket.timeRange || '-' }}</span>
          </div>
          <div class="t-row">
            <span class="t-label">Zone</span>
            <span class="t-value">{{ activeTicket.zone }}</span>
          </div>
          <div class="t-row">
            <span class="t-label">Ticket ID</span>
            <span class="t-value">{{ activeTicket.ticketID }}</span>
          </div>
        </div>
        

        <div
          v-if="ticketSlides.length > 1"
          class="ticket-slider-nav"
        >
          <button class="nav-btn" @click.stop="prevTicket">‹ Prev</button>
          <span class="nav-status">
            {{ activeTicketIdx + 1 }} / {{ ticketSlides.length }}
          </span>
          <button class="nav-btn" @click.stop="nextTicket">Next ›</button>
        </div>
      </div>

      <div class="ticket-footer">
        <button class="ticket-close-btn" @click="closeTicketModal">
          ปิด
        </button>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
/* icon */
.icon-ring {
  width: 64px;
  height: 64px;
  margin: 2px auto 14px;
  border-radius: 999px;
  background: #ecfdf5;
  /* emerald-50 */
  display: grid;
  place-items: center;
  box-shadow:
    inset 0 0 0 1px #d1fae5,
    /* emerald-100 */
    0 6px 20px rgba(16, 185, 129, .15);
  /* emerald glow */
}

.icon {
  width: 40px;
  height: 40px;
  fill: #10b981;
}

/* ===== QR box ===== */
.qr-box{
  background:#fafafa;
  border-radius:14px;
  border:1px dashed #ddd;
  height:520px;
  display:grid;
  place-items:center;
}
.qr-img{
  max-width: 80%;
  max-height: 70%;
  object-fit: contain;
  display: block;
}
.countdown{
  margin: 6px 0 12px;
  font-size: 14px;
  color: #ff0000;
}
.countdown .time{
  font-weight: 1000;
  letter-spacing: 0.5px;
}

/* ===== Timeout Modal ===== */
.modal-backdrop{
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
}
.modal-card{
  width: min(520px, 92vw);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 30px 80px rgba(0,0,0,.35);
  padding: 24px 22px 18px;
  text-align: center;
  animation: modal-pop .18s ease-out;
}
@keyframes modal-pop {
  from { transform: translateY(4px) scale(.98); opacity: .0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}
.modal-icon{
  width: 64px; height: 64px; margin: 0 auto 10px;
  border-radius: 50%; background: #fff1f0;
  display: grid; place-items: center;
  box-shadow: inset 0 0 0 1px #ffe2de;
}
.modal-svg{ width: 32px; height: 32px; fill: #ef4444; }
.modal-title{
  margin: 6px 0 6px;
  font-size: 20px;
  font-weight: 900;
  color: #111827;
}
.modal-desc{
  margin: 0 0 14px;
  color: #4b5563;
  line-height: 1.65;
}
.modal-cta{
  display: flex;
  justify-content: center;
  gap: 10px;
}
.modal-btn{
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  font-weight: 800;
  cursor: pointer;
}
.modal-btn.primary{
  background: linear-gradient(90deg, #ff6a13, #ff3d00);
  color: #fff;
  box-shadow: 0 6px 14px rgba(255, 106, 19, .25);
}
.modal-btn.primary:active{
  transform: translateY(1px);
}

/* ===== Cancel button ===== */
.cancel-btn{
  width:100%;
  margin-top:10px;
  background:#e8e8e8;
  color:#111;
  border:1px solid #e5e7eb;
  border-radius:999px;
  padding:10px 16px;
  font-weight:800;
  cursor:pointer;
}
.cancel-btn:hover{ background:#e5e7eb; }

/* ===== Disabled status chip ===== */
.status-chip{
  background:#f3f7ff;
  border:1px solid #d1d5db;
  color:#9ca3af;
  padding:8px 16px;
  border-radius:12px;
  font-weight:700;
  cursor:not-allowed;
  opacity:.8;
}

/* ===== Layout ===== */
:root{
  --orange:#ff6a13;
  --ink:#0f172a;
  --muted:#6b7280;
}
.payment-page{
  max-width:1120px;
  margin:0 auto;
  padding:16px 18px 40px;
}
.hero-card{
  display:flex;
  align-items:center;
  gap:20px;
  padding:24px 32px;
  border-radius:16px;
  background: linear-gradient(90deg, #20f00d8f 10%, #4cf3ff6a 60%);
  box-shadow: 0 6px 22px rgba(0,0,0,.08);
}
.poster-wrap{ flex-shrink:0; }
.poster{
  width:120px;
  height:160px;
  object-fit:cover;
  border-radius:10px;
  box-shadow:0 4px 10px rgba(0,0,0,.25);
}
.hero-info{
  display:flex;
  flex-direction:column;
  gap:10px;
}
.event-title{
  margin:0;
  font-size:22px;
  font-weight:800;
  color:#111;
}
.link-chip{
  color:#000000;
  text-decoration: underline;
  font-weight:600;
}
.chip-row{
  display:flex;
  align-items:center;
  gap:12px;
  flex-wrap:wrap;
}
.show-label{
  font-size:13px;
  color:#333;
  font-weight:600;
}
select{
  padding:8px 12px;
  border:1px solid #cfcfcf;
  border-radius:8px;
  background:#fff;
}

/* Stepper */
.stepper2 {
  --ball:60px;
  --track:6px;
  position:relative;
  margin:60px 0 0;
  bottom:20px;
}
.stepper2 .track {
  position:absolute;
  left:calc(var(--ball)/2 + 10px);
  right:calc(var(--ball)/2 + 10px);
  top:calc(var(--ball)/2 - var(--track)/2);
  height:var(--track);
  background:#e5e7eb;
  border-radius:999px;
  z-index:0;
}
.stepper2 .steps{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  position:relative;
  z-index:1;
  max-width:600px;
  margin:0 auto;
}
.stepper2 .step{ text-align:center; flex:1; }
.stepper2 .ball{
  width:var(--ball);
  height:var(--ball);
  border-radius:50%;
  display:grid;
  place-items:center;
  font-weight:800;
  font-size:22px;
  background:#e0e0e0;
  color:#000;
  margin:0 auto 6px;
  box-shadow:0 2px 0 rgba(0,0,0,.04);
}
.stepper2 .label{
  font-size:16px;
  font-weight:700;
  color:#111;
}
.stepper2 .step:not(.active) .label{ color:#6b7280; }
.stepper2 .step.active:nth-child(3) .ball{
  background:var(--orange);
  color:#fff;
}

.page-title{
  text-align:center;
  font-size:20px;
  font-weight:800;
  color:#111;
  margin:14px 0 12px;
}

.grid{
  display:grid;
  grid-template-columns:1fr 360px;
  gap:22px;
  align-items:start;
}
.qr-card, .summary-card{
  background:#fff;
  border:1px solid #eee;
  border-radius:16px;
  box-shadow:0 8px 18px rgba(0,0,0,.06);
  padding:18px;
}
.qr-head{
  font-weight:800;
  color:#111;
  margin-bottom:6px;
}
.qr-note{
  color:#555;
  font-size:13px;
  margin:0 0 10px;
}

.sum-title{
  margin:0 0 10px;
  font-weight:800;
  color:#111;
}
.sum-row{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  padding:10px 0;
  border-bottom:1px solid #f1f1f1;
}
.sum-row:last-of-type{ border-bottom:0; }
.sum-left{
  display:flex;
  flex-direction:column;
  gap:4px;
}
.sum-label{
  font-size:14px;
  color:#6b7280;
}
.sum-text{ color:#111; }
.ellipsis{
  max-width:220px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.sum-right{
  color:#111;
  font-weight:700;
}
.total .sum-left .sum-label,
.total .sum-right{
  font-weight:900;
}

.pay-btn{
  width:100%;
  margin-top:14px;
  background: linear-gradient(90deg, #ff6a13, #ff3d00);
  color:#fff;
  border:none;
  border-radius:999px;
  padding:10px 16px;
  font-weight:800;
  cursor:pointer;
  box-shadow:0 6px 14px rgba(255,106,19,.25);
}

@media (max-width: 900px){
  .grid{ grid-template-columns: 1fr; }
}

/* ===== Ticket success modal + slider ===== */
.ticket-backdrop{
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.7);
  display: grid;
  place-items: center;
  z-index: 1100;
  padding: 20px;
}
.ticket-modal-card{
  width: min(520px, 94vw);
  background:#fff;
  border-radius:18px;
  box-shadow:0 24px 60px rgba(0,0,0,.35);
  padding:20px 20px 16px;
  text-align:center;
  animation: modal-pop .18s ease-out;
}
.ticket-title{
  margin:4px 0 4px;
  font-size:22px;
  font-weight:900;
  color:#111827;
}
.ticket-sub{
  margin:0 0 10px;
  font-size:13px;
  color:#6b7280;
}
.ticket-body{
  margin-top:4px;
}
.ticket-code-label{
  font-size:12px;
  font-weight:700;
  color:#ef4444;
  margin-bottom:4px;
}
.ticket-code-box{
  margin:0 auto 12px;
  text-align:center;
  font-size:22px;
  font-weight:800;
  letter-spacing:3px;
  color:#e63946;
  background:linear-gradient(135deg,#f9f9f9,#f0f0f0);
  border-radius:16px;
  padding:1rem 0.8rem;
  box-shadow:0 2px 8px rgba(0,0,0,0.08);
  max-width:280px;
}
.ticket-info{
  text-align:left;
  margin:0 auto 10px;
  max-width:360px;
}
.t-row{
  display:flex;
  justify-content:space-between;
  gap:10px;
  padding:4px 0;
  border-bottom:1px dashed #e5e7eb;
}
.t-row:last-child{ border-bottom:none; }
.t-label{
  font-size:12px;
  font-weight:700;
  color:#6b7280;
}
.t-value{
  font-size:14px;
  font-weight:800;
  color:#111827;
  text-align:right;
}

.ticket-slider-nav{
  display:flex;
  justify-content:center;
  align-items:center;
  gap:10px;
  margin-top:8px;
}
.nav-btn{
  border-radius:999px;
  border:1px solid #e5e7eb;
  background:#f3f4f6;
  padding:6px 12px;
  font-size:12px;
  font-weight:700;
  cursor:pointer;
}
.nav-status{
  font-size:12px;
  font-weight:700;
  color:#6b7280;
}
.ticket-footer{
  margin-top:10px;
}
.ticket-close-btn{
  border:none;
  border-radius:999px;
  padding:8px 18px;
  font-weight:800;
  cursor:pointer;
  background:#111827;
  color:#fff;
}
.ticket-close-btn:active{
  transform: translateY(1px);
}
</style>
