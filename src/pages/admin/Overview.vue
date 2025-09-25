<!-- src/pages/admin/Overview.vue -->
<template>
  <section class="overview-events">
    <!-- Top bar -->
    <header class="toolbar">
      <h2 class="title" :style="h2">Overview</h2>
    </header>

    <!-- Loading / Error -->
    <div v-if="loading" style="padding:16px;">Loading…</div>
    <div v-else-if="error" style="padding:16px;color:#d32f2f;">{{ error }}</div>

    <!-- Main surface -->
    <div v-else :style="surface">
      <!-- KPI Row -->
      <div :style="kpiRow">
        <div :style="[kpiBase, kpiGreen]">
          <div :style="kpiHead">
            <span>Active Events</span>
            <span :style="kpiDot"></span>
          </div>
          <div :style="kpiVal">{{ activeCount }}</div>
        </div>

        <div :style="[kpiBase, kpiBlue]">
          <div :style="kpiHead">
            <span>Tickets Sold</span>
            <i class="fa fa-ticket-alt" :style="iconMuted"></i>
          </div>
          <div :style="kpiVal">{{ totalSold.toLocaleString() }}</div>
        </div>
      </div>

      <!-- Sales Progress -->
      <div :style="salesCard">
        <div :style="salesTitle">Sales Progress</div>

        <div>
          <div :style="thead">
            <div>Event</div>
            <div :style="num">Capacity</div>
            <div :style="num">Sold</div>
          </div>

          <div v-for="(r,i) in filteredRows" :key="i" :style="trow">
            <div>
              <div :style="eventMain">{{ truncate(r.name, 24) }}</div>
              <div :style="eventSub">{{ r.sub }}</div>
            </div>
            <div :style="num">{{ format(r.capacity) }}</div>
            <div :style="num">{{ format(r.sold) }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { api } from "@/lib/api";
defineEmits(["add-event"]);

/* ====== state ====== */
const rows = ref([]);           // ตาราง Sales Progress
const q = ref("");              // ค้นหา (ยังไม่เปิด UI)
const onlyActive = ref(false);  // toggle (ยังไม่เปิด UI)
const loading = ref(true);
const error = ref(null);

// KPI จาก backend
const activeCount = ref(0);
const totalSold   = ref(0);

/* ====== fetch ====== */
onMounted(async () => {
  try {
    const { data } = await api.get("/api/dashboard/summary");
    // KPI
    activeCount.value = Number(data?.activeEvents ?? 0);
    totalSold.value   = Number(data?.ticketsSold ?? 0);
    // ตาราง (map ให้ตรงกับ template เดิม)
    rows.value = (data?.salesProgress ?? []).map(x => ({
      name: x.title ?? "",
      sub:  ((x.category ?? "") || "").replace(/^./, c => c.toUpperCase()),
      capacity: Number(x.capacity ?? 0),
      sold:     Number(x.sold ?? 0),
      // active: ใส่ได้ถ้ามี status จาก backend
    }));
  } catch (e) {
    error.value = e?.message ?? "Load failed";
  } finally {
    loading.value = false;
  }
});

/* ====== computed ====== */
const filteredRows = computed(() =>
  rows.value
    .filter(r => (!onlyActive.value || r.active))
    .filter(r => (q.value ? (r.name + " " + r.sub).toLowerCase().includes(q.value.toLowerCase()) : true))
);

/* ====== helpers ====== */
const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s);
const format   = n => Number(n ?? 0).toLocaleString();

/* ================= TOKENS / STYLES ================= */
const color = {
  page:   "#f3f3f4",
  card:   "#ffffff",
  text:   "#222",
  title:  "#444",
  muted:  "#8a8a8a",
  border: "#E6E6E6",
  kpiGreen: "#E0F3E8",
  kpiBlue:  "#E8EEFF",
  kpiDot:   "#34C38F",
  blue:     "#5563FF",
  blueTrack:"#CFD5FF",
};
const shadowSm = "0 4px 12px rgba(0,0,0,.08)";
const shadowMd = "0 10px 24px rgba(0,0,0,.10)";
const radius   = "12px";

const page = { background: color.page, minHeight: "100%", padding: "16px 18px 28px" };

