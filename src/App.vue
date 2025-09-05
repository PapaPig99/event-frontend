<script setup>
import { ref, computed } from 'vue'
import EventZigzagStrip from './components/EventZigzagStrip.vue'

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
])

const posters = [
  { id:1, img:'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop' },
  { id:2, img:'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=800&auto=format&fit=crop' },
  { id:3, img:'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop' },
  { id:4, img:'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800&auto=format&fit=crop' },
  { id:5, img:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop' },
  { id:6, img:'https://images.unsplash.com/photo-1542401886-65d6c61db217?q=80&w=800&auto=format&fit=crop' },
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
          <div class="search">
            <input v-model="query" placeholder="พิมพ์ชื่ออีเวนต์ หรือ รายละเอียด"/>
            <button @click="onSearch">ค้นหา</button>
          </div>
        </div>

        <!-- แถวโปสเตอร์ใหญ่แบบเลื่อน -->
        <section class="container section">
    <h3 style="margin-bottom:10px">อีเวนต์มาแรง</h3>
    <EventZigzagStrip :items="posters" :height="300" :gap="28" />
  </section>
      </div>
    </header>

    <!-- แนะนำสำหรับคุณ -->
    <section class="container section">
      <div class="section-header">
        <h3>แนะนำสำหรับคุณ</h3>
        <button class="link-more">เพิ่มเติม</button>
      </div>

      <div class="grid">
        <article v-for="e in displayRecommended" :key="e.id" class="card">
          <div class="thumb">
            <img :src="e.img" :alt="e.title"/>
            <div class="badge-date">{{ e.date }}</div>
          </div>
          <div class="body">
            <h4 class="name">{{ e.title }}</h4>
            <div class="meta">
              <span>{{ e.location }}</span><span class="dot"></span><span>{{ e.city }}</span>
            </div>
            <div class="footer">
              <span class="price-pill">{{ e.price>0 ? `฿${e.price.toLocaleString()}` : 'Free' }}</span>
              <button class="buy-btn">จองบัตร</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
