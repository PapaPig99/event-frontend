<template>
  <section class="events-page">

    <!-- CENTER: Event List -->
    <main class="center-panel">

      <!-- Header -->
      <header class="center-header">
        <h2>All Events</h2>

        <RouterLink to="/admin/create">
          <button class="btn-add">+ Create Event</button>
        </RouterLink>
      </header>

      <!-- FILTER BAR -->
      <div class="filters">

        <!-- Search -->
        <input v-model="qTitle" type="text" placeholder="Search event..." class="input" />

        <!-- Category Chips -->
        <div class="chips">
          <div v-for="c in categoryOptions" :key="c.key" :class="['chip', { active: selectedCats.includes(c.key) }]"
            @click="toggleCategory(c.key)">
            {{ c.label }}
          </div>
        </div>

        <!-- Clear -->
        <button v-if="selectedCats.length || qTitle" class="clear-btn" @click="clearAll">
          Clear filters
        </button>
      </div>

      <!-- Event List -->
      <div class="list-box">
        <div v-for="ev in filteredEvents" :key="ev.id" :class="['event-item', { active: ev.id === selectedEvent?.id }]"
          @click="selectEvent(ev)">
          <img :src="ev.posterImageUrl || '/no-image.png'" alt="event cover" class="ev-image" />

          <div class="ev-info">
            <div class="ev-title">{{ ev.title }}</div>
            <div class="ev-meta">
              {{ ev.category }} •
              <span :class="['status-pill', ev.status === 'OPEN' ? 'open' : 'closed']">
                {{ ev.status }}
              </span>
            </div>

          </div>

        </div>

        <div v-if="filteredEvents.length === 0" class="empty-text">
          No events found
        </div>
      </div>
    </main>

    <!-- RIGHT: Detail Panel -->
    <aside class="right-panel" v-if="selectedEvent">
      <h2 class="detail-title">{{ selectedEvent.title }}</h2>

      <div class="detail-row">
        <span>Category:</span> {{ selectedEvent.category }}
      </div>
      <div class="detail-row">
        <span>Status:</span> {{ selectedEvent.status }}
      </div>

      <div class="detail-row">
        <span>Location:</span> {{ selectedEvent.location }}
      </div>

      <div class="actions">
        <button class="btn-light" @click="onView(selectedEvent.id)">View</button>
        <button class="btn-light" @click="onEdit(selectedEvent.id)">Edit</button>
        <button class="btn-danger" @click="onRemove(selectedEvent.id)">Delete</button>
      </div>
    </aside>

    <aside class="right-panel empty" v-else>
      <div class="empty-text">Select an event</div>
    </aside>

  </section>
</template>
<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import api from "@/lib/api";

const router = useRouter();

const events = ref([]);
const selectedEvent = ref(null);

onMounted(async () => {
  const res = await api.get("/events");
  events.value = res.data;
});

/* -------- Event actions -------- */
function selectEvent(ev) {
  selectedEvent.value = ev;
}
function onView(id) {
  router.push(`/admin/events/${id}/detail`);
}
function onEdit(id) {
  router.push(`/admin/events/${id}/edit`);
}
async function onRemove(id) {
  if (!confirm("Delete this event?")) return;
  await api.delete(`/events/${id}`);
  events.value = events.value.filter(e => e.id !== id);
  selectedEvent.value = null;
  alert("Event deleted");
}

/* -------- Filters -------- */
const qTitle = ref("");
const selectedCats = ref([]);

const categoryOptions = [
  { key: "concert", label: "Concert" },
  { key: "show", label: "Show" },
  { key: "education", label: "Education" },
  { key: "business", label: "Business" },
  { key: "sport", label: "Sport" },
];


function toggleCategory(c) {
  if (selectedCats.value.includes(c)) {
    selectedCats.value = selectedCats.value.filter(x => x !== c);
  } else {
    selectedCats.value.push(c);
  }
}

function clearAll() {
  qTitle.value = "";
  selectedCats.value = [];
}

const filteredEvents = computed(() => {
  const keyword = qTitle.value.toLowerCase();
  const selected = new Set(selectedCats.value);

  return events.value.filter(ev => {
    const catMatch = selected.size === 0 || selected.has(ev.category);
    const nameMatch = ev.title.toLowerCase().includes(keyword);
    return catMatch && nameMatch;
  });
});
</script>
<style scoped>
.events-page {
  display: flex;
  height: calc(100vh - var(--header-h));
  background: #fafafa;
  font-family: system-ui, sans-serif;
}

/* CENTER */
.center-panel {
  flex: 1;
  padding: 32px;
}

/* Header */
.center-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* ADD Button */
.btn-add {
  background: #ffffff;
  border: 1px solid #ccc;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.btn-add:hover {
  background: #f2f2f2;
}

/* Filters */
.filters {
  background: #fff;
  border: 1px solid #e5e5e5;
  padding: 16px 20px;
  margin-top: 20px;
  border-radius: 12px;

  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Search input */
.input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #ccc;
  background: #fafafa;
  font-size: 14px;
}

/* Category Chips */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  padding: 6px 14px;
  background: #f2f2f2;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: #444;
  transition: 0.15s;
  border: 1px solid transparent;
}

.chip:hover {
  background: #e8e8e8;
}

.chip.active {
  background: #dcdcdc;
  border-color: #bfbfbf;
  font-weight: 500;

}

/* Clear button */
.clear-btn {
  background: none;
  border: none;
  color: #5465FF;
  cursor: pointer;
  font-size: 13px;
  padding: 0;
  align-self: flex-end;
  margin-top: -6px;
}


/* Event list */
.list-box {
  margin-top: 20px;
}

.event-item {
  display: flex;
  gap: 12px;
  align-items: center;
  background: #fff;
  padding: 14px;
  border: 1px solid #e5e5e5;
  margin-bottom: 10px;
  border-radius: 6px;
  cursor: pointer;
}

.event-item.active {
  border: 1px solid #cccccc;
  background: #f0f0f0;
}

.ev-image {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 6px;
}

.event-item:hover {
  background: #f7f7f7;
}

/* Detail panel (right) */
.right-panel {
  width: 300px;
  background: white;
  border-left: 1px solid #e5e5e5;
  padding: 24px;
}

.btn-light {
  background: #fff;
  border: 1px solid #ccc;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
  transition: 0.15s;
}

.btn-danger {
  background: #FF3336;
  color: #fff;
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-light:hover {
  background: #f2f2f2;
}

.actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.status-pill.open {
  color: #16A34A;
  font-weight: 500; 
}

.status-pill.closed {
  color: #DC2626;
  font-weight: 500; 

}
</style>
