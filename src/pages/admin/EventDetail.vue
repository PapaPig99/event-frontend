<template>
  <div class="event-detail-page" @keyup.esc="closeModal" tabindex="0">
    <!-- Top toolbar -->
    <header class="toolbar">
      <div class="page-title">Event details</div>
    </header>

    <!-- HERO -->
    <section class="hero pastel">
      <img class="poster" :src="event.bannerUrl" alt="Event Banner" />

      <div class="hero-info">
        <div class="category">{{ event.category || 'คอนเสิร์ต' }}</div>
        <h1 class="event-name">{{ event.title }}</h1>

        <!-- Facts -->
        <div class="info-strip pastel">
          <div class="info-grid">
            <!-- Ticket Status -->
            <div class="info-item status">
              <div class="icon">🎟️</div>
              <div class="status-wrap">
                <div class="label">Ticket Status</div>
                <div class="value">
                  <span class="status-pill" :class="tsClass">{{ tsText }}</span>
                </div>
              </div>
            </div>

            <div class="info-item">
              <div class="icon">📅</div>
              <div>
                <div class="label">วันแสดง</div>
                <div class="value">{{ showDateText }}</div>
              </div>
            </div>

            <div class="info-item">
              <div class="icon">📍</div>
              <div>
                <div class="label">สถานที่แสดง</div>
                <div class="value">{{ event.venue || '-' }}</div>
              </div>
            </div>

            <div class="info-item">
              <div class="icon">⏰</div>
              <div>
                <div class="label">ประตูเปิด</div>
                <div class="value">{{ doorOpenText }}</div>
              </div>
            </div>

            <div class="info-item">
              <div class="icon">💳</div>
              <div>
                <div class="label">ราคาบัตร</div>
                <div class="value">{{ priceTiersText }}</div>
              </div>
            </div>

            <div class="info-item">
              <div class="icon">🛒</div>
              <div>
                <div class="label">วันเปิดจำหน่าย</div>
                <div class="value">{{ saleStartText }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ผังการแสดง & รอบการแสดง -->
    <section class="stage" ref="stageSection" id="stage-section">
      <h2 class="section-title">ผังการแสดง & รอบการแสดง</h2>

      <div class="stage-card" :class="{ 'noimg': !hasSeatmap }">
        <!-- ซ้าย: รูปผัง -->
        <img
          v-if="hasSeatmap"
          :src="event.seatmapUrl"
          alt="Seat map"
          class="seatmap"
          @click="openSeatmap"
        />

        <!-- ขวา -->
        <div class="show-content">
          <div class="show-header">
            <div class="place">
              <svg class="icon-pin" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C8.686 2 6 4.686 6 8c0 4.418 6 12 6 12s6-7.582 6-12c0-3.314-2.686-6-6-6zm0 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
              </svg>
              {{ event.venue || '-' }}
            </div>
            <div class="price-line">ราคาบัตร {{ priceLineText }}</div>
          </div>
        </div>

        <!-- แถวล่าง: ตารางวันที่/เวลา (หลาย session) -->
        <div class="date-table">
          <div class="table-head">
            <div>วันที่แสดง</div>
            <div class="right">เวลา</div>
          </div>

          <div
            class="table-row"
            v-for="s in sessionsSorted"
            :key="s.id || s._idx"
          >
            <div class="date-text">
              {{ 'วัน' + weekdayTH(sessionDateObj(s)) + 'ที่ ' + formatThaiDate(sessionDateObj(s)) }}
            </div>
            <div class="actions">
              <button class="btn attendee">
                <svg class="icon-user" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.866 0-7 2.239-7 5v2h14v-2c0-2.761-3.134-5-7-5z"/>
                </svg>
                รายชื่อผู้เข้าร่วม
              </button>
              <button class="time-pill" @click="openModalFor(s)">
                {{ hhmm(sessionTime(s)) }} น.
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Overlay -->
    <transition name="fade">
      <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal"></div>
    </transition>

    <!-- MODAL -->
    <transition name="pop">
      <section v-if="modalOpen" class="modal" role="dialog" aria-modal="true" aria-label="โซนที่นั่ง">
        <header class="modal-head">
          <h3 class="modal-title">โซนที่นั่ง</h3>
          <button class="icon-close" @click="closeModal" aria-label="ปิด">✕</button>
        </header>

        <div class="modal-body">
          <div v-if="loadingAvail" class="loading">กำลังโหลด...</div>
          <div v-else-if="availError" class="error">โหลดไม่สำเร็จ: {{ availError }}</div>

          <div class="zone-table compact" v-else>
            <div class="z-head">
              <div>โซน</div>
              <div class="right">คงเหลือ</div>
            </div>
            <div class="z-row" v-for="z in zonesForModal" :key="z.id">
              <div class="z-name">
                {{ z.name }}
                <span class="z-price">฿{{ z.price.toLocaleString() }}</span>
              </div>
              <div class="z-qty" :class="qtyClass(z.remaining)">{{ z.remaining }}</div>
            </div>
          </div>
        </div>
      </section>
    </transition>

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
});

