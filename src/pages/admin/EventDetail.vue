<template>
  <div class="event-detail-page" @keyup.esc="closeModal" tabindex="0">
    <!-- Top toolbar -->
    <header class="toolbar">
      <div class="page-title">Event details ยังไม่ได้แก้</div>
    </header>

    <!-- HERO -->
    <section class="hero pastel">
      <img class="poster" :src="event.bannerUrl" alt="Event Banner" />

      <div class="hero-info">
        <div class="category">{{ event.category || 'คอนเสิร์ต' }}</div>
        <h1 class="event-name">{{ event.title }}</h1>


        <!-- Facts -->
        <div class="info-strip-pastel">
          <div class="info-grid">

            <div class="info-item">
              <i class="fa-regular fa-calendar"></i>
              <div>
                <div class="label">วันงาน</div>
                <div class="value">{{ showDateText }}</div>
              </div>
            </div>

            <div class="info-item">
              <i class="fa-solid fa-location-dot"></i>
              <div>
                <div class="label">สถานที่งาน</div>
                <div class="value">{{ event.venue || '-' }}</div>
              </div>
            </div>

            <div class="info-item">
              <i class="fa-regular fa-clock"></i>
              <div>
                <div class="label">ประตูเปิด</div>
                <div class="value">{{ doorOpenText }}</div>
              </div>
            </div>

            <div class="info-item">
              <i class="fa-regular fa-money-bill-1"></i>
              <div>
                <div class="label">ราคาบัตร</div>
                <div class="value">{{ priceTiersText }}</div>
              </div>
            </div>

            <div class="info-item">
              <i class="fa-solid fa-cart-shopping"></i>
              <div>
                <div class="label">วันเปิดจำหน่าย</div>
                <div class="value">{{ saleStartText }}</div>
              </div>
            </div>
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
      </div>
    </section>

    <!-- ผังงาน & รอบของงาน -->
    <section class="stage" id="stage-section">
      <h2 class="section-title">ผังงาน & รอบของงาน</h2>

      <div class="stage-card" :class="{ 'noimg': !hasSeatmap }">
        <!-- ซ้าย: รูปผัง -->
        <img v-if="hasSeatmap" :src="event.seatmapUrl" alt="Seat map" class="seatmap" />

        <!-- ขวา -->
        <div class="show-content">
          <div class="show-header">
            <div class="place">
              <svg class="icon-pin" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 2C8.686 2 6 4.686 6 8c0 4.418 6 12 6 12s6-7.582 6-12c0-3.314-2.686-6-6-6zm0 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>
              {{ event.venue || '-' }}
            </div>
            <div class="price-label">ราคาบัตร</div>
            <div class="price-line">{{ priceTiersText }}</div>
          </div>
        </div>

        <!-- ตารางวันที่/เวลา (หลาย session) -->
        <div class="date-table">
          <div class="table-head">
            <div>วันที่เริ่มงาน</div>
            <div class="right">การกระทำ</div>
          </div>

          <div v-for="s in sessionsSorted" :key="s.id" class="session-block">
            <!-- แถวหลัก -->
            <div class="table-row">
              <div class="date-text">{{ s.name }}</div>
              <div class="actions">
                <button class="btn attendee" @click="toggleAttendees(s)">
                  <svg class="icon-user" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.866 0-7 2.239-7 5v2h14v-2c0-2.761-3.134-5-7-5z" />
                  </svg>
                  รายชื่อผู้เข้าร่วม
                </button>

                <button class="time-pill" @click="toggleZones(s)">
                  {{ s.startTime ? s.startTime.replace(/:00$/, '') : '-' }}
                </button>
              </div>
            </div>

            <!-- แผงโซนคงเหลือ -->
            <transition name="collapse">
              <div v-if="expandedZonesId === s.id" class="inline-panel">
                <div class="panel-head">
                  <strong>โซนคงเหลือ</strong>
                  <small v-if="zonesLoadingId === s.id">กำลังโหลด...</small>
                  <small v-else-if="zonesError">{{ zonesError }}</small>
                </div>

                <div v-if="zonesLoadingId !== s.id && !zonesError" class="zone-table compact">
                  <div class="z-head">
                    <div>โซน</div>
                    <div class="right">คงเหลือ</div>
                  </div>
                  <div class="z-row" v-for="z in (zonesBySession[s.id] || [])" :key="z.zoneId">
                    <div class="z-name">
                      {{ z.zoneName }}
                      <span class="z-capacity">({{ z.capacity }} ที่นั่ง)</span>
                    </div>
                    <div class="z-qty" :class="qtyClass(z.available)">
                      {{ z.available }}
                    </div>
                  </div>
                  <div v-if="(zonesBySession[s.id] || []).length === 0" class="empty-note">ไม่มีข้อมูลโซน</div>
                </div>
              </div>
            </transition>

            <!-- แผงตารางผู้เข้าร่วม -->
            <transition name="collapse">
              <div v-if="expandedAttendeesId === s.id" class="inline-panel">
                <div class="panel-head">
                  <strong>รายชื่อผู้เข้าร่วม</strong>
                  <small v-if="attLoadingId === s.id">กำลังโหลด...</small>
                  <small v-else-if="attError" class="error">{{ attError }}</small>
                </div>

                <div v-if="attLoadingId !== s.id && !attError" class="table attendees-table">
                  <div class="t-head">
                    <div class="col no">#</div>
                    <div class="col name">ชื่อ</div>
                    <div class="col email">อีเมล</div>
                    <div class="col phone">โทร</div>
                    <div class="col ticket">โซน</div>
                    <div class="col qty">จำนวน</div>
                    <div class="col reg">สถานะจอง</div>
                    <div class="col pay">ชำระเงิน</div>
                    <div class="col time">ลงทะเบียน</div>
                    <div class="col ref">Ref</div>
                  </div>

                  <div class="t-row" v-for="(r, idx) in (attendeesBySession[s.id] || [])" :key="r.id || idx">
                    <div class="col no">{{ idx + 1 }}</div>
                    <div class="col name">{{ r.user?.name || '-' }}</div>
                    <div class="col email mono">{{ r.user?.email || '-' }}</div>
                    <div class="col phone mono">{{ r.user?.phone || '-' }}</div>
                    <div class="col ticket">Zone#{{ r.zoneId ?? '-' }}</div>
                    <div class="col qty">{{ r.quantity ?? '-' }}</div>
                    <div class="col reg">
                      <span class="status-chip" :class="statusClass(r.registrationStatus)">
                        {{ r.registrationStatus || '-' }}
                      </span>
                    </div>
                    <div class="col pay">
                      <span class="status-chip" :class="payClass(r.paymentStatus)">
                        {{ r.paymentStatus || '-' }}
                      </span>
                    </div>
                    <div class="col time mono">
                      {{ r.registeredAt ? r.registeredAt.replace('T', ' ') : '-' }}
                    </div>
                    <div class="col ref mono">{{ r.paymentReference || '-' }}</div>
                  </div>

                  <div v-if="(attendeesBySession[s.id] || []).length === 0" class="empty-note">
                    ยังไม่มีผู้เข้าร่วม
                  </div>
                </div>
              </div>
            </transition>

          </div>
        </div>
      </div>
    </section>


    <!-- รายละเอียด -->
    <section class="detail-section">
      <h2 class="section-title">รายละเอียด</h2>
      <div class="detail-card">
        <div v-if="!isPlainText" class="detail-body" v-html="event.descriptionHtml"></div>
        <div v-else class="detail-body plain">{{ event.descriptionHtml || '- ไม่มีข้อมูลรายละเอียด -' }}</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/lib/api";
