<script setup>
import { ref, computed, onMounted } from 'vue'
import EventZigzagStrip from '../components/EventZigzagStrip.vue'
import RecommendedSection from '../components/RecomSec.vue'
import ArtistStrip from '../components/ArtistStrip.vue'
import stripUrl from '../assets/artist.png' 

import { useRouter } from 'vue-router'

const router = useRouter()
function openEvent(id){ router.push(`/event/${id}`) }
const query = ref('')


function goSearch(){
  const q = query.value.trim()
  router.push({ name: 'event-list', query: q ? { q } : {} })
}

// “แนะนำสำหรับคุณ” (demo data)
const recommended = ref([])
const loading = ref(true)
const error = ref(null)
const API_HOST = import.meta.env.VITE_API_HOST || ''

const toAbs = (u) => !u ? '' : (u.startsWith('http') ? u : API_HOST + u)
const first = (...xs) => xs.find(x => x != null && x !== '')

// ✅ ใช้อันนี้แทนของเดิม
function mapSummaryToCard(e) {
  const first = (...xs) => xs.find(x => x != null && x !== '')
  const toAbs = (u) => !u ? '' : (u.startsWith('http') ? u : (import.meta.env.VITE_API_HOST || '') + u)

  return {
    id: e.id,
    title: e.title ?? e.name ?? 'Untitled',
    date: first(e.startDate, e.start_date, e.date) ?? '',
    location: e.location ?? e.venue ?? '',
    img: toAbs(first(
      e.posterImageUrl, e.poster_image_url,
      e.detailImageUrl, e.detail_image_url
    )),
    // 👇 สำคัญที่สุด
    category: e.category ?? e.type ?? '',
    tags: Array.isArray(e.tags) ? e.tags : []
  }
}

async function loadEvents() {
  try {
    const res = await fetch('/api/events')   // ผ่าน proxy
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    recommended.value = data.map(mapSummaryToCard)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(loadEvents)


const posters = [
  { id:1, img:'https://res.theconcert.com/w_450,h_600,c_thumb/7b0cbc4598de3efdd357e1c658d54a4a4/06sep.jpg' },
  { id:2, img:'https://eventpassinsight-bucket.s3.ap-southeast-1.amazonaws.com/production/files/1755684541498-YSH-SNS-DETAIL_KV-650x850.webp' },
  { id:3, img:'https://eventpassinsight-bucket.s3.ap-southeast-1.amazonaws.com/production/files/1755665532342-45.webp' },
  { id:4, img:'https://res.theconcert.com/w_450,h_600,c_thumb/02e29d183f90741d3a5c0eb9826d4ac72/ef3999c2-8908-49cb-882d-1989aa309d7a.png' },
  { id:5, img:'https://res.theconcert.com/w_450,h_600,c_thumb/c47fee5f28e81a862540fdd0709d1a4b8/419029.jpg' },
  { id:6, img:'https://res.theconcert.com/w_450,h_600,c_thumb/0d9d047e7de7f3915ede10fb80793aedd/resize_tcc_450x600px.jpg' },
  { id:7, img:'https://eventpassinsight-bucket.s3.ap-southeast-1.amazonaws.com/production/files/1756286335973-20250827-161826.webp' },
  { id:8, img:'https://res.theconcert.com/w_450,h_600,c_thumb/639d8869499c1a5aacde0acb75a6ca22a/circus-03_0.jpg' },
]
const displayRecommended = computed(() =>
  recommended.value.filter(e =>
    e.title.toLowerCase().includes(query.value.trim().toLowerCase())
  )
)

function onSearch(){
  // ต่อ API ภายหลังได้; ตอนนี้กรองในหน้า
}
</script>

<template>
  <div>
    <!-- HERO -->
    <header class="hero">
      <div class="container">
        <h1 class="title">
          ALL THE <span class="underline">EVENT</span><br/>
          YOU CAN’T MISS
        </h1>

        <div class="search-wrap">
    <form class="search" @submit.prevent="goSearch">
      <input
        v-model="query"
        placeholder="พิมพ์ชื่ออีเวนต์ หรือ รายละเอียด"
        @keyup.enter.prevent="goSearch"
      />
      <button type="submit">ค้นหา</button>
    </form>
  </div>

        <!-- แถวโปสเตอร์ใหญ่แบบเลื่อน -->
        <section class="container section">
           <EventZigzagStrip :items="posters" />
        </section>
      </div>
    </header>
    <div class="page">
    <div v-if="loading">กำลังโหลด…</div>
    <div v-else-if="error">โหลดข้อมูลไม่สำเร็จ: {{ error }}</div>
<RecommendedSection v-else :events="displayRecommended" title="แนะนำสำหรับคุณ" @open="openEvent"/>  </div>



  <main style="padding:24px;">
    <h1 class="title">ARTIST</h1>
<ArtistStrip :src="stripUrl" :speed="0.6" />
  </main>

<RecommendedSection
  :events="displayRecommended"
  title="ธุรกิจและการลงทุน"
  category="business"
  @open="openEvent"/>
   


  </div>
</template>