const modalOpen = ref(false);
const selectedShowId = ref("");
const zonesAvail = ref([]);
const loadingAvail = ref(false);
const availError = ref("");

/* ================== UTILS ================== */
function toBool(v){ if(typeof v==="boolean") return v; if(typeof v==="number") return v===1; if(v==null) return false; const s=String(v).trim().toLowerCase(); return ["true","1","yes","y","on","enabled","enable"].includes(s); }
function statusToPublished(api){
  if (toBool(api?.isPublished) || toBool(api?.isActive) || toBool(api?.published) || toBool(api?.enabled)) return true;
  const s = String(api?.status ?? "").trim().toLowerCase();
  if (["published","active","enabled","เปิดใช้งาน","เผยแพร่"].includes(s)) return true;
  if (["disabled","inactive","draft","ปิดใช้งาน"].includes(s)) return false;
  return true;
}
function fixBuddhistYear(y){ return y>2400? y-543 : y; }
function toDateSmart(input){
  if(!input) return null; const raw=String(input).trim();
  let m = raw.replace(" ","T").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if(m){ const Y=fixBuddhistYear(+m[1]); const iso=`${String(Y).padStart(4,"0")}-${m[2]}-${m[3]}${m[4]?`T${m[4]}:${m[5]}`:""}`; const d=new Date(iso); return isNaN(d)?null:d; }
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?$/i);
  if(m){ const MM=+m[1],DD=+m[2],Y=fixBuddhistYear(+m[3]); let hh=m[4]?+m[4]:0, mm=m[5]?+m[5]:0, ap=(m[6]||"").toUpperCase(); if(ap==="PM"&&hh<12) hh+=12; if(ap==="AM"&&hh===12) hh=0; const d=new Date(Y,MM-1,DD,hh,mm,0); return isNaN(d)?null:d; }
  const d=new Date(raw); return isNaN(d)?null:d;
}
function fixThaiBuddhistYear(input){
  if(!input) return null; const s=String(input).trim(); const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return s; const y=fixBuddhistYear(+m[1]); return `${String(y).padStart(4,"0")}${s.slice(4)}`;
}
function toDate(v){ const iso=fixThaiBuddhistYear(v); return toDateSmart(iso); }
function formatThaiDate(d){ const dt=toDate(d); if(!dt) return "-"; return dt.toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric"}); }
function formatThaiDateTime(d){ const dt=toDate(d); if(!dt) return "-"; const dd=dt.toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric"}); const tt=dt.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"}); return `${dd}, ${tt} น.`; }
function hhmm(t){ if(!t)return""; const [h,m]=String(t||"").split(":"); return h?`${h.padStart(2,"0")}:${(m||"0").padStart(2,"0")}`:"-"; }
function weekdayTH(d){ if(!d) return ""; return d.toLocaleDateString("th-TH",{ weekday:"long" }); }

