<!-- src/pages/admin/Dashboard.vue -->
<template>
  <section class="dashboard-events" :style="page">

    <!-- ===== Page title ===== -->
    <header class="toolbar">
      <h2 class="title">Dashboard</h2>
    </header>

    <!-- (ลบ error message ออกแล้ว) -->

    <!-- ===== Main white surface ===== -->
    <div :style="surface">
      <div :style="layoutRow">

        <!-- ========== LEFT COLUMN (KPI + TABLE) ========== -->
        <div :style="leftCol">

          <!-- KPI Row -->
          <div :style="kpiRow">
            <div :style="[kpiBase, kpiCard, kpiStripeGreen]">
              <div :style="kpiHead">
                <span>Active Events</span>
              </div>
              <div :style="kpiVal">{{ activeCount }}</div>
            </div>

            <div :style="[kpiBase, kpiCard, kpiStripeBlue]">
              <div :style="kpiHead">
                <span>Tickets Sold</span>
                <i class="fa fa-ticket-alt" :style="iconMuted"></i>
              </div>
              <div :style="kpiVal">{{ totalSold.toLocaleString() }}</div>
            </div>

            <div :style="[kpiBase, kpiCard, kpiStripeYellow]">
              <div :style="kpiHead">
                <span>Total Registration</span>
              </div>
              <div :style="kpiVal">{{ totalRegistration.toLocaleString() }}</div>
            </div>
          </div>

          <!-- Search Bar -->
          <div :style="searchRow">
            <i class="fa fa-search" :style="searchIcon"></i>
            <input v-model="q" placeholder="search user" :style="searchInput2" />
            <button :style="filterBtn"><i class="fa fa-filter"></i></button>
          </div>

          <!-- Table -->
          <div style="margin-top:10px;">
            <div :style="thead">
              <div>Event</div>
              <div :style="num">Capacity</div>
              <div :style="num">Sold</div>
            </div>

            <div
              v-for="(r,i) in filteredRows"
              :key="i"
              :style="[trow, i === 0 ? firstRow : null]"
            >
              <div>
                <div :style="eventMain">{{ truncate(r.name, 24) }}</div>
                <div :style="eventSub">{{ r.sub }}</div>
              </div>
              <div :style="num">{{ format(r.capacity) }}</div>
              <div :style="num">{{ format(r.sold) }}</div>
            </div>
          </div>

        </div>

        <!-- ========== RIGHT COLUMN (SUMMARY CARD) ========== -->
        <aside :style="rightCol">
          <div :style="summaryCard">
            <div :style="summaryRowFirst">
              <span :style="summaryLabel">Total Signups</span>
              <span :style="summaryValue">{{ format(totalSignups) }}</span>
            </div>
            <div :style="summaryRow">
              <span :style="summaryLabel">Drop Offs</span>
              <span :style="summaryValue">{{ format(dropOffs) }}</span>
            </div>
            <div :style="summaryRow">
              <span :style="summaryLabel">Show Rate</span>
              <span :style="summaryValue">{{ showRate }}%</span>
            </div>
            <div :style="summaryRowLast">
              <span :style="summaryLabel">Check in</span>
              <span :style="summaryValue">{{ format(checkIn) }}</span>
            </div>
          </div>
        </aside>

      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import api from "@/lib/api";

/* ====== state ====== */
const rows = ref([]);
const q = ref("");
const onlyActive = ref(false);

/* UI ไม่ถูกบังอีกต่อไป */
const loading = ref(false);
const error = ref(null);

/* KPI */
const activeCount = ref(0);
const totalSold = ref(0);
const totalRegistration = ref(0);

/* Summary */
const totalSignups = ref(0);
const dropOffs = ref(0);
const showRate = ref(0);
const checkIn = ref(0);

/* ===== FETCH ===== */
onMounted(async () => {
  try {
    const { data } = await api.get("/dashboard/summary");

    activeCount.value = Number(data?.activeEvents ?? 0);
    totalSold.value = Number(data?.ticketsSold ?? 0);
    totalRegistration.value = Number(data?.totalRegistration ?? 0);

    totalSignups.value = Number(
      data?.totalSignups ?? data?.totalRegistration ?? 0
    );
    dropOffs.value = Number(data?.dropOffs ?? 0);
    showRate.value = Number(data?.showRate ?? 0);
    checkIn.value = Number(data?.checkIn ?? 0);

    rows.value = (data?.salesProgress ?? []).map((x) => ({
      name: x.title ?? "",
      sub: ((x.category ?? "") || "").replace(/^./, (c) => c.toUpperCase()),
      capacity: Number(x.capacity ?? 0),
      sold: Number(x.sold ?? 0),
      active: x.active ?? true,
    }));
  } catch (e) {
    console.error("Dashboard summary error:", e);
    // ❌ ไม่เซ็ต error.value เพื่อไม่ให้ข้อความออกหน้าจอ
  }
});

