<template>
  <div class="plan-page">
    <!-- แถว Back -->
    <div class="back-row">
      <button class="back-btn" @click="goBack">← ย้อนกลับ</button>
    </div>

    <!-- การ์ดหัวเรื่อง gradient -->
    <section class="hero-card">
      <!-- โปสเตอร์ -->
      <div class="poster-wrap">
        <!-- TODO: เปลี่ยน poster เป็นไฟล์จริง (URL หรือไฟล์ใน src/assets) -->
        <img :src="poster" alt="Poster" class="poster" />
      </div>

      <!-- ข้อมูล -->
      <div class="hero-info">
        <h1 class="event-title">{{ title }}</h1>

        <div class="link-row">
          <!-- TODO: แก้ id ให้ตรงกับ event จริง หรือผูกจาก route param -->
          <router-link :to="{ name: 'event-detail', params: { id: routeId || 1 } }" class="link-chip">
            รายละเอียด →
          </router-link>
        </div>

        <div class="chip-row">
          <div class="show-chip">
            <label for="show" class="show-label">รอบการแสดง</label>
            <select v-model="selectedShow" id="show" aria-label="รอบการแสดง">
              <option v-for="(s,i) in shows" :key="i" :value="s">{{ s }}</option>
            </select>
          </div>

          <button class="status-chip">ที่นั่งว่าง</button>
        </div>
      </div>
    </section>

    <!-- Stepper -->
    <section class="stepper">
      <div class="step active">
        <div class="ball">1</div>
        <div class="label">ดูผังและที่นั่ง</div>
      </div>
      <div class="line"></div>
      <div class="step">
        <div class="ball">2</div>
        <div class="label">เลือกประเภทที่นั่ง</div>
      </div>
      <div class="line"></div>
      <div class="step">
        <div class="ball">3</div>
        <div class="label">ชำระเงิน</div>
      </div>
    </section>

    <!-- หัวข้อ -->
    <h2 class="section-title">ดูผังการแสดง</h2>

    <!-- ผังการแสดง -->
    <div class="seatmap-wrap">
      <!-- TODO: เปลี่ยน seatmap เป็นรูปใหญ่ของจริง -->
      <img :src="seatmap" alt="Seat map" class="seatmap-img" />
    </div>

    <!-- CTA -->
    <div class="cta-row">
      <!-- TODO: ผูกไปหน้าถัดไป (เช่น /event/:id/plan/zone) -->
      <button class="next-btn" @click="goNext">ถัดไป</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/* ===== Router utils ===== */
const router = useRouter()
const route = useRoute()
const routeId = computed(() => route.params.id)

/* ===== ปุ่มย้อนกลับ ===== */
const goBack = () => router.back()

/* ===== เป้าหมายปุ่มถัดไป (ตัวอย่าง) ===== */
const goNext = () => {
  // TODO: ปรับปลายทางจริง เช่นไปหน้าที่เลือกโซน/ราคา
  if (routeId.value) {
    router.push({ name: 'concert-plan', params: { id: routeId.value } }) // หรือปลายทางอื่น
  } else {
    router.push({ name: 'concert-plan' })
  }
}

/* ================== ใส่ข้อมูลจริงตรงนี้ ================== */
/** โปสเตอร์ (ซ้ายบนในการ์ด) — แก้ URL เป็นรูปจริง หรือใช้ไฟล์ใน src/assets */
const poster = ref(
  'https://www.thaiticketmajor.com/img_poster/prefix_1/0273/6273/mariah-carey-the-celebration-of-mimi-68771ed9b6088-l.jpg'
  // ตัวอย่างใช้ไฟล์: new URL('../assets/poster.jpg', import.meta.url).href
)

/** ชื่ออีเวนท์ */
const title = ref('MARIAH CAREY The Celebration of Mimi') // TODO: แก้ชื่อจริง

/** ตัวเลือก "รอบการแสดง" */
const shows = ref([
  'Sat 11 Oct 2025 20:00', // TODO: เพิ่ม/แก้รอบจริง
])
const selectedShow = ref(shows.value[0])

