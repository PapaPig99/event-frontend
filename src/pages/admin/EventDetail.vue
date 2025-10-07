<template>
  <div class="event-detail-page">
    <!-- Top toolbar -->
    <header class="toolbar">
      <div class="title">Event details</div>
    </header>

    <!-- HERO -->
    <section class="hero">
      <img class="poster" :src="event.bannerUrl" alt="Event Banner" />
      <div class="hero-info">
        <div class="category">{{ event.category || 'concert' }}</div>
        <h1 class="event-name">{{ event.title }}</h1>

        <!-- แผงรายละเอียด -->
        <div class="info-strip">
          <div class="info-grid">
            <div class="info-item">
              <div class="icon">📅</div>
              <div>
                <div class="label">วันแสดง</div>
                <div class="value">{{ showDateText }}</div>
              </div>
            </div>

            <div class="info-item">
              <div class="icon">🛒</div>
              <div>
                <div class="label">วันเปิดจำหน่าย</div>
                <div class="value">{{ saleStartText }}</div>
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
              <div class="icon">💸</div>
              <div>
                <div class="label">ราคาบัตร</div>
                <div class="value">{{ priceTiersText }}</div>
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
              <div class="icon">🎫</div>
              <div>
                <div class="label">Ticket Status</div>
                <div class="value">
                  <span :class="['ticket-pill', ticketStatusClass]">
                    {{ ticketStatusText }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- เลือกรอบ & ปุ่ม -->
          <div class="strip-actions">
            <span class="strip-venue">{{ event.venue }}</span>
            <div class="action-row">
              <select v-model="selectedShowId" class="select">
                <option disabled value="">เลือกวันที่แสดง</option>
                <option v-for="s in event.showtimes" :key="s.id" :value="s.id">
                  {{ s.label }}
                </option>
              </select>
              <button
                class="btn primary"
                :disabled="!selectedShowId"
                @click="scrollToZones"
              >
                ดูผังที่นั่ง
              </button>
            </div>
            <div v-if="selectedShowtime" class="show-chip">
              {{ selectedShowtime.label }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Zone table -->
    <section ref="zonesRef" class="zone-box">
      <h2>ผังที่นั่ง & โซนราคา</h2>
      <table>
        <thead>
          <tr>
            <th>โซน</th>
            <th>ราคา (บาท)</th>
            <th>สถานะ</th>
            <th>จอง</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="z in zonesForSelectedShow" :key="z.id">
            <td class="zone-name">{{ z.name }}</td>
            <td>{{ fmtPrice(z.price) }}</td>
            <td>
              <span class="pill" :class="statusClass(z.status)">
                {{ statusText(z.status) }}
              </span>
            </td>
            <td>
              <button
                class="btn"
                :disabled="z.status === 'soldout'"
                @click="book(z)"
              >
                จองบัตร
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Description -->
    <section class="description">
      <h2>รายละเอียดการแสดง</h2>
      <div class="desc" v-html="event.descriptionHtml"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

/* =========================
   State
========================= */
const event = reactive({
  id: null,
  title: "",
  category: "",
  bannerUrl: "",
  seatmapUrl: "",
  venue: "",
  descriptionHtml: "",
  showtimes: [],
  zonesByShow: {},
  startDate: null,
  endDate: null,
  saleStartAt: null,
  saleEndAt: null,
  saleUntilSoldout: false,
  doorOpenTime: ""
});

const selectedShowId = ref("");
const zonesRef = ref(null);

/* =========================
   Helpers: แก้ปี พ.ศ. → ค.ศ.
========================= */
function fixThaiBuddhistYear(input) {
  if (!input) return null;
  // รองรับ "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm:ss"
  let s = String(input).trim().replace(' ', 'T');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return s; // รูปแบบอื่นปล่อยผ่าน
  let year = parseInt(m[1], 10);
  if (year > 2400) year -= 543; // ถ้าเป็น พ.ศ. ให้ลบ 543
  return year.toString().padStart(4, '0') + s.slice(4);
}
function toDate(value) {
  const iso = fixThaiBuddhistYear(value);
  return iso ? new Date(iso) : null;
}

/* =========================
   Computed
========================= */
const selectedShowtime = computed(() =>
  event.showtimes.find((s) => s.id === selectedShowId.value)
);

const zonesForSelectedShow = computed(() =>
  event.zonesByShow[selectedShowId.value] || []
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
  if (!event.doorOpenTime) return "-";
  return hhmm(event.doorOpenTime) + " น.";
});

const priceTiersText = computed(() => {
  const all = Object.values(event.zonesByShow).flat();
  if (!all.length) return "-";
  const uniq = [...new Set(all.map(z => Number(z.price || 0)))]
    .filter(n => n > 0)
    .sort((a,b)=>b-a);
  return uniq.map(n => n.toLocaleString()).join(" / ");
});

const ticketStatusText = computed(() => {
  const now = new Date();
  const start = toDate(event.saleStartAt);
  const end = toDate(event.saleEndAt);
  if (start && now < start) return "ยังไม่เปิดขาย";
  if (end && now > end && !event.saleUntilSoldout) return "ปิดจำหน่าย";
  return "เปิดให้ซื้อตั๋วนี้";
});
const ticketStatusClass = computed(() => {
  const t = ticketStatusText.value;
  if (t.includes("ยังไม่")) return "status-pending";
  if (t.includes("ปิด")) return "status-closed";
  return "status-open";
});

/* =========================
   UI helpers
========================= */
function fmtPrice(n) { return (n ?? 0).toLocaleString(); }
function statusText(s) {
  if (s === "available") return "ว่าง";
  if (s === "few") return "เหลือน้อย";
  if (s === "soldout") return "เต็มแล้ว";
  return "-";
}
function statusClass(s) {
  return { available: s === "available", few: s === "few", soldout: s === "soldout" };
}
function scrollToZones() { zonesRef.value?.scrollIntoView({ behavior: "smooth" }); }
function book(zone) {
  router.push({ path: "/checkout", query: { eventId: event.id, showId: selectedShowId.value, zoneId: zone.id }});
}

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

/* =========================
   Normalize (ใช้ API เดิม)
========================= */
function buildShowLabel(name, time) {
  const text = hhmm(time || "") || "-";
  return name ? `${name} • ${text}` : text;
}
function normalizeEvent(api) {
  const showtimes = (api.sessions || [])
    .sort((a,b) => (a.startTime || "").localeCompare(b.startTime || ""))
    .map(s => ({ id: s.id, label: buildShowLabel(s.name, s.startTime) }));

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

    // ✅ แปลงปี พ.ศ. → ค.ศ. ตั้งแต่ตอนรับ
    startDate: fixThaiBuddhistYear(api.startDate),
    endDate: fixThaiBuddhistYear(api.endDate),
    saleStartAt: fixThaiBuddhistYear(api.saleStartAt),
    saleEndAt: fixThaiBuddhistYear(api.saleEndAt),
    saleUntilSoldout: !!api.saleUntilSoldout,
    doorOpenTime: api.doorOpenTime ?? ""
  };
}

