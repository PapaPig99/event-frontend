<script setup>
import { ref, computed, onMounted } from "vue";
import api from "@/lib/api";
import { useRoute } from "vue-router";

const route = useRoute();
const eventId = Number(route.params.id);

const sessions = ref([]);
const selectedSessionId = ref("");
const registrations = ref([]);

// Filters
const search = ref("");
const filterPay = ref("");
const filterCheckin = ref("");

onMounted(async () => {
  const res = await api.get(`/events/${eventId}`);
  sessions.value = res.data.sessions || [];

  if (sessions.value.length) {
    selectedSessionId.value = sessions.value[0].id;
    loadData();
  }
});

async function loadData() {
  const regRes = await api.get(`/registrations/event/${eventId}/session/${selectedSessionId.value}`);
  registrations.value = regRes.data;
}

const filteredRegistrations = computed(() => {
  return registrations.value.filter(r => {

    // Search
    const q = search.value.toLowerCase();
    const matchSearch =
      !q ||
      r.email?.toLowerCase().includes(q) ||
      r.ticketCode?.toLowerCase().includes(q) ||
      r.paymentReference?.toLowerCase().includes(q);

    // Payment: PAID / UNPAID only
    const matchPay =
      filterPay.value === "" ||
      (filterPay.value === "PAID" && r.paymentStatus === "PAID") ||
      (filterPay.value === "UNPAID" && r.paymentStatus !== "PAID");

    // Check-in
    const matchCheckin =
      filterCheckin.value === "" ||
      (filterCheckin.value === "CHECKED" && r.isCheckedIn === true) ||
      (filterCheckin.value === "UNCHECKED" && r.isCheckedIn === false);

    return matchSearch && matchPay && matchCheckin;
  });
});

function formatDate(dt) {
  if (!dt) return "-";
  return dt.replace("T", " ");
}

function payBadge(status) {
  return status === "PAID" ? "ok" : "bad";
}

function checkinBadge(isChecked) {
  return isChecked ? "ok" : "bad";
}
</script>
<template>
  <div class="page">

    <!-- Header -->
    <header class="toolbar">
      <div>
        <h2>Registrations <span v-if="eventId" class="event-id">#{{ eventId }}</span> </h2>
      </div>
    </header>

   <!-- Filters row -->
<div class="filters-row">
  
  <div class="filter-item">
    <label>Session</label>
    <select v-model="selectedSessionId" @change="loadData" class="select wide">
      <option v-for="s in sessions" :key="s.id" :value="s.id">
        {{ s.name }} ({{ s.startTime }})
      </option>
    </select>
  </div>

  <div class="filter-item">
    <label>ค้นหา Ticket Code</label>
    <input v-model="search" placeholder="เช่น MAIRA-001" class="input " />
  </div>

  <div class="filter-item">
    <label>สถานะชำระเงิน</label>
    <select v-model="filterPay" class="select ">
      <option value="">ทั้งหมด</option>
      <option value="PAID">PAID</option>
      <option value="UNPAID">UNPAID</option>
    </select>
  </div>

  <div class="filter-item">
    <label>เช็กอิน</label>
    <select v-model="filterCheckin" class="select ">
      <option value="">ทั้งหมด</option>
      <option value="CHECKED">เช็กอินแล้ว</option>
      <option value="UNCHECKED">ยังไม่เช็กอิน</option>
    </select>
  </div>

</div>


    <!-- REGISTRATION TABLE -->
    <section v-if="selectedSessionId" class="section">

      <table class="table" v-if="filteredRegistrations.length">
        <thead>
          <tr>
            <th>#</th>
            <th>อีเมล</th>
            <th>โซน</th>
            <th>ราคา</th>
            <th>Ticket</th>
            <th>Reference</th>
            <th>Paid At</th>
            <th>ชำระเงิน</th>
            <th>เช็กอิน</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(r, idx) in filteredRegistrations" :key="r.id">
            <td>{{ idx + 1 }}</td>
            <td>{{ r.email }}</td>
            <td>{{ r.zoneName }}</td>
            <td>{{ r.price?.toLocaleString() }}</td>
            <td>{{ r.ticketCode }}</td>
            <td>{{ r.paymentReference }}</td>
            <td>{{ formatDate(r.paidAt) }}</td>

            <td>
              <span :class="['badge', payBadge(r.paymentStatus)]">
                {{ r.paymentStatus }}
              </span>
            </td>

            <td>
              <span :class="['badge', checkinBadge(r.isCheckedIn)]">
                {{ r.isCheckedIn ? 'CHECKED' : 'NOT CHECKED' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty">ไม่พบข้อมูลการจอง</div>
    </section>

  </div>
</template>

<style scoped>
/* ==== PAGE LAYOUT ==== */
.page {
  padding: 28px;
  background: #f7f9fc;
}

.toolbar .title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
}

.event-id {
  margin-left: 6px;
  color: #9aa0a6;
  font-weight: 400;
  font-size: 20px;
}


/* ==== FILTERS ROW ==== */
.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  background: #fafbfc;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 24px;
}

/* ==== LABEL ==== */
.filter-item label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #374151;
  font-weight: 600;
}
.select.wide {
  width: 280px;  
}

/* ===== INPUT + SELECT ===== */
.select,
.input {
  padding: 10px 14px;
  border: 1px solid #cfd4dc;
  border-radius: 10px;
  background: #fff;
  font-size: 14px;
  transition: all 0.18s ease;
  outline: none;
  width: 200px;
}

/* ===== CUSTOM DROPDOWN ARROW ===== */
.select {
  appearance: none;              
}

/* ===== Hover ===== */
.select:hover,
.input:hover {
  border-color: #94a3b8;
}

/* ===== Focus ===== */
.select:focus,
.input:focus {
  border-color: #1d4ed8;
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.18);
}

/* ==== TABLE ==== */
.table {
  width: 100%;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.table th {
  background: #f3f4f6;
  text-align: left;
  padding: 12px;
  font-size: 14px;
  color: #374151;
  font-weight: 700;
  border-bottom: 1px solid #e5e7eb;
}

.table td {
  padding: 12px;
  font-size: 14px;
  color: #444;
  border-bottom: 1px solid #f1f5f9;
}

.table tbody tr:hover {
  background: #f9fafb;
}

/* ==== BADGES ==== */
.badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.badge.ok {
  background: #dcfce7;
  color: #166534;
}

.badge.bad {
  background: #fee2e2;
  color: #b91c1c;
}

.badge.pending {
  background: #fef3c7;
  color: #92400e;
}

/* ==== EMPTY ==== */
.empty {
  padding: 18px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

</style>