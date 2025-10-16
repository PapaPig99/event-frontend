<!-- EventCardSection.vue -->
<template>
  <section class="event-section">
    <!-- Title -->
    <div class="title-row" style="margin-bottom: -20px;">
      <svg class="title-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm14-1h2a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2h-2"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <h2>My Event Tickets</h2>
    </div>

    <!-- Profile -->
    <div class="profile-box">
      <i class="fa-solid fa-user avatar"></i>
      <div class="info">
        <p class="name" style="margin-bottom: 0px;">{{ user.name }}</p>
        <p class="email">{{ user.email }}</p>
      </div>
      <button class="edit-btn">Edit Profile</button>
    </div>

    <!-- Tabs -->
    <div class="tabs" role="tablist" aria-label="Event lists">
      <button
        class="tab"
        role="tab"
        :aria-selected="tab==='upcoming'"
        :tabindex="tab==='upcoming'?0:-1"
        :class="{ active: tab === 'upcoming' }"
        @click="tab='upcoming'"
        @keydown.right.prevent="tab='history'"
        @keydown.left.prevent="tab='history'"
      >
        Upcoming <span class="badge" v-if="upcomingEvents.length">{{ upcomingEvents.length }}</span>
      </button>

      <button
        class="tab"
        role="tab"
        :aria-selected="tab==='history'"
        :tabindex="tab==='history'?0:-1"
        :class="{ active: tab === 'history' }"
        @click="tab='history'"
        @keydown.right.prevent="tab='upcoming'"
        @keydown.left.prevent="tab='upcoming'"
      >
        History <span class="badge" v-if="historyEvents.length">{{ historyEvents.length }}</span>
      </button>
    </div>

    <!-- Upcoming list -->
    <div
      v-show="tab==='upcoming'"
      role="tabpanel"
      aria-labelledby="upcoming"
      class="event-list"
    >
      <article v-for="event in upcomingEvents" :key="event.id" class="event-card">
        <img :src="event.image" alt="Event Poster" class="poster" />
        <div class="event-info">
          <p class="date">{{ formatDate(event.date) }}</p>
          <h3 class="event-title">{{ event.title }}</h3>
          <p class="location">{{ event.location }}</p>
          <button class="view-btn" @click="viewTicket(event.id)">
            <i class="fa-solid fa-ticket"></i><span>View Ticket</span>
          </button>
        </div>
      </article>
      <p v-if="!upcomingEvents.length" class="empty">No upcoming events</p>
    </div>

    <!-- History list -->
    <div
      v-show="tab==='history'"
      role="tabpanel"
      aria-labelledby="history"
      class="event-list"
    >
      <article v-for="event in historyEvents" :key="event.id" class="event-card">
        <img :src="event.image" alt="Event Poster" class="poster" />
        <div class="event-info">
          <p class="date">{{ formatDate(event.date) }}</p>
          <h3 class="event-title">{{ event.title }}</h3>
          <p class="location">{{ event.location }}</p>
          <button class="view-btn" @click="viewTicket(event.id)">
            <i class="fa-solid fa-ticket"></i><span>View Ticket</span>
          </button>
        </div>
      </article>
      <p v-if="!historyEvents.length" class="empty">No past events</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const user = ref({ name: '', email: '' })
const tab = ref('upcoming')
const events = ref([])

// ✅ โหลดข้อมูล user จาก localStorage
onMounted(async () => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    user.value = JSON.parse(storedUser)
  } else {
    console.warn('⚠️ No user found in localStorage.')
  }

  try {
    const res = await axios.get('http://localhost:8080/api/events/my-tickets')
    events.value = res.data
  } catch (err) {
    console.error('❌ Failed to fetch events:', err)
  }
})

const upcomingEvents = computed(() => {
  const now = new Date()
  return events.value.filter(e => new Date(e.date) >= now)
})

const historyEvents = computed(() => {
  const now = new Date()
  return events.value.filter(e => new Date(e.date) < now)
})

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function viewTicket(id) {
  window.location.href = `/ticket/${id}`
}
</script>


<style scoped>
:root{
  --brand-blue:#1e88ff;
  --line:#e9edf2;
  --muted:#667085;
  --text:#121417;
  --accent:#ff6a00;
  --surface:#fff;
}

.event-section{max-width:920px;margin:0 auto;padding:24px 20px 56px;}
.title-row{display:flex;align-items:center;gap:10px;width:fit-content;padding:10px 14px;border:3px solid var(--brand-blue);border-radius:4px;margin-bottom:5px;}
.title-row h2{font-size:22px;font-weight:800;color:var(--text);}
.title-icon{width:22px;height:22px;color:var(--brand-blue);}

.profile-box{display:flex;align-items:center;gap:14px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px;box-shadow:0 1px 0 rgba(0,0,0,.04);margin:12px 0 18px;}
.avatar{width:48px;height:48px;border-radius:50%;background:#f2f4f7;color:#2f2f2f;display:inline-flex;align-items:center;justify-content:center;font-size:22px;}
.info{flex:1;min-width:0;}
.name{font-weight:700;color:var(--text);}
.email{margin-top:0px;font-size:14px;color:var(--muted);}
.edit-btn{padding:6px 10px;font-size:13px;border:1px solid #d6e7ff;color:#1877f2;background:#eef6ff;border-radius:999px;cursor:pointer;}

.tabs {
  display: flex;
  gap: 2rem;
  border-bottom: 2px solid #e5e7eb;
  margin: 1.5rem 0 1rem;
}

.tab {
  position: relative;
  background: none;
  border: none;
  font-weight: 700;
  font-size: 1.05rem;
  color: #1f2937;
  padding: 0.5rem 0;
  cursor: pointer;
  transition: color 0.2s ease-in-out;
}

.tab:hover {
  color: #007bff;
}

.tab.active {
  color: #007bff;
}

.tab.active::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 100%;
  height: 3px;
  background-color: #007bff;
  border-radius: 2px;
  transition: all 0.25s ease-in-out;
}

.event-card{display:grid;grid-template-columns:120px 1fr;gap:16px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:14px;box-shadow:0 1px 0 rgba(0,0,0,.05);}
.poster{width:120px;height:160px;object-fit:cover;border-radius:10px;border:1px solid #ddd;}
.event-info .date{font:600 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:#525252;margin-bottom:6px;}
.event-title{font-size:22px;font-weight:900;color:var(--text);margin:2px 0 6px;}
.location{color:#374151;margin-bottom:12px;}

.view-btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;}
.view-btn i{font-size:14px;}

.empty{text-align:center;color:#98a2b3;margin-top:28px;}

@media (max-width:640px){
  .event-card{grid-template-columns:88px 1fr;}
  .poster{width:88px;height:124px;}
  .event-title{font-size:18px;}
}
</style>