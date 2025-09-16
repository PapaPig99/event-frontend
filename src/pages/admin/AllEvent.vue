<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// หมวดหมู่ (หัวคอลัมน์)
const categories = [
  { key: 'concert',   label: 'คอนเสิร์ต',       color: '#4F46E5' },
  { key: 'show',      label: 'การแสดง',         color: '#F59E0B' },
  { key: 'edu',       label: 'การศึกษา',        color: '#8B5CF6' },
  { key: 'business',  label: 'ธุรกิจและการงาน', color: '#10B981' },
  { key: 'sport',     label: 'กีฬา',            color: '#6B7280' },
]

// ช่องค้นหาของแต่ละคอลัมน์
const searches = ref(Object.fromEntries(categories.map(c => [c.key, ''])))

// ข้อมูลตัวอย่าง (เชื่อม API จริงค่อยแทนที่)
const events = ref([
  { id: 1, name: 'MARIAH CAREY Mimi Live in Bangkok', category: 'concert', posterUrl: '/src/assets/NCT.jpg' },
  // … เพิ่มได้
])

// filter อีเวนต์ตามหมวด + คำค้น
function eventsIn (catKey) {
  const kw = (searches.value[catKey] || '').toLowerCase()
  return events.value.filter(e =>
    e.category === catKey &&
    (!kw || (e.name || '').toLowerCase().includes(kw))
  )
}

function posterOf (ev) {
  return ev.posterUrl || '/src/assets/vite.svg'
}

function goCreate () {
  router.push('/create-event')
}

function goEdit (id) {
  router.push(`/admin/events/${id}/edit`)
}
</script>

<template>
  <div class="wrap">
    <header class="toolbar">
      <div class="title">All Events</div>
      <button class="btn add" @click="goCreate">+ เพิ่มอีเวนต์</button>
    </header>

    <div class="board">
      <!-- คอลัมน์แต่ละหมวด -->
      <section
        v-for="cat in categories"
        :key="cat.key"
        class="column"
      >
        <header class="column-head">
          <span class="badge" :style="{ background: cat.color }"></span>
          <span class="col-title">{{ cat.label }}</span>
          <input
            class="search"
            :placeholder="`ค้นหาในหมวด ${cat.label}`"
            v-model="searches[cat.key]"
          />
        </header>

        <div class="column-body">
          <!-- ใส่ v-for บนการ์ดโดยตรง (แก้ error) -->
          <div
            v-for="ev in eventsIn(cat.key)"
            :key="ev.id"
            class="event-card"
            @click="goEdit(ev.id)"
          >
            <div class="poster">
              <img :src="posterOf(ev)" alt="" />
            </div>
            <div class="meta">
              <div class="name" :title="ev.name">{{ ev.name }}</div>
            </div>
          </div>

          <div v-if="eventsIn(cat.key).length === 0" class="empty">
            — ไม่มีอีเวนต์ —
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.wrap{ padding:16px; }
.toolbar{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.title{ font-weight:700; font-size:18px; }
.btn.add{ background:#3b82f6; color:#fff; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; }
.board{ display:grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap:12px; }

.column{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; display:flex; flex-direction:column; min-height:380px; }
.column-head{ display:flex; align-items:center; gap:8px; padding:10px; border-bottom:1px solid #e5e7eb; }
.badge{ width:12px; height:12px; border-radius:999px; display:inline-block; }
.col-title{ font-weight:600; }
.search{ margin-left:auto; height:32px; border:1px solid #e5e7eb; border-radius:8px; padding:0 10px; min-width:120px; }

.column-body{ padding:10px; display:grid; gap:10px; grid-auto-rows: max-content; }
.event-card{ border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; cursor:pointer; background:#fafafa; transition:transform .06s ease; }
.event-card:hover{ transform:translateY(-1px); }
.poster{ width:100%; aspect-ratio: 3/4; background:#f3f4f6; display:grid; place-items:center; overflow:hidden; }
.poster img{ width:100%; height:100%; object-fit:cover; }
.meta{ padding:8px; }
.name{ font-size:13px; font-weight:600; line-height:1.3; display:-webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow:hidden; }

.empty{ color:#9ca3af; text-align:center; padding:18px 0; }
@media (max-width: 1200px){ .board{ grid-template-columns: repeat(3, minmax(0,1fr)); } }
@media (max-width: 800px){ .board{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (max-width: 560px){ .board{ grid-template-columns: 1fr; } }
</style>
