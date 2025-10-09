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

        <div class="info-strip pastel">
          <div class="info-grid">
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
      <!-- ซ้าย: รูปผัง (เฉพาะมีผัง) -->
      <img
        v-if="hasSeatmap"
        :src="event.seatmapUrl"
        alt="Seat map"
        class="seatmap"
        @click="openSeatmap"
      />
      
        <!-- ขวา: ตารางวันที่ -->
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

          <div class="date-table">
            <div class="table-head">
              <div>วันที่แสดง</div>
              <div class="right">เวลา</div>
            </div>

            <div class="table-row">
              <div class="date-text">วันเสาร์ที่ {{ formatThaiDate(event.startDate) }}</div>
              <div class="actions">
                <button class="btn attendee">
                  <svg class="icon-user" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.866 0-7 2.239-7 5v2h14v-2c0-2.761-3.134-5-7-5z"/>
                  </svg>
                  รายชื่อผู้เข้าร่วม
                </button>
                <!-- กดปุ่มเวลาให้เปิดป๊อปอัพกลางจอ -->
                <button class="time-pill" @click="openModal">{{ firstShowtimeText }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Overlay -->
    <transition name="fade">
      <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal"></div>
    </transition>

    <!-- MODAL กลางจอ -->
    <transition name="pop">
      <section
        v-if="modalOpen"
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-label="โซนที่นั่ง"
      >
        <header class="modal-head">
          <h3 class="modal-title">โซนที่นั่ง</h3>
          <button class="icon-close" @click="closeModal" aria-label="ปิด">✕</button>
        </header>

        <div class="modal-body">
          <div class="zone-table compact">
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

    <!-- รายละเอียดด้านล่างหน้า -->
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
  doorOpenTime: ""
});

const modalOpen = ref(false);
const selectedShowId = ref("");
/* ========= รูป fallback ========= */
const fallbackSeatmap = new URL('../assets/seatmap-fallback.png', import.meta.url).href

/* ========= มีผังหรือไม่ ========= */
const hasSeatmap = computed(() =>
  !!event.seatmapUrl  && event.seatmapUrl  !== fallbackSeatmap
)
/* Utils */
function fixThaiBuddhistYear(input){ if(!input)return null; const s=String(input).trim().replace(" ","T"); const m=s.match(/^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2}))?/); if(!m)return s; let y=parseInt(m[1],10); if(y>2400)y-=543; return y.toString().padStart(4,"0")+s.slice(4);}
function toDate(v){ const iso=fixThaiBuddhistYear(v); return iso?new Date(iso):null;}
function hhmm(t){ if(!t)return""; const [h,m]=String(t).split(":"); return `${h.padStart(2,"0")}:${m.padStart(2,"0")}`;}

/* Computed */
const showDateText = computed(()=> event.startDate ? formatThaiDate(event.startDate) : "-");
const doorOpenText = computed(()=> event.doorOpenTime || "-");
const priceTiersText = computed(()=>{
  const uniq=[...new Set((event.zones||[]).map(z=>Number(z.price||0)))].filter(n=>n>0).sort((a,b)=>b-a);
  return uniq.length ? uniq.map(n=>n.toLocaleString()).join(" / ") : "-";
});
const priceLineText = computed(()=> priceTiersText.value==="-" ? "-" : `${priceTiersText.value} บาท`);
const firstShowtimeText = computed(()=> {
  const t = event.sessions?.[0]?.startTime;
  return t ? `${hhmm(t)} น.` : "-";
});
const saleStartText = computed(()=>{
  if(!event.saleStartAt) return "-";
  const start = formatThaiDateTime(event.saleStartAt);
  const until = event.saleUntilSoldout ? " จนกว่าบัตรจะหมด" : (event.saleEndAt ? ` ถึง ${formatThaiDateTime(event.saleEndAt)}` : "");
  return start + until;
});
const priceLegend = computed(()=> priceTiersText.value==="-" ? [] : priceTiersText.value.split("/").map(s=>s.trim()+" บาท"));

/* data for modal */
const zonesForModal = computed(()=> (event.zones||[]).map(z=>({
  id: z.id,
  name: z.name,
  price: Number(z.price || 0),
  remaining: z.remaining ?? z.left ?? 0
})));

/* plain/HTML description check */
const isPlainText = computed(()=>{
  const s=(event.descriptionHtml||"").trim(); if(!s) return true; return !/<[a-z][\s\S]*>/i.test(s);
});

