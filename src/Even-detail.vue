<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
/* =========================================================
   TODO: รูปภาพ
   - วางรูปโปสเตอร์ไว้ใน src/assets/ แล้วแก้ชื่อไฟล์ให้ตรง
   - วางรูปผังที่นั่ง (seat map) ไว้ใน src/assets/ เช่น mariah_seatmap.jpg
   - ใช้ new URL(..., import.meta.url).href ให้ path ถูกตอน build/docker
========================================================= */
const posterSrc   = 'https://www.thaiticketmajor.com/img_poster/prefix_1/0273/6273/mariah-carey-the-celebration-of-mimi-68771ed9b6088-l.jpg'   // TODO: เปลี่ยนชื่อไฟล์จริง
const seatmapSrc  = 'https://www.thaiticketmajor.com/img_seat/prefix_1/1022/37022/37022-687718fb198b0-s.png' // TODO: เปลี่ยนชื่อไฟล์จริง

/* =========================================================
   TODO: ข้อมูลอีเวนท์ (ข้อความต่าง ๆ แก้ไขได้เลย)
========================================================= */
const event = {
  category: 'คอนเสิร์ต',                                                  // TODO
  title: 'MARIAH CAREY The Celebration of Mimi',                           // TODO
  dateText: 'วันเสาร์ที่ 11 ตุลาคม 2568',                                   // TODO
  venueText: 'อิมแพค ชาเลนเจอร์ ฮอลล์ เมืองทองธานี',                      // TODO
  timeText: '19:00 น.',                                                    // TODO
  priceText: '20,000 / 15,000 / 12,000 / 9,000 / 7,500 / 6,500 / 5,000 / 3,500 บาท', // TODO
  poster: posterSrc,
  seatmap: seatmapSrc
}

/* ✅ popup state */
const isSeatmapOpen = ref(false)

/* ถ้ามีภาพความละเอียดสูงกว่าตัว thumbnail ให้ใส่ลิงก์ไว้ที่นี่
   ถ้าไม่มี ใช้ event.seatmap เดิมก็ได้ */
const seatmapLarge = ref(
  'https://www.thaiticketmajor.com/img_seat/prefix_1/1022/37022/37022-687718fb198b0-s.png'
  // TODO: เปลี่ยนเป็น URL ภาพใหญ่ (ถ้ามี), หรือ new URL('./assets/xxx.png', import.meta.url).href
)

/* เปิด/ปิด + ป้องกัน body scroll */
const openSeatmap = () => {
  isSeatmapOpen.value = true
  document.documentElement.style.overflow = 'hidden'
}
const closeSeatmap = () => {
  isSeatmapOpen.value = false
  document.documentElement.style.overflow = ''
}

/* ปิดด้วยปุ่ม Esc */
const onKey = e => { if (e.key === 'Escape') closeSeatmap() }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="detail-page">
    <!-- HERO: แถบไล่สี + หัวเรื่อง -->
    <section class="hero fullbleed">
      <div class="container">
        <div class="crumb">
          <!-- TODO: ถ้าจะให้ย้อนหน้า ใช้ router-link ได้ -->
          <span class="back">← รายละเอียด</span>
        </div>

        <div class="hero-body">
          <div class="poster-wrap">
            <img :src="event.poster" alt="Event Poster" class="poster" />
          </div>

          <div class="main-info">
            <div class="category">{{ event.category }}</div>
            <h1 class="title">{{ event.title }}</h1>

            <div class="facts">
              <!-- ซ้าย: วัน/สถานที่/เวลา -->
              <ul class="fact-list">
                <li>
                  <svg viewBox="0 0 24 24" class="ic">
                    <path d="M7 2v2H5a2 2 0 0 0-2 2v1h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm14 7H3v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9zM5 13h4v4H5v-4z"/>
                  </svg>
                  <div>
                    <div class="label">วันที่แสดง</div>
                    <div class="val">{{ event.dateText }}</div>
                  </div>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" class="ic">
                    <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>
                  </svg>
                  <div>
                    <div class="label">สถานที่แสดง</div>
                    <div class="val">{{ event.venueText }}</div>
                  </div>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" class="ic">
                    <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.5-12H11v5l4.25 2.52.75-1.23-3.5-2.04V8z"/>
                  </svg>
                  <div>
                    <div class="label">เวลาแสดง</div>
                    <div class="val">{{ event.timeText }}</div>
                  </div>
                </li>
              </ul>

              <!-- ขวา: ราคาบัตร -->
              <div class="price-box">
                <div class="price-head">
                  <svg viewBox="0 0 24 24" class="ic">
                    <path d="M12 1a11 11 0 1 0 11 11A11.013 11.013 0 0 0 12 1zm1 17h-2v-2h2zm1.07-7.75-.9.92A1.5 1.5 0 0 0 13 13h-2v-.5a2.5 2.5 0 0 1 .73-1.77l1.24-1.26A1.99 1.99 0 1 0 9 7H7a4 4 0 1 1 6.07 3.25z"/>
                  </svg>
                  <span>ราคาบัตร</span>
                </div>
                <div class="price-text">{{ event.priceText }}</div>
              </div>
            </div>

            <div class="cta-row">
              <button class="choose-btn">เลือกรอบ/ประเภทบัตร</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ผังการแสดง & รอบการแสดง -->
