<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/* ===== state ของ stepper ===== */
const currentStep = 1

/* ===== Router utils ===== */
const router = useRouter()
const route = useRoute()
const routeId = computed(() => route.params.id)

/* ===== ปุ่มย้อนกลับ / ไปหน้าถัดไป ===== */
const goBack = () => router.back()
const goNext = () => {
  // TODO: ปรับปลายทางจริง เช่นไปหน้าที่เลือกโซน/ราคา
  if (routeId.value) {
    router.push({ name: 'concert-plan', params: { id: routeId.value } })
  } else {
    router.push({ name: 'concert-plan' })
  }
}

/* ===== ข้อมูลจำลอง/แก้เป็นของจริงได้ ===== */
const poster = ref(
  'https://www.thaiticketmajor.com/img_poster/prefix_1/0273/6273/mariah-carey-the-celebration-of-mimi-68771ed9b6088-l.jpg'
  // ตัวอย่างไฟล์ภายในโปรเจกต์:
  // new URL('../assets/poster.jpg', import.meta.url).href
)
const title = ref('MARIAH CAREY The Celebration of Mimi')

const shows = ref([
  'Sat 11 Oct 2025 20:00', // TODO: เพิ่ม/แก้รอบจริง
])
const selectedShow = ref(shows.value[0])

const seatmap = ref(
  'https://www.thaiticketmajor.com/img_seat/prefix_1/1022/37022/37022-687718fb198b0-s.png'
  // ตัวอย่างไฟล์ภายในโปรเจกต์:
  // new URL('../assets/seatmap.png', import.meta.url).href
)
</script>

<template>
  <div class="plan-page">
    <!-- แถว Back -->
    <div class="back-row">
      <button class="back-btn" @click="goBack">ย้อนกลับ</button>
    </div>

    <!-- การ์ดหัวเรื่อง gradient -->
    <section class="hero-card">
      <div class="poster-wrap">
        <!-- TODO: เปลี่ยน poster เป็นไฟล์จริง (URL หรือไฟล์ใน src/assets) -->
        <img :src="poster" alt="Poster" class="poster" />
      </div>

      <div class="hero-info">
        <h1 class="event-title">{{ title }}</h1>

        <div class="link-row">
          <!-- TODO: แก้ id ให้ตรงกับ event จริง หรือผูกจาก route param -->
          <router-link :to="{ name: 'event-detail', params: { id: routeId || 1 } }" class="link-chip">
            รายละเอียด
          </router-link>
        </div>

        <!-- รอบการแสดง + สถานะ -->
        <div class="chip-row">
          <label for="show" class="show-label">รอบการแสดง</label>
          <select v-model="selectedShow" id="show" aria-label="รอบการแสดง">
            <option v-for="(s,i) in shows" :key="i" :value="s">{{ s }}</option>
          </select>
          <button class="status-chip">ที่นั่งว่าง</button>
        </div>
      </div>
    </section>

    <!-- Stepper (ภาพแบบที่ 2) -->
    <section class="stepper2">
      <div class="track"></div>
      <div class="steps">
        <div class="step" :class="{ active: currentStep >= 1 }">
          <div class="ball">1</div>
          <div class="label">ดูผังและที่นั่ง</div>
        </div>
        <div class="step" :class="{ active: currentStep >= 2 }">
          <div class="ball">2</div>
          <div class="label">เลือกประเภทที่นั่ง</div>
        </div>
        <div class="step" :class="{ active: currentStep >= 3 }">
          <div class="ball">3</div>
          <div class="label">ชำระเงิน</div>
        </div>
      </div>
    </section>

    <h2 class="section-title">ดูผังการแสดง</h2>

    <div class="seatmap-wrap">
      <!-- TODO: เปลี่ยน seatmap เป็นรูปใหญ่ของจริง -->
      <img :src="seatmap" alt="Seat map" class="seatmap-img" />
    </div>

    <div class="cta-row">
      <button class="next-btn" @click="goNext">ถัดไป</button>
    </div>
  </div>
</template>

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
}

/* Back */
.back-row { margin: 10px 0 20px; }
.back-btn{
  background: none; border: none; cursor: pointer;
  font-weight: 700; color: #333; font-size: 16px;
}

/* ===== Hero card ===== */
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

/* รอบการแสดง + สถานะ */
.chip-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.show-label {
  font-size: 15px;
  color: #111;
  font-weight: 700;
}
select {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #cfcfcf;
  font-size: 14px;
  background: #f4fdfb;
  cursor: pointer;
}
.status-chip {
  background: #fff;
  border: 1px solid #cfcfcf;
  padding: 8px 14px;
  border-radius: 10px;
  font-weight: 700;
  color: #111;
  cursor: default;
  white-space: nowrap;
}

/* ===== Stepper (แบบภาพที่ 2) ===== */
.stepper2 {
  --ball: 60px;          /* 🔽 ลดขนาดวงกลม จาก 72 → 60 */
  --track: 6px;          /* 🔽 ลดความหนาเส้น */
  position: relative;
  margin: 60px 0 0;      /* 🔽 ลด margin-bottom ให้ห่างข้างล่างน้อยลง */
  bottom: 20px;
}

.stepper2 .track {
  position: absolute;
  left: calc(var(--ball) / 2 + 10px);   /* 🔽 ขยับเส้นเข้ามา */
  right: calc(var(--ball) / 2 + 10px);  /* 🔽 ขยับเส้นเข้ามา */
  top: calc(var(--ball) / 2 - var(--track) / 2);
  height: var(--track);
  background: #e5e7eb;
  border-radius: 999px;
  z-index: 0;
}

.stepper2 .steps {
  display: flex;
  justify-content: space-between; /* 🔽 เว้นเท่า ๆ กัน */
  align-items: flex-start;
  position: relative;
  z-index: 1;
  max-width: 600px;               /* 🔽 จำกัดความกว้างรวม */
  margin: 0 auto;                 /* 🔽 จัดตรงกลาง */
}

.stepper2 .step {
  text-align: center;
  flex: 1;                        /* 🔽 แต่ละ step กินพื้นที่เท่ากัน */
}

.stepper2 .ball {
  width: var(--ball);
  height: var(--ball);
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 22px;
  background: #e0e0e0;
  color: #000;
  margin: 0 auto 6px;
  box-shadow: 0 2px 0 rgba(0,0,0,.04);
}

.stepper2 .label {
  font-size: 16px;
  font-weight: 700;
  color: #111;
}

.stepper2 .step:not(.active) .label {
  color: #6b7280;
}

.stepper2 .step.active:nth-child(1) .ball{ background:var(--orange); color:#fff; }

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
}
@media (max-width: 680px){
  .hero-card{ padding: 22px; }
  .poster{ width:110px; height:150px; }
  .event-title{ font-size:22px; }
}
</style>