const route = useRoute();


/* ================== STATE ================== */
const event = reactive({
  id: null,
  title: "",
  category: "",
  bannerUrl: "",
  seatmapUrl: "",
  venue: "",
  descriptionHtml: "",
  sessions: [],
  zones: [],
  startDate: null,
  endDate: null,
  saleStartAt: null,
  saleEndAt: null,
  saleUntilSoldout: false,
  doorOpenTime: "",
  isPublished: true,
  saleStatus: "",        //OPEN / CLOSED / UPCOMING
  prices: []
});

/* ================== UTILS ================== */
function fixBuddhistYear(y) { return y > 2400 ? y - 543 : y; }
function toDateSmart(input) {
  if (!input) return null; const raw = String(input).trim();
  let m = raw.replace(" ", "T").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (m) { const Y = fixBuddhistYear(+m[1]); const iso = `${String(Y).padStart(4, "0")}-${m[2]}-${m[3]}${m[4] ? `T${m[4]}:${m[5]}` : ""}`; const d = new Date(iso); return isNaN(d) ? null : d; }
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?$/i);
  if (m) { const MM = +m[1], DD = +m[2], Y = fixBuddhistYear(+m[3]); let hh = m[4] ? +m[4] : 0, mm = m[5] ? +m[5] : 0, ap = (m[6] || "").toUpperCase(); if (ap === "PM" && hh < 12) hh += 12; if (ap === "AM" && hh === 12) hh = 0; const d = new Date(Y, MM - 1, DD, hh, mm, 0); return isNaN(d) ? null : d; }
  const d = new Date(raw); return isNaN(d) ? null : d;
}
function fixThaiBuddhistYear(input) {
  if (!input) return null; const s = String(input).trim(); const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s; const y = fixBuddhistYear(+m[1]); return `${String(y).padStart(4, "0")}${s.slice(4)}`;
}
function toDate(v) { const iso = fixThaiBuddhistYear(v); return toDateSmart(iso); }
function formatThaiDateTime(d) { const dt = toDate(d); if (!dt) return "-"; const dd = dt.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }); const tt = dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }); return `${dd}, ${tt} น.`; }