/* ================== DERIVED ================== */
const fallbackSeatmap = new URL('../assets/seatmap-fallback.png', import.meta.url).href;
const hasSeatmap = computed(() => !!event.seatmapUrl && event.seatmapUrl !== fallbackSeatmap);

const showDateText = computed(()=> event.startDate ? formatThaiDate(event.startDate) : "-");
const doorOpenText = computed(()=> event.doorOpenTime || "-");
const priceTiersText = computed(()=>{
  const uniq=[...new Set((event.zones||[]).map(z=>Number(z.price||0)))].filter(n=>n>0).sort((a,b)=>b-a);
  return uniq.length ? uniq.map(n=>n.toLocaleString()).join(" / ") : "-";
});
const priceLineText = computed(()=> priceTiersText.value==="-" ? "-" : `${priceTiersText.value} บาท`);
const saleStartText = computed(()=>{
  if(!event.saleStartAt) return "-";
  const start = formatThaiDateTime(event.saleStartAt);
  const until = event.saleUntilSoldout ? " จนกว่าบัตรจะหมด" : (event.saleEndAt ? ` ถึง ${formatThaiDateTime(event.saleEndAt)}` : "");
  return start + until;
});

/* ===== Sessions helpers (หลายรอบ) ===== */
function sessionDateObj(s){ return toDate(s?.startDate || s?.date || s?.showDate || event.startDate); }
function sessionTime(s){ return s?.startTime || s?.time || s?.showTime || ""; }
const sessionsSorted = computed(()=>{
  return (event.sessions || [])
    .map((s, i)=>({ ...s, _idx:i }))
    .sort((a,b)=>{
      const da = sessionDateObj(a)?.getTime() ?? 0;
      const db = sessionDateObj(b)?.getTime() ?? 0;
      if (da !== db) return da - db;
      return String(sessionTime(a)).localeCompare(String(sessionTime(b)));
    });
});

/* ===== Ticket Status ===== */
const nowMs = () => Date.now();
const saleStartMs = computed(()=> toDate(event.saleStartAt)?.getTime() ?? null);
const saleEndMs   = computed(()=> toDate(event.saleEndAt)?.getTime() ?? null);
const ticketStatus = computed(()=>{
  if (!event.isPublished) return "closed";
  if (saleStartMs.value && nowMs() < saleStartMs.value) return "soon";
  if (saleEndMs.value && nowMs() > saleEndMs.value) return "closed";
  if (!saleStartMs.value) return "soon";
  return "open";
});
const tsText = computed(()=>{
  if (ticketStatus.value === "open") return "เปิดให้ซื้อตั๋วแล้ว";
  if (ticketStatus.value === "soon") return "เร็วๆ นี้";
  return "ปิดการขาย";
});
const tsClass = computed(()=>({
  open:   ticketStatus.value === "open",
  soon:   ticketStatus.value === "soon",
  closed: ticketStatus.value === "closed",
}));

/* ===== Modal & availability ===== */
async function loadAvailability(sessionId){
  if(!sessionId) return;
  loadingAvail.value = true; availError.value = "";
  try{
    const res = await fetch(`/api/zones/session/${sessionId}/availability`);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    zonesAvail.value = await res.json();
  }catch(e){
    availError.value = String(e); zonesAvail.value = [];
  }finally{
    loadingAvail.value = false;
  }
}
function openSeatmap(){ if(event.seatmapUrl) window.open(event.seatmapUrl, "_blank"); }
async function openModalFor(s){
  selectedShowId.value = s?.id || "";
  modalOpen.value = true;
  await loadAvailability(selectedShowId.value);
  setTimeout(()=>document.querySelector(".icon-close")?.focus(),0);
}
function closeModal(){ modalOpen.value = false; }
function qtyClass(n){ if(n>10) return "ok"; if(n>0) return "warn"; return "zero"; }

