<template>
  <div class="event-detail-page">
    <!-- Top toolbar -->
    <header class="toolbar">
      <div class="page-title">Event details</div>
    </header>

    <!-- HERO (พาสเทล) -->
    <section class="hero pastel">
      <img class="poster" :src="event.bannerUrl" alt="Event Banner" />

      <div class="hero-info">
        <div class="category">{{ event.category || 'คอนเสิร์ต' }}</div>
        <h1 class="event-name">{{ event.title }}</h1>

        <!-- แผงรายละเอียดหลัก -->
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
                <div class="value">{{ event.venue }}</div>
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
    <section class="show-section">
      <h2 class="section-title">ผังการแสดง & รอบการแสดง</h2>

      <div class="show-card">
        <div class="show-card-head">
          <div class="place">
            <span class="place-dot">📍</span>
            {{ event.venue }}
          </div>
          <div class="price-line">ราคาบัตร {{ priceTiersText }}</div>
        </div>

        <div class="show-card-body">
          <div class="date-bar">
            <div class="date-chip">
              <span>วันเสาร์ที่</span>
              <strong>{{ formatThaiDate(event.startDate) }}</strong>
            </div>
            <div class="grow"></div>
            <button class="btn attendee">รายชื่อผู้เข้าร่วม</button>
            <span class="time-chip">{{ doorOpenText }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- รายละเอียด -->
    <section class="description">
      <h2 class="section-title">รายละเอียด</h2>
      <div class="desc" v-html="event.descriptionHtml"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const event = reactive({
  id: null,
  title: "",
  category: "",
  bannerUrl: "",
  seatmapUrl: "",
  venue: "",
  descriptionHtml: "",
  showtimes: [],          // [{ id, label, startTime }]
  zonesByShow: {},
  startDate: null,
  endDate: null,
  saleStartAt: null,
  saleEndAt: null,
  saleUntilSoldout: false,
  doorOpenTime: ""        // "17:00" หรือ "ก่อนเริ่มงาน 1 ชม." / "ก่อนเริ่มงาน 30 นาที"
});

const selectedShowId = ref("");
const zonesRef = ref(null);

/* ---- พ.ศ. -> ค.ศ. ---- */
function fixThaiBuddhistYear(input) {
  if (!input) return null;
  let s = String(input).trim().replace(" ", "T");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return s;
  let year = parseInt(m[1], 10);
  if (year > 2400) year -= 543;
  return year.toString().padStart(4, "0") + s.slice(4);
}
function toDate(value) {
  const iso = fixThaiBuddhistYear(value);
  return iso ? new Date(iso) : null;
}

/* ---- Door open rules ---- */
function parseDoorOpenRule(val) {
  if (!val) return { type: "none" };
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return { type: "absolute", time: `${m[1].padStart(2,"0")}:${m[2]}` };
  const h = s.match(/^ก่อนเริ่มงาน\s*(\d+)\s*ชม\.?$/);
  if (h) return { type: "offset", minutes: Number(h[1]) * 60 };
  const n = s.match(/^ก่อนเริ่มงาน\s*(\d+)\s*นาที$/);
  if (n) return { type: "offset", minutes: Number(n[1]) };
  return { type: "text", text: s };
}
function minusMinutes(hhmmStr, minutes) {
  if (!hhmmStr) return "";
  const [H, M] = hhmmStr.split(":").map((x) => parseInt(x, 10));
  let total = H * 60 + M - (minutes || 0);
  total = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/* ---- Computed ---- */
const selectedShowtime = computed(() =>
  event.showtimes.find((s) => s.id === selectedShowId.value)
);

const showDateText = computed(() => {
  if (!event.startDate) return "-";
  const s = formatThaiDate(event.startDate);
  if (!event.endDate || event.endDate === event.startDate) return s;
  return `${s} – ${formatThaiDate(event.endDate)}`;
});

const saleStartText = computed(() => {
  if (!event.saleStartAt) return "-";
  const start = formatThaiDateTime(event.saleStartAt);
  const until = event.saleUntilSoldout
    ? " จนกว่าบัตรจะหมด"
    : (event.saleEndAt ? ` ถึง ${formatThaiDateTime(event.saleEndAt)}` : "");
  return start + until;
});

const doorOpenText = computed(() => {
  const raw = event.doorOpenTime;
  if (!raw) return "-";
  const rule = parseDoorOpenRule(raw);
  if (rule.type === "absolute") return `${rule.time} น.`;
  if (rule.type === "text") return rule.text;
  if (rule.type === "offset") {
    const start = selectedShowtime.value?.startTime || event.showtimes?.[0]?.startTime || "";
    if (!start) {
      const mins = rule.minutes;
      return mins % 60 === 0 ? `ก่อนเริ่มงาน ${mins / 60} ชม.` : `ก่อนเริ่มงาน ${mins} นาที`;
    }
    const open = minusMinutes(start, rule.minutes);
    return `${open} น.`;
  }
  return "-";
});

const priceTiersText = computed(() => {
  const all = Object.values(event.zonesByShow).flat();
  if (!all.length) return "-";
  const uniq = [...new Set(all.map(z => Number(z.price || 0)))]
    .filter(n => n > 0)
    .sort((a,b)=>b-a);
  return uniq.map(n => n.toLocaleString()).join(" / ");
});

/* ---- UI helpers ---- */
function fmtPrice(n) { return (n ?? 0).toLocaleString(); }
function scrollToZones() { zonesRef.value?.scrollIntoView({ behavior: "smooth" }); }
function book(zone) { router.push({ path: "/checkout", query: { eventId: event.id, showId: selectedShowId.value, zoneId: zone.id }}); }

function formatThaiDate(d) {
  const dt = toDate(d);
  if (!dt) return "-";
  return dt.toLocaleDateString("th-TH", { day:"numeric", month:"long", year:"numeric" });
}
function formatThaiDateTime(d) {
  const dt = toDate(d);
  if (!dt) return "-";
  const dd = dt.toLocaleDateString("th-TH", { day:"numeric", month:"long", year:"numeric" });
  const tt = dt.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit" });
  return `${dd}, ${tt} น.`;
}
function hhmm(timeStr) {
  if (!timeStr) return "";
  const [h,m] = String(timeStr).split(":");
  return `${h.padStart(2,"0")}:${m.padStart(2,"0")}`;
}

/* ---- Normalize API ---- */
function buildShowLabel(name, time) {
  const text = hhmm(time || "") || "-";
  return name ? `${name} • ${text}` : text;
}
function normalizeEvent(api) {
  const showtimes = (api.sessions || [])
    .sort((a,b) => (a.startTime || "").localeCompare(b.startTime || ""))
    .map(s => ({ id: s.id, label: buildShowLabel(s.name, s.startTime), startTime: s.startTime || "" }));

  const zones = (api.zones || []).map(z => ({
    id: z.id, name: z.name, price: Number(z.price ?? 0), status: "available",
  }));
  const zonesByShow = {};
  for (const s of showtimes) zonesByShow[s.id] = zones;

  return {
    id: api.id ?? null,
    title: api.title ?? "",
    category: api.category ?? "",
    bannerUrl: api.posterImageUrl ?? "",
    seatmapUrl: api.seatmapImageUrl ?? "",
    venue: api.location ?? "",
    descriptionHtml: api.description ?? "",
    showtimes, zonesByShow,
    startDate: fixThaiBuddhistYear(api.startDate),
    endDate: fixThaiBuddhistYear(api.endDate),
    saleStartAt: fixThaiBuddhistYear(api.saleStartAt),
    saleEndAt: fixThaiBuddhistYear(api.saleEndAt),
    saleUntilSoldout: !!api.saleUntilSoldout,
    doorOpenTime: api.doorOpenTime ?? ""
  };
}

/* ---- Fetch ---- */
onMounted(async () => {
  const id = route.params.id || 1;
  const res = await fetch(`/api/events/${id}`);
  if (!res.ok) { console.error("HTTP", res.status); return; }
  const data = await res.json();
  Object.assign(event, normalizeEvent(data));
  selectedShowId.value = event.showtimes?.[0]?.id || "";
});
</script>

<style scoped>
.event-detail-page{ padding:20px; background:#f6f8fb; }

/* Toolbar + Page title */
.toolbar{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.page-title{ font-size:22px; font-weight:400; color:#5f6063; margin:0; letter-spacing:.2px; }

/* HERO */
.hero{
  display:grid; grid-template-columns:320px 1fr; gap:20px;
  background:#fff; border-radius:12px; padding:16px; box-shadow:0 8px 24px rgba(0,0,0,.06);
  margin-bottom:16px;
}
.hero.pastel{ background: linear-gradient(90deg,#e6fff4 0%, #e3f6ff 100%); }

/* Poster (A2, ขอบตรง) */
.poster{
  width:100%; aspect-ratio:420/594; object-fit:cover; border-radius:0 !important; background:#eee;
}

/* Headings in hero */
.category{ color:#6b7280; font-weight:700; margin-bottom:4px; }
.event-name{ margin:0 0 10px; font-size:26px; font-weight:700; color:#111827; }

/* Pastel info strip */
.info-strip.pastel{
  background: rgba(255,255,255,.85);
  border:1px solid #e5e7eb;
  border-radius:12px;
  padding:14px;
  backdrop-filter: blur(2px);
}
.info-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px 18px; }
.info-item{ display:flex; gap:10px; align-items:flex-start; }
.icon{ width:24px; height:24px; display:flex; align-items:center; justify-content:center; }
.label{ font-size:12px; color:#6b7280; }
.value{ font-weight:600; color:#0f172a; }

/* Section title */
.section-title{ font-size:18px; font-weight:700; color:#0f172a; margin:10px 0 10px; }

/* Show card */
.show-card{
  background:#fff; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 8px 20px rgba(0,0,0,.06);
  overflow:hidden;
}
.show-card-head{ padding:12px 14px; }
.place{ font-weight:700; color:#0f172a; display:flex; align-items:center; gap:8px; }
.place-dot{ font-size:16px; }
.price-line{ color:#111827; margin-top:4px; font-size:14px; }

/* Date bar */
.show-card-body{ padding:0 14px 14px; }
.date-bar{
  margin-top:8px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:8px;
  display:flex; align-items:center; gap:10px; padding:8px 10px;
}
.date-chip{ background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:6px 10px; font-size:14px; }
.date-chip strong{ font-weight:700; }
.grow{ flex:1; }

/* Buttons & chips */
.btn{ border:none; border-radius:10px; padding:10px 14px; cursor:pointer; }
.btn.attendee{ background:#2563eb; color:#fff; font-weight:600; }
.time-chip{ background:#ef4444; color:#fff; font-weight:700; border-radius:999px; padding:6px 12px; }

/* Description card */
.description{
  background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px;
  box-shadow:0 8px 20px rgba(0,0,0,.06); margin-top:12px;
}
.desc{ color:#111827; line-height:1.6; }

/* Responsive */
@media (max-width:1024px){
  .hero{ grid-template-columns:1fr; }
  .info-grid{ grid-template-columns:1fr; }
}
</style>