<section class="stage">
  <div class="container">
    <h2 class="section-title">ผังการแสดง & รอบการแสดง</h2>

    <div class="stage-card">
      <!-- ⬇️ คลิกแล้วเปิด -->
      <img
        :src="event.seatmap"
        alt="Seat map"
        class="seatmap"
        @click="openSeatmap"
      />
          <div class="stage-info">
            <div class="venue-line">
              <svg viewBox="0 0 24 24" class="ic">
                <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>
              </svg>
              <span>{{ event.venueText }}</span>
            </div>

            <div class="stage-price">
              <span class="muted">ราคาบัตร</span>
              <span class="price-text">{{ event.priceText }}</span>
            </div>

            <div class="date-buy">
              <div class="date-chip">
                <div class="chip-label">วันที่แสดง</div>
                <div class="chip-val">{{ event.dateText }}</div>
              </div>
              <button class="buy-btn">ซื้อตั๋ว</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- รายละเอียด -->
    <section class="desc">
      <div class="container">
        <h2 class="section-title">รายละเอียด</h2>
        <h3 class="desc-title">{{ event.title }}</h3>

        <!-- TODO: วางย่อหน้าเนื้อหาได้ตามจริง (คัดลอกข้อความยาวในรูป) -->
        <p>จำหน่ายบัตร</p>
        <p>เปิดจำหน่ายบัตร รอบ Public sale วันเสาร์ที่ 19 กรกฎาคม 2568 เวลา 10.00 น. เป็นต้นไป เฉพาะ www.joinup.com เท่านั้นและจะเปิดขายทุกช่องทางในวันอาทิตย์ที่ 20 กรกฎาคม 2568 เวลา 10.00 น. เป็นต้นไป</p>
        <h4>
  กลุ่มบริษัทธนบุรีพานิช ภูมิใจนำเสนอ คอนเสิร์ตระดับโลก กับดีว่าตลอดกาล “มารายห์ แครี” <br>
  “Mariah Carey - The Celebration of MIMI : Live in Bangkok”
  <br>11 ตุลาคม 2568 ณ อิมแพ็ค ชาเลนเจอร์ เมืองทองธานี