/* ================== DERIVED ================== */
const fallbackSeatmap = new URL('../assets/seatmap-fallback.png', import.meta.url).href;
const hasSeatmap = computed(() => !!event.seatmapUrl && event.seatmapUrl !== fallbackSeatmap);

const showDateText = computed(() => {
  if (!event.startDate || !event.endDate) return "-";

  const start = new Date(event.startDate);
  const end = new Date(event.endDate);

  const formatShort = (d, withYear = false) => {
    const opts = { day: "numeric", month: "short" };
    if (withYear) opts.year = "numeric";
    return d.toLocaleDateString("th-TH", opts);
  };

  if (start.toDateString() === end.toDateString()) {
    return `จัดวันที่ ${formatShort(start, true)}`;
  }

  return `${formatShort(start)}  - ${formatShort(end, true)}`;
});






const doorOpenText = computed(() => event.doorOpenTime || "-");

const saleStartText = computed(() => {
  if (!event.saleStartAt) return "-";
  const start = formatThaiDateTime(event.saleStartAt);
  const until = event.saleUntilSoldout ? " จนกว่าบัตรจะหมด" : (event.saleEndAt ? ` ถึง ${formatThaiDateTime(event.saleEndAt)}` : "");
  return start + until;
});

/* ===== Sessions helpers (หลายรอบ) ===== */
const sessionsSorted = computed(() => {
  return [...event.sessions].sort((a, b) => a.id - b.id);
});

/* ===== Ticket Status ===== */
const tsText = computed(() => {
  switch (event.saleStatus) {
    case "UPCOMING": return "เร็ว ๆ นี้";
    case "OPEN": return "เปิดให้ซื้อตั๋วแล้ว";
    case "CLOSED": return "ปิดการขายแล้ว";
    default: return "-";
  }
});

const tsClass = computed(() => {
  switch (event.saleStatus) {
    case "UPCOMING": return "soon";
    case "OPEN": return "open";
    case "CLOSED": return "closed";
    default: return "";
  }
});