/* Helpers */
function formatThaiDate(d){ const dt=toDate(d); if(!dt) return "-"; return dt.toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric"}); }
function formatThaiDateTime(d){ const dt=toDate(d); if(!dt) return "-"; const dd=dt.toLocaleDateString("th-TH",{day:"numeric",month:"long",year:"numeric"}); const tt=dt.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"}); return `${dd}, ${tt} น.`; }

/* Modal handlers */
function openModal(){ modalOpen.value = true; setTimeout(()=>document.querySelector(".icon-close")?.focus(),0); }
function closeModal(){ modalOpen.value = false; }
function qtyClass(n){ if(n>10) return "ok"; if(n>0) return "warn"; return "zero"; }

/* Load */
function normalizeEvent(api){
  return {
    id: api.id ?? null,
    title: api.title ?? "",
    category: api.category ?? "",
    bannerUrl: api.posterImageUrl ?? "",
    seatmapUrl: api.seatmapImageUrl ?? "",
    venue: api.location ?? "",
    descriptionHtml: api.description ?? "",
    sessions: (api.sessions||[]).sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime))),
    zones: (api.zones||[]).map(z=>({...z, remaining:z.remaining ?? z.left ?? 0})),
    startDate: fixThaiBuddhistYear(api.startDate),
    endDate: fixThaiBuddhistYear(api.endDate),
    saleStartAt: fixThaiBuddhistYear(api.saleStartAt),
    saleEndAt: fixThaiBuddhistYear(api.saleEndAt),
    saleUntilSoldout: !!api.saleUntilSoldout,
    doorOpenTime: api.doorOpenTime ?? ""
  };
}
onMounted(async()=>{
  const id = route.params.id || 1;
  const res = await fetch(`/api/events/${id}`);
  if(!res.ok) return console.error("HTTP", res.status);
  Object.assign(event, normalizeEvent(await res.json()));
  selectedShowId.value = event.sessions?.[0]?.id || "";
});

</script>