const zonesForModal = computed(()=>{
  const availById = new Map((zonesAvail.value || []).map(a => [a.zoneId, a]));
  return (event.zones || []).map(z=>{
    const a = availById.get(z.id);
    return { id:z.id, name:z.name, price:Number(z.price ?? 0), remaining:Number(a?.available ?? z.remaining ?? 0) };
  });
});

const isPlainText = computed(()=>{
  const s=(event.descriptionHtml||"").trim(); if(!s) return true; return !/<[a-z][\s\S]*>/i.test(s);
});

/* ===== Fetch event ===== */
function normalizeEvent(api){
  return {
    id: api.id ?? null,
    title: api.title ?? "",
    category: api.category ?? "",
    bannerUrl: api.posterImageUrl ?? api.detailImageUrl ?? "",
    seatmapUrl: api.seatmapImageUrl ?? "",
    venue: api.location ?? "",
    descriptionHtml: api.description ?? "",
    sessions: (api.sessions||[]),
    zones: (api.zones||[]),
    startDate: fixThaiBuddhistYear(api.startDate),
    endDate: fixThaiBuddhistYear(api.endDate),
    saleStartAt: api.saleStartAt ?? api.salesStartAt ?? api.openSaleAt ?? null,
    saleEndAt:   api.saleEndAt   ?? api.salesEndAt   ?? api.closeSaleAt ?? null,
    saleUntilSoldout: !!api.saleUntilSoldout,
    doorOpenTime: api.doorOpenTime ?? "",
    isPublished: statusToPublished(api),
  };
}
onMounted(async()=>{
  const id = route.params.id || 1;
  const res = await fetch(`/api/events/${id}`);
  if(!res.ok){ console.error("HTTP", res.status); return; }
  Object.assign(event, normalizeEvent(await res.json()));
  selectedShowId.value = sessionsSorted.value?.[0]?.id || "";
});
</script>