/* ===== price ======== */
const priceTiersText = computed(() => {
  if (!event.prices?.length) return "-";

  const formatted = [...event.prices]
    .sort((a, b) => b.price - a.price)  // เรียงจากมาก → น้อย
    .map(p => Number(p.price).toLocaleString());

  return formatted.join(" / ");
});


/* ===== Inline Zone availability (per session) ===== */
const expandedZonesId = ref(null);           // session.id ที่กำลังเปิดดู
const zonesBySession = reactive({});         // { [sessionId]: ZoneAvailability[] }
const zonesLoadingId = ref(null);
const zonesError = ref("");

function qtyClass(n) { if (n <= 0) return "soldout"; if (n <= 10) return "low"; return "ok"; }

async function toggleZones(s) {
  zonesError.value = "";
  if (expandedZonesId.value === s.id) { expandedZonesId.value = null; return; }
  expandedZonesId.value = s.id;

  if (!zonesBySession[s.id]) {
    zonesLoadingId.value = s.id;
    try {
      const res = await fetch(`/api/zones/session/${s.id}/availability`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      zonesBySession[s.id] = Array.isArray(data) ? data : [];
    } catch (e) {
      zonesError.value = e?.message || "โหลดข้อมูลโซนไม่สำเร็จ";
      zonesBySession[s.id] = [];
    } finally {
      zonesLoadingId.value = null;
    }
  }
}

/* ===== Inline Attendees table (per session) ===== */
const expandedAttendeesId = ref(null);
const attendeesBySession = reactive({});     // { [sessionId]: Attendee[] }
const attLoadingId = ref(null);
const attError = ref("");

function statusClass(s) {
  const v = (s || "").toUpperCase();
  if (["PAID", "CONFIRMED", "SUCCESS"].includes(v)) return "ok";
  if (["PENDING", "HOLD"].includes(v)) return "warn";
  return "bad";
}
function payClass(s) {
  const v = (s || "").toUpperCase();
  if (v === "PAID") return "ok";
  if (v === "UNPAID") return "bad";
  return "warn";
}

async function toggleAttendees(s) {
  attError.value = "";

  // toggle ปิด/เปิด
  if (expandedAttendeesId.value === s.id) {
    expandedAttendeesId.value = null;
    return;
  }
  expandedAttendeesId.value = s.id;

  // โหลดเฉพาะครั้งแรกของ session นั้น
  if (!attendeesBySession[s.id]) {
    attLoadingId.value = s.id;
    try {
      const { data } = await api.get(`registrations/event/${event.id}/${s.id}`);
      attendeesBySession[s.id] = Array.isArray(data) ? data : [];
    } catch (e) {
      attError.value = e?.response?.data?.message || e.message || "โหลดรายชื่อไม่สำเร็จ";
      attendeesBySession[s.id] = [];
    } finally {
      attLoadingId.value = null;
    }
  }
}


const isPlainText = computed(() => {
  const s = (event.descriptionHtml || "").trim(); if (!s) return true; return !/<[a-z][\s\S]*>/i.test(s);
});


/* ===== Fetch event ===== */
function normalizeEvent(api) {
  return {
    id: api.id ?? null,
    title: api.title ?? "",
    category: api.category ?? "",
    bannerUrl: api.posterImageUrl ?? api.detailImageUrl ?? "",
    seatmapUrl: api.seatmapImageUrl ?? "",
    venue: api.location ?? "",
    descriptionHtml: api.description ?? "",
    sessions: (api.sessions || []),
    zones: (api.zones || []),
    startDate: fixThaiBuddhistYear(api.startDate),
    endDate: fixThaiBuddhistYear(api.endDate),
    saleStartAt: api.saleStartAt ?? api.salesStartAt ?? api.openSaleAt ?? null,
    saleEndAt: api.saleEndAt ?? api.salesEndAt ?? api.closeSaleAt ?? null,
    saleUntilSoldout: !!api.saleUntilSoldout,
    doorOpenTime: api.doorOpenTime ?? "",
    saleStatus: api.saleStatus ?? null,           // 'UPCOMING' | 'OPEN' | 'CLOSED'
    prices: Array.isArray(api.prices) ? api.prices : [] // [{ price: number }]
  };
}
onMounted(async () => {
  const id = route.params.id || 1;
  const res = await fetch(`/api/events/${id}/view`);
  if (!res.ok) { console.error("HTTP", res.status); return; }
  Object.assign(event, normalizeEvent(await res.json()));
  selectedShowId.value = sessionsSorted.value?.[0]?.id || "";
});
</script>

<style scoped>
/* ===== Page ===== */
.event-detail-page {
  padding: 20px;
  background: #f6f8fb;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.page-title {
  font-size: 22px;
  font-weight: 400;
  color: #5f6063;
}

/* ===== HERO ===== */
.hero {
  display: grid;
  grid-template-columns: 320px 1fr;
  align-items: start;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, .06);
  padding: 16px;
  margin-bottom: 16px;
}


