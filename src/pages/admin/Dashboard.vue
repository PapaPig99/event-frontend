<template>
  <section class="dashboard-events page">

    <!-- ===== Page title ===== -->
    <header class="toolbar">
      <h2 class="title">Dashboard</h2>
    </header>

    <!-- ===== Main white surface ===== -->
    <div class="surface">
      <div class="layout-row">

        <!-- LEFT COLUMN -->
        <div class="left-col">

          <!-- Layout คอแรก: KPI -->
          <div class="kpi-row">
            <div class="kpi-card kpi-base kpi-green">
              <div class="kpi-head"><span>Active Events</span></div>
              <div class="kpi-val">{{ activeEvents }}</div>
            </div>

            <div class="kpi-card kpi-base kpi-blue">
              <div class="kpi-head"><span>Tickets Sold</span></div>
              <div class="kpi-val">{{ ticketsSold.toLocaleString() }}</div>
            </div>

            <div class="kpi-card kpi-base kpi-yellow">
              <div class="kpi-head"><span>Total Registration</span></div>
              <div class="kpi-val">{{ totalRegistrations.toLocaleString() }}</div>
            </div>
          </div>

          <!-- Search  -->
          <div class="search-wrapper">
            <div class="search-box">
              <i class="fa fa-search search-icon"></i>
              <input v-model="q" placeholder="search event" />
            </div>

            <!-- กดปุ่ม Filter -->
            <div class="filter-wrapper">
              <button class="filter-btn" @click="showFilter = !showFilter">
                <i class="fa fa-filter"></i>
              </button>

              <!-- Dropdown ฟิลเตอร์ -->
              <div v-if="showFilter" class="filter-dropdown">
                <div v-for="c in categories" :key="c" class="filter-item" :class="{ active: selectedCategory === c }"
                  @click="selectedCategory = c; showFilter = false;">
                  {{ c }}
                </div>
              </div>
            </div>

          </div>


          <!-- TABLE + SUMMARY -->
          <div class="table-summary-row">

            <!-- TABLE -->
            <div class="table-col">
              <div class="thead">
                <div>Event</div>
                <div class="num">Capacity</div>
                <div class="num">Sold</div>
              </div>

              <div v-for="(r, i) in filteredRows" :key="i" class="trow"
                :class="{ 'selected-row': selectedEventId === r.eventId }" @click="onRowClick(r.eventId)">

                <div>
                  <div class="event-main">{{ truncate(r.name, 24) }}</div>
                  <div class="event-sub">{{ r.sub }}</div>
                </div>

                <div class="num">{{ format(r.capacity) }}</div>
                <div class="num">{{ format(r.sold) }}</div>
              </div>

            </div>

            <!-- SUMMARY -->
            <aside class="right-col">
              <div class="summary-card">
                <div class="summary-row summary-row-first">
                  <span class="summary-label">Total Signups</span>
                  <span class="summary-value">{{ format(totalSignups) }}</span>
                </div>

                <div class="summary-row">
                  <span class="summary-label">Drop Offs</span>
                  <span class="summary-value">{{ format(dropOffs) }}</span>
                </div>

                <div class="summary-row">
                  <span class="summary-label">Show Rate</span>
                  <span class="summary-value">{{ showRate }}%</span>
                </div>

                <div class="summary-row summary-row-last">
                  <span class="summary-label">Check in</span>
                  <span class="summary-value">{{ format(checkIn) }}</span>
                </div>
              </div>
            </aside>

          </div>

        </div>
      </div>

    </div>

  </section>
</template>


<script setup>
import { ref, computed, onMounted } from "vue";
import api from "@/lib/api";

/* ===== State ===== */
const rows = ref([]);
const q = ref("");
const selectedEventId = ref(null);

/* KPI (แสดงข้อมูลรวมตลอด ไม่เปลี่ยนตอนเลือก event) */
const activeEvents = ref(0);
const ticketsSold = ref(0);
const totalRegistrations = ref(0);

/* Summary Panel (เปลี่ยนเฉพาะตาม event ที่เลือก) */
const totalSignups = ref(0);
const dropOffs = ref(0);
const showRate = ref(0);
const checkIn = ref(0);

/* Dropdown filter */
const showFilter = ref(false);
const categories = ref(["All", "concert", "show", "education", "business", "sport"]);
const selectedCategory = ref("All");

/* ===== Load KPI (ข้อมูลรวม) ===== */
async function loadKPI() {
  const { data } = await api.get("/dashboard/summary");
  activeEvents.value = data.activeEvents;
  ticketsSold.value = data.ticketsSold;
  totalRegistrations.value = data.totalRegistrations;
}