</h4>
        <p>กลุ่มบริษัท ธนบุรีพานิช จำกัด ผู้นำธุรกิจยานยนต์ของไทย ทั้งในด้านการประกอบและการเป็นตัวแทนจำหน่ายรถยนต์ Mercedes-Benz <br>ภายใต้ชื่อ “เบนซ์ธนบุรี” รวมถึงการเป็นผู้แทนจำหน่ายรถยนต์ไฟฟ้าแบรนด์ Geely <br>ประกาศความพร้อมในการเป็นผู้สนับสนุนหลักในการจัดคอนเสิร์ตระดับโลก “Mariah Carey - The Celebration of MIMI : Live in Bangkok” <br>ซึ่งจะจัดขึ้นในวันที่ 11 ตุลาคม 2568 ณ อิมแพ็ค ชาเลนเจอร์ เมืองทองธานี</p>
        <p>ประเทศไทยเป็นหนึ่งในจุดหมายสำคัญของทัวร์ โดยเป็นการริเริ่มของกลุ่มธนบุรีพานิช ในฐานะผู้สนับสนุนหลัก <br>ร่วมมือกับทีมงานมืออาชีพจาก Maximage ในการเชิญศิลปินระดับตำนานมาร่วมสร้างปรากฏการณ์ <br>ซึ่งนับเป็นโอกาสสำคัญที่แฟนเพลงชาวไทยและจากทั่วภูมิภาคจะได้สัมผัสโชว์ระดับโลกจากดีว่าระดับตำนาน เพื่อเฉลิมฉลองครบรอบ <br>20 ปีของอัลบั้มระดับมาสเตอร์พีซ The Emancipation of Mimi</p>
        <p>เตรียมใจให้พร้อม กับโมเมนต์ระดับตำนาน! เมื่อดีว่าเสียงสวรรค์ของโลก Mariah Carey เจ้าของ 5 รางวัล Grammy Awards <br>จากการเข้าชิงถึง 34 ครั้ง จะกลับมาระเบิดเวทีให้แฟนชาวไทยได้ฟังบทเพลงฮิต “We Belong Together” “Shake It Off” <br>และ “It’s Like That” พร้อมบทเพลงฮิตตลอดกาล “Hero,” “Fantasy,” “Vision of Love,” และ “All I Want for Christmas Is You” <br>ที่ทุกคนรอทั้งปีเพื่อจะได้ร้องตาม</p>
        <p>ห้ามพลาดกับโมเมนต์แบบจัดเต็มกับคอนเสิร์ตรอบเดียวในกรุงเทพฯ เพราะโชว์นี้เกิดขึ้น ไม่ใช่เพราะบังเอิญ <br>แต่เพราะกลุ่มธนบุรีพานิชตั้งใจให้เกิด! ไม่ดูรอบนี้...อาจไม่มีอีกเลย</p>
        <p>สำหรับผู้ที่สนใจจองบัตรคอนเสิร์ต “Mariah Carey: The Celebration of MIMI - Live In Bangkok” ในรอบ พรีเซล 18 กรกฎาคม นี้ <br>สงวนสิทธิ์สำหรับลูกค้าเบนซ์ธนบุรีและผู้สนับสนุนเท่านั้น เปิดขายบัตรอย่างเป็นทางการ 19 กรกฎาคม นี้ เริ่มเวลา 10.00 น. <br>บัตรราคา 20,000 บาท รับของที่ระลึกสุดพิเศษจากงานฯ สามารถจองผ่านทางเว็บไซต์ www.thaiticketmajor.com โทร. 02-262-3456 <br>และเคาน์เตอร์ไทยทิกเก็ตเมเจอร์ทุกสาขาทั่วประเทศ</p>
        <p>คอนเสิร์ตที่ไม่ควรพลาด วันเดียวเท่านั้น!  11 ตุลาคมนี้ ณ อิมแพ็ค ชาเลนเจอร์ เมืองทองธานี รอบเดียวเท่านั้น ราคาบัตร 3,500 / <br>5,000 / 6,500 / 7,500 / 9,000 / 12,000 / 15,000 / 20,000 บาท</p>
        <p>ติดตามทุกการเคลื่อนไหวผ่านแฮชแท็ก <br>#TheCelebrationOfMimi <br>#MariahCarey <br>#MariahCareyLiveInThailand <br>#Mimi20 <br>#ThonburiPhanich</p>
    </div>
    </section>
    <!-- ✅ Modal: popup seatmap -->
<div
  v-if="isSeatmapOpen"
  class="modal-backdrop"
  @click.self="closeSeatmap"
  role="dialog"
  aria-modal="true"
  aria-label="Seat map full view"
>
  <div class="modal-content">
    <button class="modal-close" @click="closeSeatmap" aria-label="Close">×</button>
    <img :src="seatmapLarge || event.seatmap" alt="Seat map large" class="modal-img" />
  </div>
</div>

  </div>
</template>

