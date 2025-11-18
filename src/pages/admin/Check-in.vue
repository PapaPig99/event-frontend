<template>
  <div class="toast-container">
    <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.type">
      <span>{{ t.message }}</span>
      <button class="toast-close" @click="closeToast(t.id)">✕</button>
    </div>
  </div>

  <section class="checkin-page">

    <div class="checkin-box">

      <h1 class="title">Check-in</h1>

      <!-- Event filter -->
      <select v-model="selectedEvent" class="select" @change="loadSessions">
        <option value="">Select event</option>
        <option v-for="ev in events" :key="ev.id" :value="ev.id">
          {{ ev.title }}
        </option>
      </select>

      <!-- Session filter -->
      <select v-model="selectedSession" class="select" :disabled="!selectedEvent">
        <option value="">Select session</option>
        <option v-for="s in sessions" :key="s.id" :value="s.id">
          {{ s.name }} ({{ extractTime(s.startTime) }})
        </option>



      </select>

      <!-- Ticket input -->
      <input v-model="code" @keyup.enter="submit" type="text" placeholder="Ticket code" class="input" />

      <button class="btn" @click="submit" :disabled="loading || !selectedEvent || !selectedSession">
        {{ loading ? "Checking…" : "Check-in" }}
      </button>


      <!-- Success / Error -->
      <transition name="fade">
        <div v-if="success" class="msg success">{{ success }}</div>
      </transition>
      <transition name="fade">
        <div v-if="error" class="msg error">{{ error }}</div>
      </transition>

    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from "vue";
import api from "@/lib/api";

const events = ref([]);
const sessions = ref([]);
const selectedEvent = ref("");
const selectedSession = ref("");

const code = ref("");
const loading = ref(false);
const success = ref("");
const error = ref("");

//ตัดเลข
function extractTime(v) {
  if (!v) return "";
  return v.slice(0, 5);   // "19:00:00" → "19:00"
}

// แจ้งเตือน
const toasts = ref([]);

function showToast(message, type = "success") {
  const id = Date.now() + Math.random();
  toasts.value.push({ id, message, type });
}

function closeToast(id) {
  toasts.value = toasts.value.filter(t => t.id !== id);
}

// โหลด Event ทั้งหมด
async function loadEvents() {
  const res = await api.get("/events");
  events.value = res.data;
}

// โหลด Sessions ตาม Event
async function loadSessions() {
  sessions.value = [];

  if (!selectedEvent.value) return;

  const res = await api.get(`/events/${selectedEvent.value}/sessions`);
  sessions.value = res.data;
}

async function submit() {
  if (!code.value.trim()) return;

  if (!selectedEvent.value || !selectedSession.value) {
    error.value = "กรุณาเลือก Event และ Session ก่อน";
    return;
  }

  loading.value = true;
  success.value = "";
  error.value = "";

  try {
    await api.patch(
      `/registrations/events/${selectedEvent.value}/sessions/${selectedSession.value}/checkin/${code.value.trim()}`
    );

    showToast("Checked-in successfully", "success");
    code.value = "";
  } catch (e) {
    error.value = e?.response?.data?.error || "Invalid code or already checked-in";
  } finally {
    loading.value = false;
  }
}


onMounted(loadEvents);
</script>


<style scoped>
.checkin-page {
  min-height: calc(80vh - var(--header-h));
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
  background: #fafafa;
}

.checkin-box {
  width: 100%;
  max-width: 360px;
  background: #fff;
  padding: 32px 28px;
  border-radius: 12px;
  border: 1px solid #e6e6e6;
}

.title {
  font-size: 20px;
  font-weight: 500;
  color: #222;
  margin-bottom: 20px;
  text-align: center;
}

/* Minimal Select */
.select {
  width: 100%;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
  background: #fbfbfb;
  padding: 0 12px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #333;
}

.select:focus {
  border-color: #333;
  background: #fff;
}

/* Input */
.input {
  width: 100%;
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
  background: #fbfbfb;
  font-size: 15px;
  transition: 0.2s;
  margin-bottom: 12px;
}

.input:focus {
  background: #fff;
  border-color: #333;
}

/* Button */
.btn {
  width: 100%;
  height: 40px;
  border-radius: 8px;
  background: #111;
  color: #fff;
  border: none;
  font-size: 15px;
  cursor: pointer;
  transition: 0.2s;
  margin-bottom: 4px;
}

.btn:hover {
  background: #000;
}

.btn:disabled {
  cursor: not-allowed;
}

.msg {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.success {
  background: #ecf7f0;
  color: #1d6b3c;
}

.error {
  background: #f9eaea;
  color: #b33a3a;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity .25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 9999;
}

.toast-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 6px;
  min-width: 240px;
  background: #333;
  color: white;
  font-size: 14px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.25s ease;
}

.toast-item.success {
  background: #2b8a3e;
}

.toast-close {
  background: transparent;
  border: none;
  color: white;
  font-size: 16px;
  margin-left: 12px;
  cursor: pointer;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