<style scoped>
.stage-card {
  background: #000;
  color: #ffffff;
  border-radius: 14px;
  padding: 16px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  box-shadow: 0 10px 24px rgba(0,0,0,.25);
}
/* ===== Stage card (พื้นหลังดำ) ===== */
.stage-card .venue-line {
  color: #fff;                /* ให้ข้อความขาว */
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.stage-card .venue-line .ic {
  fill: #fff;                 /* บังคับให้ SVG icon เป็นขาว */
  width: 20px;
  height: 20px;
}

.stage { 
  scroll-margin-top: 80px; /* ปรับตามความสูง header ถ้ามี */
}

/* ถ้าไม่มีผัง → เป็นคอลัมน์เดียว */
.stage-card.noimg{
  grid-template-columns: 1fr;
}
/* รูปผัง */
.seatmap{
  width:100%; height:170px; object-fit:cover; border-radius:8px; background:#1f2937;
}

/* Page */
.event-detail-page{ padding:20px; background:#f6f8fb; }
.toolbar{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.page-title{ font-size:22px; font-weight:400; color:#5f6063; }

/* HERO */
.hero{ display:grid; grid-template-columns:320px 1fr; background:#fff; border-radius:12px; padding:16px; box-shadow:0 8px 24px rgba(0,0,0,.06); margin-bottom:16px; }
.hero.pastel{ background:linear-gradient(90deg,#20f00d8f 10%, #4cf3ff6a 60%);}
.hero-info{padding-top: 132px;}
.poster{ width:90%; aspect-ratio:420/594; object-fit:cover; background:#eee; border-radius:12px;}
.category{ color:#111; font-weight:700; margin-bottom:4px; }
.event-name{ font-size:26px; font-weight:700; color:#111827; margin:0 0 10px; }
.info-strip.pastel{ background:rgba(255,255,255,.85); border:1px solid #e5e7eb; border-radius:12px; padding:14px; }
.info-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px 18px; }
.info-item{ display:flex; gap:10px; }
.label{ font-size:12px; color:#6b7280; }
.value{ font-weight:600; color:#0f172a; }

/* SHOW CARD (Dark) */
.show-card.dark{ display:grid; grid-template-columns:360px 1fr; gap:16px; background:#0e0e0e; color:#fff; border-radius:16px; padding:18px; box-shadow:0 14px 28px rgba(0,0,0,.35); }
.show-media{ display:flex; justify-content:center; }
.seatmap-wrap{ position:relative; width:100%; max-width:320px; overflow:hidden; border-radius:10px; background:#0f172a; }
.seatmap-img{ width:100%; aspect-ratio:4/3; object-fit:cover; }
.poster-mini{ position:absolute; right:10px; top:10px; width:84px; height:124px; object-fit:cover; border-radius:6px; box-shadow:0 8px 18px rgba(0,0,0,.45); }
.legend-card{ position:absolute; right:10px; bottom:10px; width:100px; background:#fff; color:#111; border-radius:8px; padding:8px; box-shadow:0 8px 22px rgba(0,0,0,.45); }
.legend-title{ font-size:11px; font-weight:800; margin-bottom:6px; }
.legend-line{ font-size:10px; border-bottom:1px dashed #e5e7eb; padding:2px 0; }
.legend-line:last-child{ border-bottom:none; }

.show-content{ display:flex; flex-direction:column; gap:12px; }
.show-header .place{ color:#ffff; display:flex; align-items:center; gap:8px; font-weight:800; font-size:18px; }
.icon-pin{ width:22px; height:22px; fill:#ffff; }
.price-line{ margin-top:2px; color:#ffff; }

/* Date table */
.date-table{ margin-top:6px; background:#fff; border-radius:10px; overflow:hidden; color:#111; }
.table-head{ display:flex; justify-content:space-between; background:#6b7280; color:#fff; padding:12px 16px; font-weight:800; }
.table-head .right{ text-align:right; }
.table-row{ display:flex; justify-content:space-between; align-items:center; padding:14px 16px; background:#fff; }
.date-text{ font-size:16px; }
.actions{ display:flex; align-items:center; gap:12px; }

/* Buttons */
.btn.attendee{ cursor: pointer;background:#1d4ed8; color:#fff; font-weight:800; border:none; border-radius:999px; padding:10px 18px; display:inline-flex; gap:8px; align-items:center; box-shadow:0 8px 18px rgba(29,78,216,.35); }
.btn.attendee .icon-user{ width:18px; height:18px; fill:#fff; }
.time-pill{
  background: linear-gradient(90deg, #ff3d00, #ff6a13);
  color: #fff;
  font-weight: 900;
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(255, 106, 19, .25);
}
/* ===== Modal (กลางจอ) ===== */
.modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:90; }
.modal{
  position:fixed; inset:0; margin:auto;
  width:560px; max-width:92vw; height:auto; max-height:78vh;
  background:#fff; z-index:100; border-radius:12px;
  box-shadow:0 18px 48px rgba(0,0,0,.35);
  display:flex; flex-direction:column;
}
.modal-head{
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 20px; border-bottom:1px solid #e5e7eb;
}
.modal-title{padding-left: 220px; font-weight:800; font-size:16px; }
.icon-close{ border:none; background:transparent; font-size:18px; cursor:pointer; }
.modal-body{ padding:10px 12px 14px; overflow:auto; }

/* Zone table (compact) */
.zone-table{ border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; background:#fff; }
.zone-table.compact .z-head{ padding:8px 10px; font-size:13px; background:#f3f4f6; font-weight:700; display:flex; justify-content:space-between;}
.zone-table.compact .z-row{ padding:8px 10px; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;}
.z-name{ display:flex; flex-direction:column; gap:2px; }
.z-price{ color:#6b7280; font-size:12px; }
.z-qty{ font-weight:800; }
.z-qty.ok{ color:#16a34a; } .z-qty.warn{ color:#f59e0b; } .z-qty.zero{ color:#ef4444; }

/* Transitions */
.pop-enter-from{ transform:scale(.96); opacity:0; }
.pop-enter-to{ transform:scale(1); opacity:1; }
.pop-enter-active{ transition:all .18s ease; }
.pop-leave-from{ transform:scale(1); opacity:1; }
.pop-leave-to{ transform:scale(.96); opacity:0; }
.pop-leave-active{ transition:all .14s ease; }

.fade-enter-from,.fade-leave-to{ opacity:0; }
.fade-enter-to,.fade-leave-from{ opacity:1; }
.fade-enter-active,.fade-leave-active{ transition:opacity .2s ease; }

/* รายละเอียดล่างหน้า */
.detail-section{ margin-top:18px; }
.detail-card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:18px; box-shadow:0 8px 18px rgba(0,0,0,.08); }
.detail-body{ color:#0f172a; font-size:15.5px; line-height:1.85; }
.detail-body.plain{ white-space:pre-line; }

@media (max-width:1024px){
  .hero{ grid-template-columns:1fr; }
  .show-card.dark{ grid-template-columns:1fr; }
}
</style>