/* ===== FILTERED TABLE ===== */
const filteredRows = computed(() =>
  rows.value
    .filter(r => (!onlyActive.value || r.active))
    .filter(r =>
      q.value
        ? (r.name + " " + r.sub).toLowerCase().includes(q.value.toLowerCase())
        : true
    )
    .slice(0, 3)
);

/* ===== helpers ===== */
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const format = (n) => Number(n ?? 0).toLocaleString();

/* ==================== STYLES ==================== */
const color = {
  page: "#f3f3f4",
  card: "#fff",
  text: "#222",
  title: "#444",
  muted: "#8a8a8a",
  border: "#E6E6E6",
  kpiGreen: "#5ac18e",
  kpiBlue: "#5563ff",
  kpiYellow: "#f4c346",
};

const shadowSm = "0 4px 12px rgba(0,0,0,.08)";
const shadowMd = "0 10px 24px rgba(0,0,0,.10)";
const radius = "12px";

/* กล่องหลัก */
const page = { background: color.page, minHeight: "100vh" };

const surface = {
  background: color.card,
  borderRadius: "16px",
  boxShadow: shadowMd,
  padding: "22px 24px 48px",
  width: "100%",
  maxWidth: "1500px",
  margin: "0 auto 40px",
  minHeight: "420px",   // ให้กล่องขาวยาวลง
};

/* Layout */
const layoutRow = { display: "flex", gap: "26px" };
const leftCol = { flex: "1" };
const rightCol = { width: "260px" };

/* KPI */
const kpiRow = { display: "flex", gap: "18px", marginBottom: "18px" };

const kpiBase = { flex: 1, minWidth: "200px" };
const kpiCard = {
  background: "#fff",
  borderRadius: radius,
  padding: "12px 18px",
  border: `1px solid ${color.border}`,
  boxShadow: shadowSm,
};

const kpiStripeGreen = { borderLeft: `4px solid ${color.kpiGreen}` };
const kpiStripeBlue = { borderLeft: `4px solid ${color.kpiBlue}` };
const kpiStripeYellow = { borderLeft: `4px solid ${color.kpiYellow}` };

const kpiHead = { display: "flex", justifyContent: "space-between" };
const iconMuted = { color: "#9aa3b2" };
const kpiVal = { marginTop: "6px", fontSize: "24px", fontWeight: 900 };

/* Search */
const searchRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 14px",
  background: "#fff",
  borderRadius: "999px",
  border: `1px solid ${color.border}`,
  marginTop: "6px",
  boxShadow: shadowSm,
};
const searchIcon = { fontSize: "13px" };
const searchInput2 = {
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
};
const filterBtn = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  background: "#000",
  color: "#fff",
  border: "none",
};

/* Table */
const grid = "1fr 110px 90px";

const thead = {
  display: "grid",
  gridTemplateColumns: grid,
  padding: "10px 12px 8px",
  fontWeight: 600,
  borderRadius: "8px",
  border: `1px solid ${color.border}`,
};

const trow = {
  display: "grid",
  gridTemplateColumns: grid,
  padding: "8px 12px",
};

const firstRow = {
  background: "#ffe7e7",
  borderRadius: "8px",
};

const num = { textAlign: "right", fontWeight: 600 };
const eventMain = { fontWeight: 800 };
const eventSub = { fontSize: "11px", color: color.muted };

/* Summary card */
const summaryCard = {
  background: "#fff",
  borderRadius: radius,
  padding: "12px 16px",
  border: `1px solid ${color.border}`,
};

const summaryLabel = { color: color.muted };
const summaryValue = { fontWeight: 700 };

const summaryRowBase = {
  display: "flex",
  justifyContent: "space-between",
  padding: "7px 0",
};

const summaryRowFirst = { ...summaryRowBase, borderBottom: "1px solid #eee" };
const summaryRow = { ...summaryRowBase, borderBottom: "1px solid #f6f6f6" };
const summaryRowLast = { ...summaryRowBase };
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
  color: #5f6063;
  font-size: 20px;
  font-weight: 500;
}
</style>