<style scoped>
/* ===== Page ===== */
.event-detail-page{ padding:20px; background:#f6f8fb; }
.toolbar{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.page-title{ font-size:22px; font-weight:400; color:#5f6063; }

/* ===== HERO ===== */
.hero{
  display:grid;
  grid-template-columns:320px 1fr;
  background: transparent;
  box-shadow: none;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.hero.pastel{ background: linear-gradient(90deg,#20f00d8f 10%, #4cf3ff6a 60%); }
.hero-info{ padding-top: 132px; }
.poster{ width:90%; aspect-ratio:420/594; object-fit:cover; background:#eee; border-radius:0; }
.category{ color:#111; font-weight:700; margin-bottom:4px; }
.event-name{ font-size:26px; font-weight:700; color:#111827; margin:0 0 10px; }

/* Info strip */
.info-strip.pastel{ background: transparent; border: 0; box-shadow: none; padding: 0; }
.info-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px 18px; }
.info-item{ display:flex; gap:10px; }
.label{ font-size:12px; color:rgba(15,23,42,.66); }
.value{ font-weight:700; color:#0f172a; }

/* Ticket Status pill */
.info-item.status .status-wrap{ display:flex; flex-direction:column; gap:2px; }
.status-pill{ display:inline-block; padding:6px 12px; border-radius:999px; background:#fff; font-weight:900; line-height:1; box-shadow:0 1px 0 rgba(0,0,0,.04); }
.status-pill.open{  color:#16a34a; }
.status-pill.soon{  color:#ff6a13; }
.status-pill.closed{color:#ef4444; }

/* ===== Stage card (พื้นหลังดำ) ===== */
.stage-card{
  background:#000; color:#fff; border-radius:14px; padding:16px;
  display:grid; grid-template-columns:280px 1fr; gap:20px;
  box-shadow:0 10px 24px rgba(0,0,0,.25); align-items:start;
}
.stage{ scroll-margin-top:80px; }
.stage-card.noimg{ grid-template-columns:1fr; }

.seatmap{ width:100%; height:170px; object-fit:cover; border-radius:8px; background:#1f2937; }
.show-content{ display:flex; flex-direction:column; gap:12px; }
.show-header .place{ color:#fff; display:flex; align-items:center; gap:8px; font-weight:800; font-size:18px; }
.icon-pin{ width:22px; height:22px; fill:#fff; }
.price-line{ margin-top:2px; color:#fff; }

/* ===== ตารางรอบ: เอากรอบขาวเทากลับมา ===== */
.stage-card .date-table{
  grid-column:1 / -1; width:100%; margin-top:10px;
  background:#fff;              /* ขาว */
  border:1px solid #e5e7eb;     /* เทาอ่อน */
  border-radius:10px;
  overflow:hidden;
  color:#111;                   /* ตัวอักษรเข้ม */
  box-shadow:0 8px 18px rgba(0,0,0,.18);
}
.table-head{
  display:flex; justify-content:space-between;
  background:#6b7280;           /* เทาหัวตาราง */
  color:#fff; padding:12px 16px; font-weight:800;
}
.table-head .right{ text-align:right; }
.table-row{
  display:flex; justify-content:space-between; align-items:center;
  padding:14px 16px; background:#fff; border-top:1px solid #f1f5f9;
}
.date-text{ font-size:16px; }
.actions{ display:flex; align-items:center; gap:12px; }

/* Buttons */
.btn.attendee{
  cursor:pointer; background:#1d4ed8; color:#fff; font-weight:800;
  border:none; border-radius:999px; padding:10px 18px;
  display:inline-flex; gap:8px; align-items:center;
  box-shadow:0 8px 18px rgba(29,78,216,.35);
}
.btn.attendee .icon-user{ width:18px; height:18px; fill:#fff; }
.time-pill{
  background:linear-gradient(90deg,#ff3d00,#ff6a13); color:#fff; font-weight:900;
  border:none; border-radius:999px; padding:10px 18px; cursor:pointer;
  box-shadow:0 6px 14px rgba(255,106,19,.25);
}

/* Modal */
.modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:90; }
.modal{ position:fixed; inset:0; margin:auto; width:560px; max-width:92vw; height:auto; max-height:78vh; background:#fff; z-index:100; border-radius:12px; box-shadow:0 18px 48px rgba(0,0,0,.35); display:flex; flex-direction:column; }
.modal-head{ display:flex; align-items:center; justify-content:space-between; padding:12px 20px; border-bottom:1px solid #e5e7eb; }
.modal-title{ font-weight:800; font-size:16px; }
.icon-close{ border:none; background:transparent; font-size:18px; cursor:pointer; }
.modal-body{ padding:10px 12px 14px; overflow:auto; }
.loading{ padding:8px 0; }
.error{ color:#ef4444; padding:8px 0; }

/* Zone table */
.zone-table{ border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; background:#fff; }
.zone-table.compact .z-head{ padding:8px 10px; font-size:13px; background:#f3f4f6; font-weight:700; display:flex; justify-content:space-between; }
.zone-table.compact .z-row{ padding:8px 10px; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; }
.z-name{ display:flex; flex-direction:column; gap:2px; }
.z-price{ color:#6b7280; font-size:12px; }
.z-qty{ font-weight:800; }
.z-qty.ok{ color:#16a34a; } .z-qty.warn{ color:#f59e0b; } .z-qty.zero{ color:#ef4444; }

/* รายละเอียด */
.detail-section{ margin-top:18px; }
.detail-card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:18px; box-shadow:0 8px 18px rgba(0,0,0,.08); }
.detail-body{ color:#0f172a; font-size:15.5px; line-height:1.85; }
.detail-body.plain{ white-space:pre-line; }

/* Responsive */
@media (max-width:1024px){
  .hero{ grid-template-columns:1fr; }
  .stage-card{ grid-template-columns: 1fr; }
  .stage-card .date-table{ grid-column: 1 / -1; }
}
</style>