<!-- ===== Global minimal reset (กัน Vite บีบ #app) ===== -->
<style>
:root{ --orange:#ff6a13; --red:#ff3d00; --ink:#0f172a; --muted:#6b7280; }
body { margin: 0; }
#app { max-width: none; padding: 0; }
</style>

<!-- ===== Styles ของหน้านี้ ===== -->
<style scoped>
.fullbleed {
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
}

.container {
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 20px;
}

/* HERO */
.hero {
  background: linear-gradient(90deg, #a8edea, #fed6e3);
  padding: 18px 0 28px;
}

.crumb { margin: 10px 0 14px; }
.back { color: #0b4b44; font-weight: 700; }

.hero-body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 26px;
  align-items: start;
}

.poster-wrap { display: flex; }
.poster {
  width: 260px;
  height: 340px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 6px 14px rgba(0,0,0,.2);
  background: #f2f2f2;
}

.main-info .category {
  font-weight: 700;
  color: #111;
  margin-top: 6px;
}
.main-info .title {
  font-size: 24px;
  font-weight: 800;
  margin: 8px 0 14px;
  color: var(--ink);
}

/* grid: ซ้ายรายละเอียด / ขวาราคา */
.facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 24px;
}

.fact-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.fact-list li { display: flex; gap: 10px; align-items: flex-start; }
.ic { width: 22px; height: 22px; fill: #111; flex: 0 0 auto; }
.label { color: #111; font-weight: 700; }
.val { color: #222; }


.price-head { display: flex; align-items: center; gap: 8px; font-weight: 800; }
/* .price-text { display: block; margin-top: 6px; color: #ffffff; } */
.price-text { display:block; margin-top:6px; }

.cta-row { display: flex; justify-content: flex-end; margin-top: 14px; }
.choose-btn {
  background: var(--red);
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 22px;
  font-weight: 800;
  cursor: pointer;
}

/* ผังการแสดง */
.stage { padding: 22px 0 10px; }
.section-title {
  font-size: 18px; font-weight: 800; margin: 8px 0 14px; color: #111;
}
.stage-card {
  background: #000;
  color: #ffffff;
  border-radius: 14px;
  padding: 16px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  box-shadow: 0 10px 24px rgba(0,0,0,.25);
}

/* HERO (พื้นหลังไล่สี) ให้ตัวหนังสือเป็น “ดำ” */
.hero .price-box .price-text {
  color: #111;
}

/* การ์ดผังพื้นดำ ให้ตัวหนังสือเป็น “ขาว” */
.stage-card .price-text {
  color: #fff;
}


.seatmap {
  width: 100%; height: 170px; object-fit: cover; border-radius: 8px;
  background: #1f2937;
}
.stage-info { display: grid; gap: 12px; }

.venue-line { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.stage-price { display: grid; gap: 4px; }
.muted { color: #cbd5e1; }

.date-buy {
  background: #fff;
  color: #111;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.date-chip .chip-label { color: #6b7280; margin-bottom: 6px; }
.date-chip .chip-val { font-weight: 800; }

.buy-btn {
  background: var(--red);
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 22px;
  font-weight: 800;
  cursor: pointer;
}

/* รายละเอียด */
.desc { padding: 10px 0 44px; }
.desc-title { font-size: 18px; font-weight: 800; margin: 10px 0 14px; }
.desc p { line-height: 1.9; color: #111; margin: 10px 0; }

/* ให้ thumbnail แสดงว่า “คลิกได้” */
.seatmap { cursor: zoom-in; }

/* ===== Modal Overlay ===== */
.modal-backdrop{
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

.modal-content{
  position: relative;
  background: #111;               /* ขอบภาพดำสวย ๆ */
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
  max-width: min(1200px, 92vw);
  max-height: min(92vh, 1200px);
  padding: 12px;
}

.modal-img{
  display: block;
  max-width: 100%;
  max-height: calc(92vh - 56px);
  height: auto; width: auto;
  border-radius: 8px;
}

.modal-close{
  position: absolute; top: 6px; right: 10px;
  width: 34px; height: 34px; border-radius: 50%;
  border: none; background: #222; color: #fff; font-size: 22px; line-height: 1;
  cursor: pointer;
}
.modal-close:hover{ background:#333; }


/* responsive */
@media (max-width: 980px) {
  .hero-body { grid-template-columns: 1fr; }
  .poster { width: 220px; height: 300px; }
  .facts { grid-template-columns: 1fr; }
  .stage-card { grid-template-columns: 1fr; }
}
</style>
