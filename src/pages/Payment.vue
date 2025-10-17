<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => stopCountdown())

// รับ id จาก route เพื่อใช้ key เก็บ session
const props = defineProps({ id: [String, Number] })
const route  = useRoute()
const router = useRouter()

// === state
const creating = ref(false)
const confirming = ref(false)
// รองรับหลาย registration (หนึ่งต่อโซน)
const regIds = ref([])              // [number]
const regByZone = ref({})           // { [zoneId]: regId }
const drafts = ref([])              // registrationsDraft ที่อ่านมาจากหน้าเดิม





// โหลด draft ที่ส่งมาจากหน้าก่อนหน้า
function getDrafts() {
  // 1) จาก router state
  const arr = history.state?.registrationsDraft
  if (Array.isArray(arr) && arr.length) return arr

  // 2) จาก sessionStorage
  try {
    const raw = sessionStorage.getItem(`registrationsDraft:${route.params.id}`)
    if (raw) {
      const d = JSON.parse(raw)
      if (Array.isArray(d) && d.length) return d
    }
  } catch {}

  // 3) รองรับเก่า: registrationDraft ตัวเดียว
  try {
    const single = history.state?.registrationDraft ||
                   JSON.parse(sessionStorage.getItem(`registrationDraft:${route.params.id}`) || 'null')
    if (single && single.eventId && single.sessionId && single.zoneId && single.quantity) {
      return [single]
    }
  } catch {}

  return []
}

function toNum(v){ const n = Number(v); return Number.isFinite(n) ? n : null }

function isDraftComplete(d){
  return [d?.eventId, d?.sessionId, d?.zoneId, d?.quantity]
    .every(v => Number.isFinite(Number(v)) && Number(v) > 0)
}

// helper: ดึง id ให้ชัวร์ (เอา seatZoneId ก่อน ถ้าไม่มีค่อย fallback เป็น zoneId)
function pickIds(d, route) {
  const eventId   = Number(d.eventId ?? d.event_id ?? route.params.id)
  const sessionId = Number(d.sessionId ?? d.session_id)
  const seatZoneId = Number(
    d.seatZoneId ?? d.seat_zone_id ?? d.zoneId ?? d.zone_id
  )
  const quantity  = Number(d.quantity)
  return { eventId, sessionId, seatZoneId, quantity }
}





// ========== NEW: รวมหลายโซนเป็นรายการเดียว ==========
// ========== NEW: รวมหลายโซนเป็นรายการเดียว ==========
function collectItemsFromDrafts(arr) {
  return arr
    .map(d => {
      const seatZoneId = Number(d.seatZoneId ?? d.seat_zone_id ?? d.zoneId ?? d.zone_id)
      const quantity   = Number(d.quantity)
      const unitPrice  = Number(d.unitPrice ?? d.price ?? 0)
      const zoneLabel  = d.zoneLabel ?? d.label ?? ''
      return { seatZoneId, quantity, unitPrice, zoneLabel }
    })
    .filter(x => Number.isFinite(x.seatZoneId) && x.seatZoneId > 0 && Number.isFinite(x.quantity) && x.quantity > 0)
}

async function upsertRegistrationBulk(eventId, sessionId, items) {
  const payload = {
    eventId,
    sessionId,
    items: items.map(it => ({
      seatZoneId: it.seatZoneId,
      quantity:   it.quantity,
      unitPrice:  it.unitPrice,
      zoneLabel:  it.zoneLabel
    }))
  }

  const bulkCandidates = [
    { m: 'post', url: '/registrations/bulk' },
    { m: 'post', url: '/registrations' },
  ]

  for (const c of bulkCandidates) {
    try {
      const { data, status } = await api[c.m](c.url, payload)
      const id = Number(data?.id || data?.registrationId)
      if (status >= 200 && status < 300 && Number.isFinite(id)) return id
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || ''
      const match = /id\s*=\s*(\d+)/i.exec(msg)
      if (match) {
        const existingId = Number(match[1])
        if (Number.isFinite(existingId)) {
          await appendItemsToRegistration(existingId, items)
          return existingId
        }
      }
    }
  }

  const base = await createRegistrationShell(eventId, sessionId, items[0]?.seatZoneId, items[0]?.quantity)
  if (items.length > 1) await appendItemsToRegistration(base, items.slice(1))
  return base
}

