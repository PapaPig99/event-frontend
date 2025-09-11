<script setup>
import { ref, computed, onMounted } from 'vue'
import Card from '../components/Card.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const openEvent = (id) => router.push(`/event/${id}`)

const query = ref('')
const events = ref([])          // ← เก็บทั้งหมดจาก API
const loading = ref(true)
const error = ref(null)

const API_HOST = import.meta.env.VITE_API_HOST || ''
const toAbs = (u) => !u ? '' : (u.startsWith('http') ? u : API_HOST + u)
const first = (...xs) => xs.find(x => x != null && x !== '')

function mapEvent(e) {
  return {
    id: e.id,
    title: e.title ?? e.name ?? 'Untitled',
    date: first(e.start_date, e.startDate, e.date) ?? '',
    location: e.location ?? e.venue ?? '',
    img: toAbs(first(
      e.poster_image_url, e.posterImageUrl,
      e.detail_image_url, e.detailImageUrl
    ))
  }
}

async function loadEvents () {
  try {
    const res = await fetch('/api/events')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    events.value = data.map(mapEvent)
  } catch (err) {
    error.value = String(err?.message ?? err)
  } finally {
    loading.value = false
  }
}

onMounted(loadEvents)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? events.value.filter(e => e.title.toLowerCase().includes(q)) : events.value
})
</script>

<template>
  
  <div class="event-page">
    <AppHome />

    <!-- HERO (พื้นหลัง gradient เต็มความกว้าง, เนื้อหาอยู่กึ่งกลาง) -->
    <section class="hero fullbleed">
  <div class="container">
    <h1 class="hero-title">
      กำลังมองหา <span class="accent">อีเว้นท์</span> อะไร ?
    </h1>

    <!-- Search -->
    <div class="search-wrap">
      <form class="search" @submit.prevent>
        <input
          type="text"
          placeholder="พิมพ์ชื่ออีเว้นท์ หรือ รายละเอียด"
          aria-label="ค้นหาอีเว้นท์"
        />
        <button type="submit">ค้นหา</button>
      </form>
    </div>

    <!-- Categories -->
    <div class="pill-row">
      <button class="pill">คอนเสิร์ต</button>
      <button class="pill">การแสดง</button>
      <button class="pill">การศึกษา</button>
      <button class="pill">ธุรกิจและการลงทุน</button>
      <button class="pill">กีฬา</button>
    </div>
  </div>
</section>

     <!-- GRID ผลลัพธ์อีเวนต์ -->
    <section class="results">
      <div class="container">
        <div v-if="loading">กำลังโหลด…</div>
        <div v-else-if="error">โหลดข้อมูลไม่สำเร็จ: {{ error }}</div>

        <div v-else class="grid">
          <Card
            v-for="e in filtered"
            :key="e.id"
            :event="e"
            @open="openEvent"  
          />
        </div>

        <div v-if="!loading && !error" class="more-row">
          <button class="more-btn">เพิ่มเติม</button>
        </div>
      </div>
    </section>


  </div>
</template>

<!-- ==== Global: ให้แสดงเต็มหน้าจอแม้ template Vite จะ fix #app ==== -->
<style>
body { margin: 0; }
#app { max-width: none; padding: 0; } /* กันโดนบีบความกว้าง */
</style>

<!-- ==== Styles ของหน้านี้ ==== -->
<style scoped>
/* full-bleed: บังคับ section ให้กินเต็ม viewport width */
.fullbleed {
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
}

.container {
  max-width: 1200px;            /* ขนาดคอนเทนต์ตามภาพ */
  margin: 0 auto;
  padding: 0 20px;
}

/* HERO */
.hero {
  background: linear-gradient(90deg, #a8edea, #fed6e3);
  padding: 42px 0 24px;
  text-align: center;
}
.hero-title {
  font-size: 36px;
  font-weight: 800;
  margin: 8px 0 18px;
  color: #0f172a;               /* น้ำเงินเข้ม */
}
.accent { color: #ff3d00; }     /* คำว่า “อีเว้นท์” สีส้มแดงตามภาพ */

/* Search bar + ปุ่ม */
.search-wrap {
  margin: 26px 0 12px;
  display: flex;
  justify-content: center;
}

.search {
  width: 680px;
  max-width: 100%;
  display: flex;
  gap: 10px;
  background: #fff;
  border-radius: 30px;
  padding: 10px 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,.08);
  margin-bottom: 20px;
}

.search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: 20px;
  background: #f4f5f7;
}

.search button {
  background: var(--orange); /* ใช้สี theme */
  border: none;
  color: #fff;
  padding: 10px 18px;
  border-radius: 22px;
  font-weight: 700;
  cursor: pointer;
}

/* หมวดหมู่ */
.pill-row {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  margin: 10px 0 12px;
}
.pill {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 10px 18px;
  font-weight: 600;
  font-size: 14px;
  color: #111827;
  cursor: pointer;
}

/* GRID 4 คอลัมน์เหมือนภาพ (สองแถว) */
.results {
  padding: 36px 0 24px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 28px 36px;
  justify-items: center; /* ให้การ์ดอยู่กึ่งกลางคอลัมน์ */
}

/* ปุ่มเพิ่มเติม */
.more-row {
  display: flex;
  justify-content: center;
  margin: 34px 0 56px;
}
.more-btn {
  background: #fff;
  color: #ff6a13;
  border: 1.5px solid #ff6a13;
  padding: 10px 22px;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

/* ปรับบนจอแคบ */
@media (max-width: 1200px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .grid { grid-template-columns: 1fr; }
  .hero-title { font-size: 28px; }
}
</style>
