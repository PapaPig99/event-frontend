<script setup>
import { ref, computed } from 'vue'
import EventZigzagStrip from './components/EventZigzagStrip.vue'
import NavBar from './components/NavBar.vue'
import RecommendedSection from './components/RecomSec.vue'
import Footer from './components/Footer.vue'

const query = ref('')
const featured = ref([
  { id:1, title:'JACKSON WANG - Magic Man', date:'SEP 12', img:'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop', location:'Impact Arena', city:'Bangkok', price:3500 },
  { id:2, title:'KBTG TECHTOPIA 2025', date:'SEP 13', img:'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=800&auto=format&fit=crop', location:'KBTG Park', city:'Bangkok', price:0 },
  { id:3, title:'BITKUB SUMMIT 2025', date:'OCT 5', img:'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop', location:'QSNCC', city:'Bangkok', price:1500 },
  { id:4, title:'GREENDAY TOUR', date:'FEB 25', img:'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800&auto=format&fit=crop', location:'Impact Arena', city:'Bangkok', price:4200 },
])

// “แนะนำสำหรับคุณ” (demo data)
const recommended = ref([
  { id:11, title:'DOL CIBEL Live', date:'SEP 7',  img:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop', location:'SOMEWHERE', city:'Bangkok', price:999 },
  { id:12, title:'JACKSON WANG - Magic Man', date:'SEP 12', img:'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop', location:'Impact Arena', city:'Bangkok', price:3500 },
  { id:13, title:'One Championship', date:'OCT 4', img:'https://images.unsplash.com/photo-1542401886-65d6c61db217?q=80&w=800&auto=format&fit=crop', location:'Impact', city:'Bangkok', price:1200 },
  { id:14, title:'Idol Festival', date:'AUG 28', img:'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?q=80&w=800&auto=format&fit=crop', location:'Thunder Dome', city:'Nonthaburi', price:850 },
  { id:15, title:'Tech Career Fair', date:'SEP 22', img:'https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=800&auto=format&fit=crop', location:'QSNCC', city:'Bangkok', price:0 },
  { id:16, title:'DOL CIBEL Live', date:'SEP 7',  img:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop', location:'SOMEWHERE', city:'Bangkok', price:999 },
  { id:17, title:'JACKSON WANG - Magic Man', date:'SEP 12', img:'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop', location:'Impact Arena', city:'Bangkok', price:3500 },
  { id:18, title:'One Championship', date:'OCT 4', img:'https://images.unsplash.com/photo-1542401886-65d6c61db217?q=80&w=800&auto=format&fit=crop', location:'Impact', city:'Bangkok', price:1200 },
  { id:19, title:'Idol Festival', date:'AUG 28', img:'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?q=80&w=800&auto=format&fit=crop', location:'Thunder Dome', city:'Nonthaburi', price:850 },
  { id:20, title:'Tech Career Fair', date:'SEP 22', img:'https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=800&auto=format&fit=crop', location:'QSNCC', city:'Bangkok', price:0 },
])

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
    <NavBar />
    <!-- HERO -->
    <header class="hero">
      <div class="container">
        <h1 class="title">
          ALL THE <span class="underline">EVENT</span><br/>
          YOU CAN’T MISS
        </h1>

        <div class="search-wrap">
          <div class="search">
            <input v-model="query" placeholder="พิมพ์ชื่ออีเวนต์ หรือ รายละเอียด"/>
            <button @click="onSearch">ค้นหา</button>
          </div>
        </div>

        <!-- แถวโปสเตอร์ใหญ่แบบเลื่อน -->
        <section class="container section">
           <EventZigzagStrip :items="posters" />
        </section>
      </div>
    </header>
    <main class="container">
    <RecommendedSection :events="recommended" title="แนะนำสำหรับคุณ" />
    </main>


    <!-- Footer -->
    <Footer />


  </div>
</template>
