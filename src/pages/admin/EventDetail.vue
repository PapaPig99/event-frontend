<template>
  <div class="event-detail-page">
    <!-- Top toolbar -->
    <header class="toolbar">
      <div class="title">Event details</div>
      <div class="user-chip">
        <i class="i-person" /> <span>{{ userRole }}</span>
      </div>
    </header>

    <!-- Hero / Banner card -->
    <section class="hero">
      <img class="poster" :src="event.bannerUrl" alt="Event Banner" />
      <div class="hero-info">
        <h1 class="event-name">{{ event.title }}</h1>
        <div class="meta-grid">
          <div><b>ศิลปิน/โชว์:</b> {{ event.subtitle || "-" }}</div>
          <div><b>สถานที่:</b> {{ event.venue }}</div>
          <div><b>วันเวลา:</b> {{ selectedShowtime?.label || "-" }}</div>
          <div><b>ช่วงราคา:</b> {{ priceRangeText }}</div>
        </div>

        <div class="actions">
          <!-- เลือกรอบการแสดง -->
          <select v-model="selectedShowId" class="select">
            <option disabled value="">เลือกวันที่แสดง</option>
            <option v-for="s in event.showtimes" :key="s.id" :value="s.id">
              {{ s.label }}
            </option>
          </select>

          <button class="btn primary" :disabled="!selectedShowId" @click="scrollToZones">
            ดูโซนที่นั่ง
          </button>
        </div>

        <ul class="notes">
          <li v-for="(n, i) in event.quickNotes" :key="i">{{ n }}</li>
        </ul>
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
const userRole = "User"; // เปลี่ยนตามระบบ auth ของคุณ

const event = reactive({
  id: null,
  title: "",
  subtitle: "",
  bannerUrl: "",
  seatmapUrl: "",
  venue: "",
  quickNotes: [],
  descriptionHtml: "",
  showtimes: [],
  zonesByShow: {}
});

const selectedShowId = ref("");
const zonesRef = ref(null);

const selectedShowtime = computed(() =>
  event.showtimes.find((s) => s.id === selectedShowId.value)
);

const zonesForSelectedShow = computed(() => {
  return event.zonesByShow[selectedShowId.value] || [];
});

const priceRangeText = computed(() => {
  const all = Object.values(event.zonesByShow).flat();
  if (!all.length) return "-";
  const prices = all.map((z) => z.price).filter((n) => Number.isFinite(n));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return `${fmtPrice(min)} - ${fmtPrice(max)}`;
});

function fmtPrice(n) {
  return (n ?? 0).toLocaleString();
}
function statusText(s) {
  if (s === "available") return "ว่าง";
  if (s === "few") return "เหลือน้อย";
  if (s === "soldout") return "เต็มแล้ว";
  return "-";
}
function statusClass(s) {
  return {
    available: s === "available",
    few: s === "few",
    soldout: s === "soldout",
  };
}
function scrollToZones() {
  zonesRef.value?.scrollIntoView({ behavior: "smooth" });
}
function book(zone) {
  router.push({
    path: "/checkout",
    query: {
      eventId: event.id,
      showId: selectedShowId.value,
      zoneId: zone.id,
    },
  });
}

onMounted(async () => {
  const id = route.params.id || 1;
  const res = await fetch(`/api/events/${id}`);
  const data = await res.json();
  Object.assign(event, data);
  selectedShowId.value = data.showtimes?.[0]?.id || "";
});
</script>

<style scoped>
.event-detail-page { padding: 20px; }
.toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.title { color:#5f6063; font-size:20px; font-weight:600; }
.user-chip { display:flex; align-items:center; gap:8px; color:#5f6063; }
.i-person { width:18px; height:18px; border-radius:50%; background:#ddd; display:inline-block; }

.hero {
  display:grid; grid-template-columns: 260px 1fr; gap:24px;
  background:#fff; border-radius:16px; padding:20px; box-shadow:0 4px 18px rgba(0,0,0,.06);
  margin-bottom:22px;
}
.poster { width:100%; border-radius:12px; }
.event-name { margin:0 0 10px; font-size:24px; font-weight:800; }
.meta-grid { display:grid; grid-template-columns: 1fr 1fr; gap:8px 16px; margin-bottom:14px; }
.actions { display:flex; gap:10px; margin-bottom:10px; }
.select { padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; min-width:280px; background:#fff; }
.btn { padding:10px 16px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; }
.btn.primary { background:#0ea5e9; border-color:#0ea5e9; color:#fff; }
.btn:disabled { opacity:.5; cursor:not-allowed; }
.notes { margin:6px 0 0 18px; color:#6b7280; }

.zone-box { background:#fff; border-radius:16px; padding:20px; box-shadow:0 4px 18px rgba(0,0,0,.06); }
.zone-box h2 { margin:0 0 12px; }
table { width:100%; border-collapse: collapse; }
th, td { text-align:center; padding:12px; border-bottom:1px solid #f1f5f9; }
td.zone-name { text-align:left; }

.pill { padding:6px 10px; border-radius:999px; font-size:12px; font-weight:700; }
.pill.available { background:#ecfdf5; color:#059669; }
.pill.few { background:#fff7ed; color:#d97706; }
.pill.soldout { background:#fef2f2; color:#b91c1c; }

.description { margin-top:20px; background:#fff; border-radius:16px; padding:20px; box-shadow:0 4px 18px rgba(0,0,0,.06); }
.desc :is(p,li) { color:#374151; line-height:1.7; }
</style>