.hero.pastel {
  background: #fff;
}

.hero-info {
  margin-top: 90px;
  padding-top: 8px;
}

.info-strip-pastel {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eef2f7;
}

.poster {
  width: 90%;
  aspect-ratio: 420/594;
  object-fit: cover;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, .04);
  /* เงาเบาๆ */
}

.category {
  color: #111;
  font-weight: 700;
  margin-bottom: 4px;
}

.event-name {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: 0.4fr 1fr;
  gap: 12px 18px;
}

.info-item {
  display: flex;
  gap: 10px;
}

.label {
  font-weight: 700;
  color: #0f172a;
}

.value {
  font-size: 13px;
  color: #222;
}

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
}

/* สีตามสถานะ */
.status-pill.open {
  background-color: rgba(34, 197, 94, 0.15);
  /* เขียวจาง */
  color: #16a34a;
}

.status-pill.soon {
  background-color: rgba(250, 204, 21, 0.15);
  /* เหลืองจาง */
  color: #ca8a04;
}

.status-pill.closed {
  background-color: rgba(239, 68, 68, 0.15);
  /* แดงจาง */
  color: #dc2626;
}


/* ===== Stage card (พื้นหลังดำ) ===== */
.stage-card {
  background: #000;
  color: #fff;
  border-radius: 14px;
  padding: 16px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, .25);
  align-items: start;
}

.stage {
  scroll-margin-top: 80px;
}

.stage-card.noimg {
  grid-template-columns: 1fr;
}

.seatmap {
  width: 100%;
  height: 170px;
  object-fit: cover;
  border-radius: 8px;
  background: #1f2937;
}

.show-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.show-header .place {
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 18px;
}

.icon-pin {
  width: 22px;
  height: 22px;
  fill: #fff;
}

.icon-close {
  border: none;
  background: none;
  cursor: pointer;
}

.price-line {
  margin-top: 2px;
  color: #fff;
}

.price-label {
  padding-top: 20px;
}


/* Buttons */
.btn.attendee {
  cursor: pointer;
  background: #1d4ed8;
  color: #fff;
  font-weight: 800;
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  box-shadow: 0 8px 18px rgba(29, 78, 216, .35);
}

.btn.attendee .icon-user {
  width: 18px;
  height: 18px;
  fill: #fff;
}

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

/* ===== ตารางรอบ ===== */
.date-table {
  grid-column: 1/-1;
  width: 100%;
  margin-top: 10px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  color: #111;
  box-shadow: 0 8px 18px rgba(0, 0, 0, .18);
}

.table-head {
  display: flex;
  justify-content: space-between;
  background: #6b7280;
  color: #fff;
  padding: 12px 16px;
  font-weight: 800;
}

.table-head .right {
  text-align: right;
}

.session-block {
  background: #fff;
}

.table-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-top: 1px solid #f1f5f9;
}