/* =========================
   Fetch
========================= */
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
.toolbar{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.title{ color:#1f2937; font-size:22px; font-weight:700; }

/* HERO */
.hero{
  display:grid; grid-template-columns:320px 1fr; gap:28px;
  background:#fff; border-radius:18px; padding:24px; box-shadow:0 8px 24px rgba(0,0,0,.06);
  margin-bottom:24px;
}
.poster{ width:100%; border-radius:12px; }
.category{ color:#6b7280; font-weight:700; margin-bottom:6px; }
.event-name{ margin:0 0 14px; font-size:30px; font-weight:800; color:#0f172a; }

/* STRIP */
.info-strip{
  background:#0f172a; border-radius:12px; color:#fff;
  padding:18px; box-shadow:0 10px 28px rgba(2,6,23,.28);
}
.info-grid{
  display:grid; grid-template-columns: repeat(3, minmax(0,1fr));
  gap:18px 24px; margin-bottom:16px;
}
.info-item{ display:flex; gap:12px; align-items:flex-start; }
.icon{ width:28px; height:28px; border-radius:8px; background:rgba(255,255,255,.08); display:flex; align-items:center; justify-content:center; font-size:16px; }
.label{ opacity:.8; font-size:12px; }
.value{ font-weight:600; }

.strip-actions{ display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:12px; }
.strip-venue{ font-weight:800; }
.action-row{ display:flex; gap:10px; }
.show-chip{
  background:rgba(255,255,255,.12); padding:6px 12px; border-radius:999px; font-weight:700; font-size:12px;
  border:1px solid rgba(255,255,255,.18);
}

.select{ min-width:240px; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; background:#fff; color:#111; }
.btn{ padding:10px 16px; border-radius:10px; border:1px solid #0ea5e9; background:#fff; cursor:pointer; transition:all .2s; }
.btn.primary{ background:#0ea5e9; color:#fff; border-color:#0ea5e9; font-weight:700; }
.btn.primary:hover{ background:#0284c7; border-color:#0284c7; }

/* ticket status */
.ticket-pill{ padding:3px 10px; border-radius:999px; font-weight:800; font-size:12px; }
.status-open{ background:#ecfdf5; color:#059669; }
.status-closed{ background:#fef2f2; color:#b91c1c; }
.status-pending{ background:#fff7ed; color:#c2410c; }

/* ZONES */
.zone-box{ background:#fff; border-radius:16px; padding:20px; box-shadow:0 4px 18px rgba(0,0,0,.06); }
.zone-box h2{ margin:0 0 12px; font-size:18px; font-weight:800; border-bottom:2px solid #e2e8f0; padding-bottom:8px; }
table{ width:100%; border-collapse:collapse; }
th,td{ text-align:center; padding:12px; border-bottom:1px solid #eef2f7; }
.zone-box thead th{ background:#f8fafc; color:#111827; font-weight:700; }
td.zone-name{ text-align:left; }
.pill{ padding:6px 10px; border-radius:999px; font-size:12px; font-weight:700; }
.pill.available{ background:#ecfdf5; color:#059669; }
.pill.few{ background:#fff7ed; color:#d97706; }
.pill.soldout{ background:#fef2f2; color:#b91c1c; }

/* responsive */
@media (max-width: 1024px){
  .hero{ grid-template-columns:1fr; }
  .info-grid{ grid-template-columns:1fr 1fr; }
  .strip-actions{ grid-template-columns:1fr; }
}
</style>