async function createRegistrationShell(eventId, sessionId, seatZoneId, quantity) {
  const payload = {
    eventId, sessionId, seatZoneId, quantity,
    zoneId: seatZoneId,
    event:    { id: eventId },
    session:  { id: sessionId },
    seatZone: { id: seatZoneId },
    zone:     { id: seatZoneId },
  }

  try {
    const { data, status } = await api.post('/registrations', payload)
    const id = Number(data?.id || data?.registrationId)
    if (status >= 200 && status < 300 && Number.isFinite(id)) return id
    throw new Error('no id')
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || ''
    const match = /id\s*=\s*(\d+)/i.exec(msg)
    if (match) return Number(match[1])
    throw e
  }
}

async function appendItemsToRegistration(registrationId, items) {
  if (!items?.length) return
  const body = {
    items: items.map(it => ({
      seatZoneId: it.seatZoneId,
      quantity:   it.quantity,
      unitPrice:  it.unitPrice,
      zoneLabel:  it.zoneLabel
    }))
  }
  const appendCandidates = [
    { m: 'post',  url: `/registrations/${registrationId}/items` },
    { m: 'patch', url: `/registrations/${registrationId}/items` },
    { m: 'patch', url: `/registrations/${registrationId}/add` },
    { m: 'patch', url: `/registrations/${registrationId}`, body },
  ]
  for (const c of appendCandidates) {
    try { await api[c.m](c.url, c.body ?? body); return }
    catch (_) { /* try next */ }
  }
  console.warn('[appendItemsToRegistration] ไม่มี endpoint สำหรับเพิ่มรายการ — จะจองเฉพาะโซนแรก')
}

async function createRegistrations() {
  drafts.value = getDrafts()
  if (!drafts.value.length) {
    alert('ข้อมูลการเลือกไม่ครบ กรุณาเลือกที่นั่งใหม่')
    router.replace({ name: 'concert-plan', params: { id: route.params.id } })
    return
  }

  creating.value = true
  regIds.value = []
  regByZone.value = {}

  try {
    const items = collectItemsFromDrafts(drafts.value)
    const { eventId, sessionId } = pickIds(drafts.value[0], route)

    const regId = await upsertRegistrationBulk(eventId, sessionId, items)
    regIds.value = [regId]
    items.forEach(it => { regByZone.value[String(it.seatZoneId)] = regId })

    setQrForRegistrations()
    startCountdown()
  } catch (err) {
    const s = err?.response?.status
    if (s === 401 || s === 403) {
      router.replace({ name: 'home', query: { login: 1, redirect: route.fullPath } })
    } else {
      console.error('Create registrations (bulk) failed:', err?.response?.data || err)
      alert('เริ่มการจองไม่สำเร็จ กรุณาลองใหม่')
      await cancelAllRegistrations(true)
      router.replace({ name: 'concert-plan', params: { id: route.params.id } })
    }
  } finally {
    creating.value = false
  }
}


async function confirmPayment() {
  if (!regIds.value.length) { alert('ยังไม่ได้เริ่มการจอง'); return }
  confirming.value = true
  try {
    await Promise.all(regIds.value.map(id =>
      api.patch(`/registrations/${id}/confirm`, { paymentReference: `QR-${Date.now()}` })
    ))

    // เก็บ regIds ให้หน้า success ใช้
    sessionStorage.setItem(`successRegIds:${route.params.id}`, JSON.stringify(regIds.value))
    console.log('[confirmPayment] will nav to ticket-success with', {
  id: String(route.params.id),
  regIds: regIds.value
})
    // 1) ไปหน้า success ก่อน (ให้ guardเช็ค auth จาก token ที่ยังอยู่แน่นอน)
    await router.replace({
      name: 'ticket-success',
      params: { id: String(route.params.id) },
      query: { t: Date.now() },
      state: { regIds: regIds.value }
    })

    // 2) ค่อยลบ draft หลังจากเปลี่ยนหน้าแล้ว (หรือไปทำใน TicketSuccess)
    sessionStorage.removeItem(`registrationDraft:${route.params.id}`)
    sessionStorage.removeItem(`registrationsDraft:${route.params.id}`)
  } catch (e) {
    console.error('[confirmPayment] failed:', e?.response?.data || e)
    alert('ยืนยันการจ่ายไม่สำเร็จ กรุณาลองใหม่')
  } finally {
    confirming.value = false
    stopCountdown()
  }
}


