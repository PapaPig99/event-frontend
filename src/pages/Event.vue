<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '../components/Card.vue'

/* ---------- Router / URL state ---------- */
const route = useRoute()
const router = useRouter()

// คำค้น & หมวด อ้างอิงจาก URL เป็นหลัก
const q   = ref<string>(String(route.query.q   ?? ''))
const cat = ref<string>(String(route.query.cat ?? ''))

// รับค่าจาก URL เมื่อมีการเปลี่ยน (เช่น กด back/forward หรือเปิดลิงก์แชร์)
watch(() => route.query.q,   v => { q.value   = String(v ?? '') })
watch(() => route.query.cat, v => { cat.value = String(v ?? '') })

// อัปเดต URL ระหว่างพิมพ์ (รักษา cat เดิมไว้) — ไม่ดัน history
watch(q, (val) => {
  router.replace({
    name: 'event-list',
    query: { ...route.query, q: val || undefined, cat: cat.value || undefined }
  })
})

// กดปุ่มหมวด → toggle และอัปเดต URL (รักษา q เดิมไว้)
function setCat(next: string) {
  cat.value = (cat.value === next) ? '' : next
  router.replace({
    name: 'event-list',
    query: { ...route.query, q: q.value || undefined, cat: cat.value || undefined }
  })
}

/* ---------- Data loading ---------- */
type AnyEvent = Record<string, any>
const events   = ref<AnyEvent[]>([])
const loading  = ref(true)
const error    = ref<string|null>(null)

const API_HOST = import.meta.env.VITE_API_HOST || ''
const toAbs  = (u?: string) => !u ? '' : (u.startsWith('http') ? u : API_HOST + u)
const first  = (...xs: any[]) => xs.find(x => x != null && x !== '')

function mapEvent(e: AnyEvent) {
  return {
    id: e.id,
    title: e.title ?? e.name ?? 'Untitled',
    description: e.description ?? '',
    date: first(e.start_date, e.startDate, e.date) ?? '',
    location: e.location ?? e.venue ?? '',
    img: toAbs(first(e.poster_image_url, e.posterImageUrl, e.detail_image_url, e.detailImageUrl)),
    category: e.category ?? e.type ?? '',
    tags: Array.isArray(e.tags) ? e.tags : [],
    status: e.status ?? '',
  }
}

async function loadEvents () {
  try {
    const res = await fetch('/api/events')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    events.value = data.map(mapEvent)
  } catch (err: any) {
    error.value = String(err?.message ?? err)
  } finally {
    loading.value = false
  }
}
onMounted(loadEvents)

/* ---------- Filter ---------- */
const filtered = computed(() => {
  const term   = q.value.trim().toLowerCase()
  const wanted = cat.value.trim().toLowerCase()

  return events.value.filter(e => {
    const bag = [
      e.title, e.description, e.location, e.category,
      ...(Array.isArray(e.tags) ? e.tags : [])
    ].map(v => String(v ?? '').toLowerCase())

    const matchQ   = !term   || bag.some(t => t.includes(term))
    const matchCat = !wanted || String(e.category ?? '').toLowerCase().includes(wanted)
    const matchStatus = e.status === 'OPEN'   
  return matchQ && matchCat && matchStatus 
  })
})

/* ---------- Navigate to detail ---------- */
const openEvent = (id: number | string) => router.push(`/event/${id}`)
</script>

<template>
  <div class="event-page">
    <!-- HERO -->
    <section class="hero fullbleed">
      <div class="container">
        <h1 class="hero-title">
          กำลังมองหา <span class="accent">อีเว้นท์</span> อะไร ?
        </h1>

        <!-- Search -->
        <div class="search-wrap">
          <form class="search" @submit.prevent>
            <input
              v-model="q"
              type="text"
              placeholder="พิมพ์ชื่ออีเว้นท์ หรือ รายละเอียด"
              aria-label="ค้นหาอีเว้นท์"
            />
            <button type="submit">ค้นหา</button>
          </form>
        </div>

        <!-- Categories -->
        <div class="pill-row">
          <button type="button" class="pill" :class="{active: cat==='concert'}"
                  @click="setCat('concert')">คอนเสิร์ต</button>

          <button type="button" class="pill" :class="{active: cat==='show'}"
                  @click="setCat('show')">การแสดง</button>

          <button type="button" class="pill" :class="{active: cat==='education'}"
                  @click="setCat('education')">การศึกษา</button>
                  
          <button type="button" class="pill" :class="{active: cat==='business'}"
                  @click="setCat('business')">ธุรกิจและการลงทุน</button>

          <button type="button" class="pill" :class="{active: cat==='sport'}"
                  @click="setCat('sport')">กีฬา</button>
            
        </div>
      </div>
    </section>

    <!-- Results -->
    <section class="results">
      <div class="container">
        <div v-if="loading">กำลังโหลด…</div>
        <div v-else-if="error">โหลดข้อมูลไม่สำเร็จ: {{ error }}</div>
        <div v-else class="grid">
          <Card v-for="e in filtered" :key="e.id" :event="e" @open="openEvent" />
        </div>
      </div>
    </section>
  </div>
</template>

<!-- ==== Global ==== -->
<style>
body { margin: 0; }
#app { max-width: none; padding: 0; }
</style>

<!-- ==== Page styles ==== -->
<style scoped>
.fullbleed {
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
}
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

/* HERO */
.hero { background: linear-gradient(-120deg, #20f00d5b, #4cf3ff82); padding: 42px 0 24px; text-align: center; }
.hero-title { font-size: 36px; font-weight: 800; margin: 8px 0 18px; color: #0f172a; }
.accent { color: #ff3d00; }

/* Search */
.search-wrap { margin: 26px 0 12px; display: flex; justify-content: center; }
.search {
  width: 680px; max-width: 100%;
  display: flex; gap: 10px;
  background: #fff; border-radius: 30px; padding: 10px 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,.08); margin-bottom: 20px;
}
.search input {
  flex: 1; border: none; outline: none; font-size: 14px;
  padding: 10px 12px; border-radius: 20px; background: #f4f5f7;
}
.search button {
  background: var(--orange, #ff6a13);
  border: none; color: #fff; padding: 10px 18px;
  border-radius: 22px; font-weight: 700; cursor: pointer;
}

/* Categories */
.pill-row { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; margin: 10px 0 12px; }
.pill {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 999px;
  padding: 10px 18px; font-weight: 600; font-size: 14px; color: #111827; cursor: pointer;
  transition: all .15s ease;
}
.pill.active {
  background:#ff6a13; color:#fff; border-color:#ff6a13;
  box-shadow:0 6px 14px rgba(255,106,19,.25);
}

/* Results */
.results { padding: 36px 0 24px; }
.grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 28px 36px; justify-items: center;
}

/* Responsive */
@media (max-width: 1200px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px)  { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px)  { .grid { grid-template-columns: 1fr; } .hero-title { font-size: 28px; } }
</style>