const topbar = { display:"flex", justifyContent:"space-between", alignItems:"center", maxWidth:"1040px", margin:"0 auto 10px" };
const h2 = { margin:0, letterSpacing:".2px", color:"#3a3a3a" }; // ขนาด/น้ำหนักดูที่ .title ใน <style>
const actions = { display:"flex", alignItems:"center", gap:"12px" };

/* Search (ยังไม่เปิด UI) */
const searchBox = { display:"flex", alignItems:"center", gap:"8px", height:"40px", padding:"0 12px",
  background:"#fff", borderRadius:"12px", boxShadow: shadowMd };
const iconMuted = { color:"#9aa3b2" };
const searchInput = { width:"420px", maxWidth:"52vw", border:"none", outline:"none",
  background:"transparent", color:"#333", fontSize:"14px" };

/* Toggle (ยังไม่เปิด UI) */
const toggleWrap = { cursor:"pointer" };
const toggleTrack = { width:"36px", height:"20px", background:"#e7e9f3", borderRadius:"999px", position:"relative", transition:".18s" };
const toggleTrackOn = { background: color.blueTrack };
const toggleDot = { position:"absolute", top:"2px", left:"2px", width:"16px", height:"16px",
  borderRadius:"50%", background:"#fff", boxShadow:"0 2px 6px rgba(0,0,0,.18)", transition:".18s" };
const toggleDotOn = { transform:"translateX(16px)", background: color.blue };

/* Add button (ยังไม่เปิด UI) */
const addBtn = { display:"inline-flex", alignItems:"center", gap:"10px", height:"44px", padding:"0 18px",
  minWidth:"140px", border:"none", cursor:"pointer", userSelect:"none", borderRadius:"14px",
  background:"#5563FF", color:"#fff", fontWeight:700, fontSize:"14px",
  boxShadow:"0 8px 16px rgba(85,99,255,.25)", transition:"filter .15s ease, transform .06s ease, box-shadow .2s ease" };
const addBtnPlus = { width:"20px", lineHeight:"20px", textAlign:"center", fontSize:"20px", fontWeight:800 };

/* Surface */
const surface = { 
  background: color.card, 
  borderRadius:"16px", 
  boxShadow: shadowMd,
  padding:"26px 26px 80px",
  width:"100%",          
  maxWidth:"2000px",      
  margin:"0 auto"       
};


/* KPI */
const kpiRow = { display:"flex", gap:"22px", marginBottom:"24px", flexWrap:"wrap" };
const kpiBase = { width:"240px", borderRadius: radius, padding:"14px 18px", boxShadow: shadowSm };
const kpiGreen = { background: color.kpiGreen };
const kpiBlue  = { background: color.kpiBlue  };
const kpiHead  = { display:"flex", alignItems:"center", gap:"10px", fontWeight:600, color:"#505a63" };
const kpiDot   = { width:"14px", height:"14px", borderRadius:"50%", background: color.kpiDot };
const kpiVal   = { marginTop:"6px", fontSize:"24px", fontWeight:900, color: color.text };

/* Sales card */
const salesCard  = { width:"360px", background:"#fff", borderRadius: radius, border:`1px solid ${color.border}`,
  boxShadow:"0 4px 10px rgba(0,0,0,.06)", padding:"16px 18px" };
const salesTitle = { fontWeight:800, fontSize:"20px", color: color.title, marginBottom:"12px" };

/* Table */
const grid = "1fr 110px 90px";
const thead = { display:"grid", gridTemplateColumns: grid, gap:"8px", alignItems:"center",
  color:"#888", fontWeight:600, fontSize:"13px", padding:"6px 0", borderBottom:"1px solid #eee" };
const trow  = { display:"grid", gridTemplateColumns: grid, gap:"8px", alignItems:"center",
  padding:"10px 0", borderBottom:"1px solid #f5f5f5" };
const num   = { textAlign:"right", fontWeight:600 };
const eventMain = { fontWeight:800, color: color.text };
const eventSub  = { marginTop:"2px", fontSize:"12px", color: color.muted };
</script>

<style scoped>
.title{
  font-weight:700;
  font-size:50px;
}

.overview-events {
  padding: 20px;
}
.title {
  color: #5f6063;
  font-size: 20px;
  font-weight: 400;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
</style>