.date-text {
  font-size: 16px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Buttons */
.btn.attendee {
  cursor: pointer;
  background: #1d4ed8;
  color: #fff;
  font-weight: 800;
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  box-shadow: 0 8px 18px rgba(29, 78, 216, .35);
}

.btn.attendee .icon-user {
  width: 18px;
  height: 18px;
  fill: #fff;
}

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

/* ===== Inline panels ===== */
.inline-panel {
  padding: 12px 16px 18px;
  background: #f9fafb;
  border-top: 1px dashed #e5e7eb;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  color: #111;
}

/* Zone table */
.zone-table {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.zone-table.compact .z-head {
  padding: 10px 12px;
  font-size: 13px;
  background: #f3f4f6;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
}

.zone-table.compact .z-row {
  padding: 10px 12px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.z-name .z-capacity {
  margin-left: 6px;
  color: #64748b;
  font-size: 12px;
}

.z-qty.ok {
  color: #16a34a;
}

.z-qty.low {
  color: #f59e0b;
}

.z-qty.soldout {
  color: #ef4444;
}

.empty-note {
  padding: 12px;
  color: #64748b;
  font-size: 13px;
}

/* Attendees table */
.table.attendees-table {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.t-head {
  display: grid;
  grid-template-columns: 56px 1.1fr 1.4fr .9fr 1fr .6fr .9fr .9fr 1.2fr 1fr;
  background: #f3f4f6;
  font-weight: 700;
  font-size: 13px;
  color: #111;
  padding: 10px 12px;
}

.t-row {
  display: grid;
  grid-template-columns: 56px 1.1fr 1.4fr .9fr 1fr .6fr .9fr .9fr 1.2fr 1fr;
  padding: 12px;
  border-top: 1px solid #f1f5f9;
  align-items: center;
}

.col.no {
  text-align: center;
  color: #475569;
}

.status-chip {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: #fff;
  border: 1.5px solid currentColor;
}

.status-chip.ok {
  color: #16a34a;
}

.status-chip.warn {
  color: #f59e0b;
}

.status-chip.bad {
  color: #ef4444;
}

/* Animations */
.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: max-height .25s ease, opacity .2s ease;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 600px;
  opacity: 1;
}

/* รายละเอียด */
.detail-section {
  margin-top: 18px;
}

.detail-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, .08);
}

.detail-body {
  color: #0f172a;
  font-size: 15.5px;
  line-height: 1.85;
}

.detail-body.plain {
  white-space: pre-line;
}

/* ===== Attendees table (modal) ===== */
.att-table {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

/* ทำหัว/แถวให้เป็นกริดคอลัมน์ */
.att-head,
.att-row {
  display: grid;
  grid-template-columns: 56px 1.1fr 1.4fr .9fr 1.1fr .6fr .9fr .9fr 1.2fr 1fr;
  align-items: center;
  column-gap: 12px;
}

.att-head {
  background: #f3f4f6;
  padding: 10px 12px;
  font-weight: 700;
  font-size: 13px;
  color: #111;
}

.att-row {
  padding: 10px 12px;
  border-top: 1px solid #f1f5f9;
}

/* คอลัมน์พื้นฐาน */
.att-row .col,
.att-head .col {
  min-width: 0;
  /* ให้ text truncate ได้ */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.att-row .no,
.att-head .no {
  text-align: center;
  color: #64748b;
  width: 56px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

/* ป้ายสถานะ */
.status-chip {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: #fff;
  border: 1.5px solid currentColor;
}

.status-chip.ok {
  color: #16a34a;
}

.status-chip.warn {
  color: #f59e0b;
}

.status-chip.bad {
  color: #ef4444;
}

.modal-body .att-table {
  max-height: 54vh;
  overflow: auto;
}


/* Responsive */
@media (max-width:1024px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .stage-card {
    grid-template-columns: 1fr;
  }

  .stage-card .date-table {
    grid-column: 1 / -1;
  }

  .att-head,
  .att-row {
    grid-template-columns: 42px 1fr 1.2fr .9fr 1fr .6fr .9fr .9fr 1.1fr .8fr;
    column-gap: 8px;
  }
}
</style>