const fallbackPoster = new URL('../assets/poster-fallback.jpg', import.meta.url).href
const order = ref({
  eventId: Number(route.params.id),
  title: '',
  poster: fallbackPoster,
  show: '',
  items: [],
  fee: 0,
})
function loadOrder() {
  const st = history.state?.order
  if (st && typeof st === 'object') {
    order.value = {
      eventId: st.eventId ?? Number(route.params.id),
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
        eventId: o.eventId ?? Number(route.params.id),
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
  Number(order.value.items?.reduce((s, it) => s + Number(it.unitPrice||0) * Number(it.qty||0), 0) || 0) + fee.value
)

onMounted(() => {
  loadOrder()
  createRegistrations()
})


// ===== Payment countdown / QR =====
const PAY_WINDOW_SEC = 5 * 60;               // 5 นาที (เปลี่ยนได้)
const deadline = ref(0);                      // timestamp (ms)
const remaining = ref(0);                     // seconds
let timer = null;

const isTimeoutOpen = ref(false);             // modal หมดเวลา
const qr = ref('');                           // URL ของ QR ที่จะแสดง

const mmss = computed(() => {
  const s = Math.max(0, Math.floor(remaining.value));
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
});

function startCountdown(seconds = PAY_WINDOW_SEC) {
  stopCountdown();
  deadline.value = Date.now() + seconds * 1000;
  tick();
  timer = setInterval(tick, 1000);
}

function stopCountdown() {
  if (timer) { clearInterval(timer); timer = null; }
}

function tick() {
  remaining.value = Math.ceil((deadline.value - Date.now()) / 1000);
  if (remaining.value <= 0) {
    stopCountdown();
    onTimeout();
  }
}

function setQrForRegistrations() {
  // ถ้ามี endpoint รวมหลายใบ ให้ใช้ก่อน
  const ids = regIds.value.join(',')
  const candidates = [
    `/api/payments/qr?registrationIds=${ids}`,       // รวมหลายใบ (ถ้ามี)
    `/api/registrations/pay/qr?ids=${ids}`,          // อีกสไตล์
  ]

  if (regIds.value.length === 1) {
    // เดิม: ใช้ /payments/qr/{id}
    candidates.unshift(
      `/api/payments/qr/${regIds.value[0]}`,
      `/api/payments/qr?registrationId=${regIds.value[0]}`,
      `/api/registrations/${regIds.value[0]}/qr`,
    )
  } else {
    // ถ้าไม่มีรวมจริง ๆ — ใช้ใบแรกเป็นตัวแทนก่อน (ฝั่งแบ็กเอนด์อาจต้องรวมยอดให้)
    candidates.push(`/api/payments/qr/${regIds.value[0]}`)
  }

  qr.value = candidates[0]  // เลือกตามที่ระบบคุณมีจริง เปลี่ยนได้
}


async function onTimeout() {
  isTimeoutOpen.value = true;
  await cancelAllRegistrations(true);
}

function goHomeAfterTimeout() {
  isTimeoutOpen.value = false;
  router.replace({ name: 'home' });
}



async function cancelAllRegistrations(silent = false) {
  try {
    if (!regIds.value.length) return
    for (const id of regIds.value) {
      const candidates = [
        { m: 'patch',  p: `/registrations/${id}/cancel` },
        { m: 'patch',  p: `/registrations/${id}`, body: { status: 'CANCELLED' } },
        { m: 'delete', p: `/registrations/${id}` },
      ]
      let done = false
      for (const c of candidates) {
        try {
          if (c.m === 'patch')  await api.patch(c.p, c.body || {})
          if (c.m === 'delete') await api.delete(c.p)
          done = true; break
        } catch (e) { /* ลองตัวถัดไป */ }
      }
      if (!done) console.warn('Cancel failed for', id)
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
          <router-link :to="{ name: 'event-detail', params: { id: order.eventId || 1 } }" class="link-chip">
            รายละเอียด
          </router-link>
        </div>

        <div class="chip-row">
          <label class="show-label">รอบการแสดง</label>
          <select :value="order.show" disabled>
            <option>{{ order.show }}</option>
          </select>
          <!-- ปุ่มสถานะ (ปิดการกด) -->
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
      <!-- ซ้าย: QR -->
      <div class="qr-card">
        <div class="qr-head">ชำระเงินโดย QR Code</div>
        <p class="qr-note">ข้อมูลการชำระเงินของคุณได้รับการรักษาความปลอดภัยและไม่แบ่งปันกับบุคคลที่สาม</p>

        <div class="countdown">
          เวลาชำระเงินคงเหลือ <span class="time">{{ mmss }}</span>
        </div>

        <div class="qr-box">
          <img :src="qr" alt="QR code" class="qr-img" />
        </div>
      </div>

      <!-- ขวา: Summary -->
      <aside class="summary-card">
        <h3 class="sum-title">ข้อมูลการจอง</h3>

        <div class="sum-row">
          <div class="sum-left">
            <div class="sum-label">ชื่ออีเว้นท์</div>
            <div class="sum-text ellipsis">{{ order.title }}</div>
          </div>
        </div>

        <div v-for="(it, idx) in order.items" :key="idx" class="sum-row">
          <div class="sum-left">
            <div class="sum-label">ตั๋ว</div>
            <div class="sum-text">{{ it.qty }} x {{ it.zoneLabel }}</div>
          </div>
          <div class="sum-right">{{ it.unitPrice.toLocaleString('en-US') }}</div>
        </div>

        <div class="sum-row">
          <div class="sum-left"><div class="sum-label">ค่าธรรมเนียม(10%)</div></div>
          <div class="sum-right">{{ fee.toLocaleString('en-US') }}</div>
        </div>

        <div class="sum-row total">
          <div class="sum-left"><div class="sum-label strong">รวมทั้งสิ้น</div></div>
          <div class="sum-right strong">{{ grandTotal.toLocaleString('en-US') }}</div>
        </div>

        <button class="pay-btn" @click="confirmPayment">ยืนยันการจ่าย</button>
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
      <!-- นาฬิกาทราย -->
      <svg viewBox="0 0 24 24" class="modal-svg" aria-hidden="true">
        <path d="M6 2h12a1 1 0 0 1 1 1v2a5 5 0 0 1-2.46 4.3L14 11l2.54 1.7A5 5 0 0 1 19 17v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2a5 5 0 0 1 2.46-4.3L10 11 7.46 9.3A5 5 0 0 1 5 5V3a1 1 0 0 1 1-1zm1 3a3 3 0 0 0 1.48 2.58L12 10l3.52-2.42A3 3 0 0 0 17 5V4H7zm10 13v-1a3 3 0 0 0-1.48-2.58L12 12l-3.52 2.42A3 3 0 0 0 7 17v1h10z"/>
      </svg>
    </div>

    <h3 id="timeoutTitle" class="modal-title">หมดเวลาการชำระเงิน</h3>
    <p class="modal-desc">
      ระบบได้ปลดการจองที่นั่งของคุณแล้ว กรุณาเริ่มทำการจองใหม่อีกครั้ง
    </p>

    <div class="modal-cta">
      <button class="modal-btn primary" @click="goHomeAfterTimeout">กลับหน้าแรก</button>
    </div>
  </div>
</div>

</template>

<style scoped>
/* ===== QR box ===== */
.qr-box{
  background:#fafafa; border-radius:14px; border:1px dashed #ddd;
  height:520px; display:grid; place-items:center;
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
  background: rgba(15, 23, 42, 0.6); /* slate-900/60 */
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
  to   { transform: translateY(0) scale(1);    opacity: 1; }
}

.modal-icon{
  width: 64px; height: 64px;
  margin: 0 auto 10px;
  border-radius: 50%;
  background: #fff1f0;           /* โทนอุ่น */
  display: grid; place-items: center;
  box-shadow: inset 0 0 0 1px #ffe2de;
}
.modal-svg{ width: 32px; height: 32px; fill: #ef4444; } /* red-500 */

.modal-title{
  margin: 6px 0 6px;
  font-size: 20px;
  font-weight: 900;
  color: #111827;                 /* gray-900 */
}

.modal-desc{
  margin: 0 0 14px;
  color: #4b5563;                 /* gray-600 */
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
.modal-btn.primary:active{ transform: translateY(1px); }


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

/* ===== Disabled status chip (เหมือนปุ่มวันเวลาแต่กดไม่ได้) ===== */
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

/* ===== Page layout & styles (คงของเดิม) ===== */
:root{ --orange:#ff6a13; --ink:#0f172a; --muted:#6b7280; }
.payment-page{ max-width:1120px; margin:0 auto; padding:16px 18px 40px; }

.hero-card{
  display:flex; align-items:center; gap:20px;
  padding:24px 32px; border-radius:16px;
  background: linear-gradient(90deg, #20f00d8f 10%, #4cf3ff6a 60%);
  box-shadow: 0 6px 22px rgba(0,0,0,.08);
}
.poster-wrap{ flex-shrink:0; }
.poster{ width:120px; height:160px; object-fit:cover; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,.25); }
.hero-info{ display:flex; flex-direction:column; gap:10px; }
.event-title{ margin:0; font-size:22px; font-weight:800; color:#111; }
.link-chip{ color:#000000; text-decoration: underline; font-weight:600; }
.chip-row{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.show-label{ font-size:13px; color:#333; font-weight:600; }
select{ padding:8px 12px; border:1px solid #cfcfcf; border-radius:8px; background:#fff; }

.stepper2 { --ball:60px; --track:6px; position:relative; margin:60px 0 0; bottom:20px; }
.stepper2 .track { position:absolute; left:calc(var(--ball)/2 + 10px); right:calc(var(--ball)/2 + 10px); top:calc(var(--ball)/2 - var(--track)/2); height:var(--track); background:#e5e7eb; border-radius:999px; z-index:0; }
.stepper2 .steps { display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1; max-width:600px; margin:0 auto; }
.stepper2 .step { text-align:center; flex:1; }
.stepper2 .ball { width:var(--ball); height:var(--ball); border-radius:50%; display:grid; place-items:center; font-weight:800; font-size:22px; background:#e0e0e0; color:#000; margin:0 auto 6px; box-shadow:0 2px 0 rgba(0,0,0,.04); }
.stepper2 .label { font-size:16px; font-weight:700; color:#111; }
.stepper2 .step:not(.active) .label { color:#6b7280; }
.stepper2 .step.active:nth-child(3) .ball{ background:var(--orange); color:#fff; }

.page-title{ text-align:center; font-size:20px; font-weight:800; color:#111; margin:14px 0 12px; }

.grid{ display:grid; grid-template-columns:1fr 360px; gap:22px; align-items:start; }
.qr-card{ background:#fff; border:1px solid #eee; border-radius:16px; box-shadow:0 8px 18px rgba(0,0,0,.06); padding:18px; }
.qr-head{ font-weight:800; color:#111; margin-bottom:6px; }
.qr-note{ color:#555; font-size:13px; margin:0 0 10px; }

.summary-card{ background:#fff; border:1px solid #eee; border-radius:16px; box-shadow:0 8px 18px rgba(0,0,0,.06); padding:18px; }
.sum-title{ margin:0 0 10px; font-weight:800; color:#111; }

.sum-row{ display:flex; justify-content:space-between; align-items:flex-start; padding:10px 0; border-bottom:1px solid #f1f1f1; }
.sum-row:last-of-type{ border-bottom:0; }
.sum-left{ display:flex; flex-direction:column; gap:4px; }
.sum-label{ font-size:14px; color:#6b7280; }
.sum-text{ color:#111; }
.ellipsis{ max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sum-right{ color:#111; font-weight:700; }
.total .sum-left .sum-label, .total .sum-right{ font-weight:900; }

.pay-btn{
  width:100%; margin-top:14px;
  background: linear-gradient(90deg, #ff6a13, #ff3d00);
  color:#fff; border:none; border-radius:999px; padding:10px 16px;
  font-weight:800; cursor:pointer; box-shadow:0 6px 14px rgba(255,106,19,.25);
}

@media (max-width: 900px){
  .grid{ grid-template-columns: 1fr; }
}
</style>