/** ผังการแสดง (ภาพใหญ่กลางหน้า) */
const seatmap = ref(
  'https://www.thaiticketmajor.com/img_seat/prefix_1/1022/37022/37022-687718fb198b0-s.png'
  // ตัวอย่างไฟล์: new URL('../assets/seatmap.png', import.meta.url).href
)
</script>

<style scoped>
:root{
  --orange:#ff6a13;
  --ink:#0f172a;
  --muted:#6b7280;
}

.plan-page{
  max-width: 1120px;
  margin: 0 auto;
  padding: 16px 18px 40px;
  box-sizing: border-box;
  background: #fff;
}

/* Back */
.back-row { margin: 10px 0 20px; }
.back-btn{
  background: none; border: none; cursor: pointer;
  font-weight: 700; color: #333; font-size: 16px;
}

/* ===== Hero card (ใหญ่ขึ้น + gradient ที่ให้) ===== */
.hero-card{
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 28px 36px;
  border-radius: 16px;
  background: linear-gradient(90deg, #20f00d8f 10%, #4cf3ff6a 60%);
  box-shadow: 0 6px 22px rgba(0,0,0,.10);
}
.poster-wrap{ flex-shrink: 0; }
.poster{
  width: 140px; height: 190px; object-fit: cover;
  border-radius: 12px; box-shadow: 0 6px 14px rgba(0,0,0,.25);
}
.hero-info{ display:flex; flex-direction:column; gap:12px; }
.event-title{
  margin:0; font-size:26px; font-weight:800; color:#111;
}
.link-row{ margin-bottom:6px; }
.link-chip{
  color:#0b4b44; text-decoration: underline; font-weight:600; font-size:15px;
}

.chip-row{ display:flex; align-items:center; gap:14px; flex-wrap: wrap; }
.show-chip{ display:flex; flex-direction:column; gap:6px; }
.show-label{ font-size:13px; color:#333; font-weight:600; }
select{
  padding:8px 12px; border-radius:8px; border:1px solid #cfcfcf; font-size:14px;
  background:#fff;
}
.status-chip{
  background:#fff; border:1px solid #cfcfcf; padding:8px 14px;
  border-radius:10px; font-weight:800; color:#111; cursor:default;
}

/* ===== Stepper ===== */
.stepper{
  margin: 28px 0 6px;
  display: grid; grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center; justify-items: center;
}
.line{
  height: 4px; width: 100%;
  background: #e5e7eb; border-radius: 999px;
}
.step{ text-align: center; color: #9ca3af; }
.step .ball{
  width: 56px; height: 56px; border-radius: 50%;
  display: grid; place-items: center;
  font-weight: 800; font-size: 20px;
  background: #e5e7eb; color: #6b7280; margin-bottom: 6px;
}
.step.active{ color: #111; }
.step.active .ball{
  background: #ffede4; color: var(--orange); border: 4px solid var(--orange);
}
.step .label{ font-weight: 700; font-size: 14px; }

/* ===== Section title ===== */
.section-title{
  text-align: center; font-size: 20px; font-weight: 800;
  color: #111; margin: 24px 0 16px;
}

/* ===== Seatmap ===== */
.seatmap-wrap{
  background: #000; border-radius: 14px; overflow: hidden;
  padding: 16px; box-shadow: 0 10px 24px rgba(0,0,0,.12);
}
.seatmap-img{ width: 100%; height: auto; display: block; }

/* ===== CTA ===== */
.cta-row{ display: flex; justify-content: flex-end; margin-top: 22px; }
.next-btn{
  background: var(--orange); color:#fff; border:none; cursor:pointer;
  padding: 12px 28px; border-radius: 30px; font-weight: 900; font-size: 20px;
  box-shadow: 0 12px 24px rgba(255,106,19,.25);
}

/* Responsive */
@media (max-width: 680px){
  .hero-card{ padding: 22px; }
  .poster{ width:110px; height:150px; }
  .event-title{ font-size:22px; }
  .stepper{ grid-template-columns: 1fr 24px 1fr 24px 1fr; }
  .step .ball{ width:46px; height:46px; font-size:18px; }
}
</style>