/* ===== Load Summary (ตาม event หรือรวม) ===== */
async function loadSummary() {
  const { data } = await api.get("/dashboard/summary", {
    params: { eventId: selectedEventId.value }
  });

  totalSignups.value = data.totalSignups;
  dropOffs.value = data.dropOffs;
  showRate.value = data.showRate;
  checkIn.value = data.checkIn;
}

/* ===== Load Event Table ===== */
async function loadEvents() {
  const { data } = await api.get("/dashboard/events");
  rows.value = data.map(ev => ({
    eventId: ev.eventId,
    name: ev.title,        
    sub: ev.category,      
    capacity: ev.capacity,
    sold: ev.sold,
    category: ev.category  
  }));
}


/* ===== Row click ===== */
function onRowClick(eventId) {
  selectedEventId.value = selectedEventId.value === eventId ? null : eventId;
  loadSummary(); // ไม่แตะ KPI
}

/* ===== Lifecycle ===== */
onMounted(() => {
  loadKPI();
  loadSummary();
  loadEvents();
});

/* ===== Filtering ===== */
const filteredRows = computed(() =>
  rows.value
    .filter(r =>
      selectedCategory.value === "All"
        ? true
        : r.category?.toLowerCase() === selectedCategory.value.toLowerCase()
    )
    .filter(r =>
      q.value
        ? (r.name + " " + r.sub).toLowerCase().includes(q.value.toLowerCase())
        : true
    )
);


/* Helpers */
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const format = (n) => Number(n).toLocaleString();
</script>




<style scoped>
.dashboard-events {
  padding-bottom: 32px;
}

.toolbar {
  margin: 18px 0 12px 24px;
  display: flex;
  justify-content: flex-start;
}

.title {
  font-weight: 500;
  color: #333;
  font-size: 20px;
}

/* Root theme */
.page {
  background: #f3f3f4;
  min-height: 100vh;
}

/* Surface */
.surface {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, .10);
  padding: 22px 24px 48px;
  width: 100%;
  max-width: 1500px;
  margin: 0 auto 40px;
  min-height: 420px;
}

/* Layout */
.layout-row {
  display: flex;
  gap: 26px;
}

.left-col {
  flex: 1;
}

.right-col {
  width: 260px;
}

/* KPI row */
.kpi-row {
  display: flex;
  gap: 18px;
  margin-bottom: 18px;
}

.kpi-base {
  flex: 1;
  min-width: 200px;
}

.kpi-card {
  background: #fff;
  border-radius: 12px;
  padding: 12px 18px;
  border: 1px solid #E6E6E6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, .08);
}

.kpi-green {
  border-left: 4px solid #5ac18e;
  background: #F1FCF6;

}

.kpi-blue {
  border-left: 4px solid #5563ff;
  background: #F6F9FF;

}

.kpi-yellow {
  border-left: 4px solid #f4c346;
  background: #FFFDF0;
}

.kpi-head {
  display: flex;
  justify-content: space-between;
  color: #534E4E;
}

.icon-muted {
  color: #9aa3b2;
}

.kpi-val {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 500;
}

/* Search */
.search-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 12px;
  padding: 1px 14px;
  border: 1px solid #d6d3d1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  width: 300px;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  background: transparent;
  color: #444;
}

.search-icon {
  font-size: 12px;
  color: #b8b7b7;
}

/* ปุ่ม filter  */
.filter-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #000;
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Dropdown */
.filter-dropdown {
  position: absolute;
  margin-top: 200px;
  background: #fff;
  border: 1px solid #E6E6E6;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  width: 100px;
  z-index: 100;
}

.filter-item {
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.filter-item:hover {
  background: #f5f5f5;
}

.filter-item.active {
  background: #000;
  color: #fff;
}

.filter-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}


/* Table */
.thead {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 10px 12px 8px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid #E6E6E6;
}

.trow {
  display: grid;
  grid-template-columns: 1fr 110px 90px;
  padding: 8px 12px;
}

.first-row {
  background: #ffe7e7;
  border-radius: 8px;
}

.num {
  text-align: right;
  font-weight: 600;
}

.event-main {
  font-weight: 800;
}

.event-sub {
  font-size: 11px;
  color: #8a8a8a;
}

/* Summary card */
.summary-card {
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid #E6E6E6;
}

.summary-label {
  color: #8a8a8a;
}

.summary-value {
  font-weight: 700;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid #f6f6f6;
}

.summary-row-first {
  border-bottom: 1px solid #eee;
}

.summary-row-last {
  border-bottom: none;
}

.table-summary-row {
  display: flex;
  gap: 26px;
  margin-top: 18px;
}

.table-col {
  flex: 1;
}

.right-col {
  width: 260px;
}

.trow {
  cursor: pointer;
  transition: background 0.2s;
}

.trow:hover {
  background: #fafafa;
}

.selected-row {
  background: #FFEAEA;
}
</style>
