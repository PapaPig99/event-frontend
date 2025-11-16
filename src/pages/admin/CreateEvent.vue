<script setup>
import { reactive, ref, nextTick } from 'vue'
import  api  from "@/lib/api";
// หุบ/ขยาย
const open = reactive({ event: true, description: true, sessions: true, zones: true })
const toggle = key => (open[key] = !open[key])


/* ---------- ตรวจข้อมูลที่จำเป็น  ---------- */

const showError = ref(false)
const errors = ref([])
const alertRef = ref<HTMLElement|null>(null)

function validateForm() {
  const errs = []

  // ฟิลด์บังคับ
  if (!form.poster && !form.posterUrl) errs.push('กรุณาอัปโหลดรูปโปสเตอร์')
  if (!form.name?.trim()) errs.push('กรุณากรอกชื่ออีเวนต์')
  if (!form.category) errs.push('กรุณาเลือกหมวดหมู่')
  if (!form.regOpen) errs.push('กรุณากรอกวันที่และเวลาเปิดจำหน่าย')
  if (!form.saleNoEnd && !form.regClose) errs.push('กรุณากรอกวันที่และเวลาปิดจำหน่าย หรือเลือกปิดเมื่อบัตรหมด')
  if (!form.startDate) errs.push('กรุณากรอกวันเริ่มจัดงาน')
  if (!form.endDate) errs.push('กรุณากรอกวันสิ้นสุดงาน')
  if (!form.venue?.trim()) errs.push('กรุณากรอกสถานที่จัดงาน')

  // rounds (อย่างน้อย 1 และต้องมีเวลาเริ่ม)
  if (!form.rounds?.length) {
    errs.push('กรุณาเพิ่มรอบงานอย่างน้อย 1 รอบ')
  } else {
    form.rounds.forEach((r, idx) => {
      if (!r.startTime) errs.push(`กรุณากรอกเวลาเริ่มของรอบที่ ${idx + 1}`)
    })
  }

  // zones (อย่างน้อย 1 แถว + ชื่อ/จำนวน/ราคา)
  if (!form.zones?.length) {
    errs.push('กรุณาเพิ่มโซนอย่างน้อย 1 โซน')
  } else {
    form.zones.forEach((z, idx) => {
      if (!z.zoneName?.trim()) errs.push(`กรุณากรอกชื่อโซนของแถวที่ ${idx + 1}`)
      if (z.capacity == null || Number(z.capacity) <= 0) errs.push(`กรุณากรอกจำนวนที่นั่งของโซนแถวที่ ${idx + 1}`)
      if (z.price == null || Number(z.price) < 0) errs.push(`กรุณากรอกราคาของโซนแถวที่ ${idx + 1}`)
    })
  }

  errors.value = errs
  showError.value = errs.length > 0
  return errs.length === 0
}

async function scrollAlertIntoView() {
  await nextTick()
  alertRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
/* ---------- form  ---------- */
const form = reactive({
  // core fields
  name: '',
  description: '',
  category: '',
  venue: '',
  startDate: '',       // YYYY-MM-DD
  endDate: '',         // YYYY-MM-DD
  status: false,       // true=open
  regOpen: '',         // YYYY-MM-DDTHH:mm
  regClose: '',        // YYYY-MM-DDTHH:mm
  saleNoEnd: false,
  gateOpen: '',        // string|null

  // รูป (เก็บทั้งไฟล์ที่ผู้ใช้เลือก + preview/ชื่อไฟล์)
  poster: null,        // File|null
  detailImage: null,   // File|null
  seatmapImage: null,  // File|null
  posterUrl: null,     // string|null (preview หรือชื่อไฟล์เดิม)
  detailUrl: null,
  seatmapUrl: null,

  // sessions/rounds
 rounds: [
    { id: null, roundName: '', startTime: '', status: 'OPEN' }
  ],

  // zones
  zones: [
    { id: null, name: '', capacity: 0, price: 0 }
  ],
})

/* ---------- upload handlers ---------- */
function onPosterChange(e) {
  const f = e.target.files?.[0] || null
  form.poster = f
  form.posterUrl = f ? URL.createObjectURL(f) : null
  console.log('preview =', form.posterUrl)
}
function onDetailChange(e) {
  const f = e.target.files?.[0] || null
  form.detailImage = f
  form.detailUrl = f ? URL.createObjectURL(f) : null
}
function onSeatmapChange(e) {
  const f = e.target.files?.[0] || null
  form.seatmapImage = f
  form.seatmapUrl = f ? URL.createObjectURL(f) : null
}
function srcFor(u) {
  if (!u) return ''
  // ถ้าเป็น blob: / http(s): / หรือ path เองก็ใช้ได้เลย
  if (u.startsWith('blob:') || u.startsWith('http') || u.startsWith('/')) return u

  return  u
}
/* ---------- helpers เวลา/วันที่ ---------- */
const withSec = t => (t ? (t.length === 5 ? `${t}:00` : t) : null)
const withSecDT = dt => (dt ? (dt.length === 16 ? `${dt}:00` : dt) : null)

/* ---------- map form -> DTO ---------- */
function buildDto() {
  return {
    title: form.name,
    description: form.description,
    category: form.category,
    location: form.venue,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    status: form.status ? 'OPEN' : 'CLOSED',
    saleStartAt: withSecDT(form.regOpen),
    saleEndAt: form.saleNoEnd ? null : withSecDT(form.regClose),
    saleUntilSoldout: !!form.saleNoEnd,
    doorOpenTime: withSec(form.gateOpen),

    // ถ้าไม่ได้เลือกไฟล์ใหม่ → ส่งชื่อไฟล์/preview เดิม 
    posterImageUrl: form.poster ? null : form.posterUrl,
    detailImageUrl: form.detailImage ? null : form.detailUrl,
    seatmapImageUrl: form.seatmapImage ? null : form.seatmapUrl,

    sessions: form.rounds.map(r => ({
      id: r.id ?? null,
      name: r.roundName,
      startTime: withSec(r.startTime),
      status: 'OPEN',
    })),

    zones: form.zones.map(z => ({
      id: z.id ?? null,
      name: z.zoneName,
      capacity: Number(z.capacity || 0),
      price: Number(z.price || 0)
    }))
  }
}

/* ---------- submit: POST /api/events (multipart/form-data) ---------- */
async function saveCreate() {
   if (!validateForm()) {
    await scrollAlertIntoView()
    return
  }
  //ค่าฟอร์มก่อนสร้าง DTO
  console.log('FORM before buildDto =', JSON.parse(JSON.stringify(form)));

  //สร้าง DTO จากฟอร์ม
  const dto = buildDto();
  console.log('DTO =', dto);

  //ประกอบ FormData ให้ตรงกับ backend (@RequestPart)
  const fd = new FormData();
  fd.append('data', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
  if (form.poster)      fd.append('poster',  form.poster);
  if (form.detailImage) fd.append('detail',  form.detailImage);
  if (form.seatmapImage)fd.append('seatmap', form.seatmapImage);

  //Log ดูว่าใน FormData มีอะไรบ้าง
  for (const [k, v] of fd.entries()) {
    console.log('FormData field:', k, v);
  }

  try {
  const res = await api.post("/events", fd); 
  
  // อ่าน Location header (axios headers เป็น object ปกติ)
  const loc = res.headers?.location || res.headers?.Location;
  const id  = loc ? String(loc).split('/').pop() : null;

  alert(`สร้างสำเร็จ! Event ID = ${id ?? '(ไม่พบ Location header)'}`);
} catch (err) {
  if (err.response) {
    const { status, data, headers } = err.response;
    const msg = typeof data === 'object'
      ? (data.message ?? JSON.stringify(data))
      : String(data ?? '');
    console.error('Server error:', status, data, headers);
    alert(`Create failed: ${status} — ${msg}`);
  } else {
    console.error(err);
    alert('เกิดข้อผิดพลาดระหว่างบันทึก (network)');
  }
}
}



/* ---------- rounds & zones ---------- */
function onToggleMultiRounds(v) {
  if (v) {
    if (form.rounds.length === 0) form.rounds.push({ id: null, roundName: '', startTime: '', endTime: '', maxAttendees: null, price: null })
    if (form.rounds.length === 1) form.rounds.push({ id: null, roundName: '', startTime: '', endTime: '', maxAttendees: null, price: null })
  } else {
    form.rounds = [form.rounds[0] ?? { id: null, roundName: '', startTime: '', endTime: '', maxAttendees: null, price: null }]
  }
}
function addRound() {
  form.rounds.push({ id: null, roundName: '', startTime: ''})
}
function removeRound(i) {
  if (form.rounds.length <= 1) return
  form.rounds.splice(i, 1)
}

function onToggleMultiZones(v) {
  if (v) {
    if (form.zones.length === 0) form.zones.push({ id: null, zoneName: '', capacity: 0, price: 0 })
    if (form.zones.length === 1) form.zones.push({ id: null, zoneName: '', capacity: 0, price: 0 })
  } else {
    form.zones = [form.zones[0] ?? { id: null, zoneName: '', capacity: 0, price: 0 }]
  }
}

function addZone() {
  form.zones.push({ id: null, zoneName: '', capacity: 0, price: 0 })
}

function removeZone(i) {
  if (form.zones.length <= 1) return
  form.zones.splice(i, 1)
}

/* ---------- misc ---------- */
function onCancel() { history.back() }

/* ---ลบรูป ---- */
function clearPoster() {
  form.posterUrl = null
}
function clearDetail() {
  form.detailUrl = null
}
function clearSeat() {
  form.seatmapUrl = null
}
</script>


<template>
  <section class="create-events">

    <header class="toolbar">
      <div class="title">Create event ยังไม่ได้แก้</div>
      
    </header>
    <!-- ข้อมูลอีเวนต์ -->
    <section class="card">
      <header class="card-head accent">
        <h2>ข้อมูลอีเวนต์</h2>
        <button class="chev" :class="{ open: open.event }" @click="toggle('event')">▲
        </button>
      </header>

      <div v-show="open.event" class="card-body">
        <div class="grid">
          <!-- poster -->
          <div class="poster">
            <label class="uplabel">รูปโปสเตอร์ *</label>
            <div class="upload">
              <button v-if="form.posterUrl" class="text-del" type="button" @click="clearPoster"
                aria-label="ลบรูปโปสเตอร์">✕</button>
              <!-- input file -->
              <input type="file" accept="image/png, image/jpeg" @change="onPosterChange" />

              <!-- preview -->
              <div class="preview" v-if="form.posterUrl">
                <img :src="srcFor(form.posterUrl)" alt="poster" />
              </div>

              <!-- placeholder -->
              <div class="placeholder" v-else>
                อัปโหลดรูปภาพ
              </div>
            </div>
          </div>

          <!-- ฟิลด์ข้อความ -->
          <div class="fields">
            <div class="row">
              <label>ชื่อ *</label>
              <input class="inp"  :class="{ 'is-invalid': showError && !form.name?.trim() }"v-model="form.name" placeholder="เช่น NCT Reboot Live" />
            </div>

            <div class="row two">
              <div>
                <label>หมวดหมู่ *</label>
                <select class="inp" v-model="form.category"
                 :class="{ 'is-invalid': showError && !form.category }">
                  <option value="" >ยังไม่ได้เลือก</option>
                  <option value="concert">คอนเสิร์ต</option>
                  <option value="show">การแสดง</option>
                  <option value="education">การศึกษา</option>
                  <option value="business">ธุรกิจ</option>
                  <option value="sport">กีฬา</option>

                </select>
              </div>

              <div>
                <label>สถานะอีเวนต์</label>
                <div class="status-line">
                  <span :class="['status-tag', !form.status && 'is-active']">ปิดใช้งาน</span>
                  <label class="switch">
                    <input type="checkbox" v-model="form.status" />
                    <span class="slider"></span>
                  </label>
                  <span :class="['status-tag', form.status && 'is-active']">เผยแพร่</span>
                </div>
              </div>
            </div>

            <div class="row two">
              <div>
                <label>วันที่และเวลาเปิดจำหน่าย *</label>
                <div class="with-icon cal">
                  <input class="inp" type="datetime-local" v-model="form.regOpen"
                   :class="{ 'is-invalid': showError && !form.regOpen }" />
                </div>
              </div>
              <div>
                <label>วันที่และเวลาปิดจำหน่าย *</label>
                <div class="inline">
                  <div class="with-icon cal grow">
                    <input class="inp" type="datetime-local" v-model="form.regClose"
                     :class="{ 'is-invalid': showError && !form.saleNoEnd && !form.regClose }"
                     :disabled="form.saleNoEnd" />
                  </div>
                  <label class="ck"><input type="checkbox" v-model="form.saleNoEnd" /> ปิดเมื่อบัตรหมด</label>
                </div>
              </div>
            </div>

            <div class="row two">
              <div>
                <label>วันเริ่มจัดงาน *</label>
                <div class="with-icon cal">
                  <input class="inp"  :class="{ 'is-invalid': showError && !form.startDate }" 
                  type="date" v-model="form.startDate" /></div>
              </div>
              <div>
                <label>วันสิ้นสุดงาน *</label>
                <div class="with-icon cal">
                  <input class="inp"  :class="{ 'is-invalid': showError && !form.endDate }"
                  type="date" v-model="form.endDate" /></div>
              </div>
            </div>

            <div class="row two">
              <div>
                <label>ที่ตั้ง *</label>
                <div class="with-icon loc">
                  <input class="inp"  :class="{ 'is-invalid': showError && !form.venue?.trim() }"
                  v-model="form.venue"
                    placeholder="เช่น Impact Arena, Hall 9" /></div>
              </div>
              <div>
                <label>เวลาประตูเปิด *</label>
                <div class="with-icon time">
                  <input class="inp" v-model="form.gateOpen"
                     :class="{ 'is-invalid': showError && !form.gateOpen?.trim() }" 
                     placeholder="เช่น 17:00 , ก่อนเริ่มงาน 1 ชม." /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- รายละเอียดและรูปภาพ -->
    <section class="card">
      <header class="card-head accent">
        <h2>รายละเอียดและรูปภาพ</h2>
        <button class="chev" :class="{ open: open.description }" @click="toggle('description')">▲</button>
      </header>

      <div v-show="open.description" class="card-body">
        <div class="stack">

          <div class="row">
            <label>คำอธิบาย</label>
            <textarea class="inp" v-model="form.description" rows="4"
              placeholder="เล่ารายละเอียดเกี่ยวกับงาน"></textarea>
          </div>


          <div class="gallery two-col">
            <!-- รูปภาพเพิ่มเติม -->
            <!-- <div class="gallery-item">
              <label class="uplabel">รูปภาพเพิ่มเติม</label>
               <button v-if="form.detailUrl" class="text-del" type="button" @click="clearDetail"
                aria-label="ลบรูปโปสเตอร์">✕</button>
              <div class="upload small">
                <input type="file" accept="image/png, image/jpeg" @change="onDetailChange" />
                <div class="preview" v-if="form.detailUrl">
                  <img :src="srcFor(form.detailUrl)" alt="detail" />
                </div>
                <div class="placeholder" v-else>
                  อัปโหลดรูปภาพ
                </div>
              </div>
            </div> -->

            <!-- ผังงาน/ผังที่นั่ง -->
            <div class="gallery-item">
              <label class="uplabel">ผังงาน/ผังที่นั่ง</label>
               <button v-if="form.seatmapUrl" class="text-del" type="button" @click="clearSeat"
                aria-label="ลบรูปโปสเตอร์">✕</button>
              <div class="upload small">
                <input type="file" accept="image/png, image/jpeg" @change="onSeatmapChange" />
                <div class="preview" v-if="form.seatmapUrl">
                   <img :src="srcFor(form.seatmapUrl)" alt="seatmap" />
                </div>
                <div class="placeholder" v-else>
                  อัปโหลดรูปภาพ</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>



    <!-- โซนของงาน -->
    <section class="card">
      <header class="card-head accent">
        <h2>โซนของงาน</h2>
        <button class="chev" :class="{ open: open.zone }" @click="toggle('zone')">▲</button>
      </header>

      <div v-show="open.zone" class="card-body">
        <div class="pill-row">
          <label class="pill">
            <input type="checkbox" v-model="multiZones" @change="onToggleMultiZones(multiZones)" />
            มีหลายโซน
          </label>
        </div>

        <div class="zones">
          <!-- หัวตาราง -->
          <div class="zones-head">
            <div>ชื่อโซน</div>
            <div>จำนวนที่นั่ง</div>
            <div>ราคา</div>
            <div></div>
          </div>

          <!-- แถวข้อมูล -->
          <div v-for="(z, i) in form.zones" :key="i" class="zone-row">
            <input class="inp" v-model="z.zoneName" 
              :class="{ 'is-invalid': showError && !z.zoneName?.trim() }"
              :placeholder="i === 0? 'เช่น Zone A':' เช่น Zone B'" required />
            
            <input class="inp num"  type="number" min="0" v-model.number="z.capacity" 
            :class="{ 'is-invalid': showError && (!z.capacity || Number(z.capacity) <= 0) }" />
             
            
             <input class="inp num" type="number" min="0" step="100" v-model.number="z.price"  
             :class="{ 'is-invalid': showError && (!z.price || Number(z.price) <= 0) }" />
             
             <button class="del" type="button" v-if="multiZones && form.zones.length > 1 && i !== 0"
            @click="removeZone(i)" aria-label="ลบโซน">✕</button>
          </div>

          <button class="addbar mt-3" type="button"v-if="multiZones" @click="addZone()">+ เพิ่มโซน</button>
        </div>
        </div>
    </section>


    <!-- รอบของงาน -->
    <section class="card">
      <header class="card-head accent">
        <h2>รอบของงาน</h2>
        <button class="chev" :class="{ open: open.session }" @click="toggle('session')">▲</button>
      </header>

      <div v-show="open.session" class="card-body">
        <div class="pill-row">
          <label class="pill">
            <input type="checkbox" v-model="multiRounds" @change="onToggleMultiRounds(multiRounds)" />
            อีเวนต์มีหลายวัน/หลายรอบ
          </label>
        </div>

        <div class="rounds">
          <!-- หัวตาราง -->
          <div class="rounds-head">
            <div>ชื่อรอบ</div>
            <div>เวลาเริ่ม</div>
            <div></div>
          </div>

          <!-- แถวข้อมูล -->
          <div v-for="(r, i) in form.rounds" :key="i" class="round-row">
            <input class="inp" v-model="r.roundName"
            :class="{ 'is-invalid': showError && !r.roundName?.trim() }"
              :placeholder="i === 0 ? 'Main Day / รอบหลัก' : 'เช่น รอบเช้า / รอบบ่าย'" required />

            <input class="inp"  :class="{ 'is-invalid': showError && !r.startTime }"
              type="time" v-model="r.startTime" required />
            
              <button class="del" type="button" v-if="multiRounds && form.rounds.length > 1 && i !== 0"
              @click="removeRound(i)" aria-label="ลบรอบ">✕</button>
          </div>

          <button class="addbar mt-3" type="button" v-if="multiRounds" @click="addRound()">+ เพิ่มรอบ</button>
        </div>
      </div>
    </section>
  <div
  v-if="showError"
  ref="alertRef"
  class="alert error"
  role="alert"
  aria-live="assertive"
>
  <div class="alert-title">กรุณากรอกข้อมูลให้ครบถ้วน</div>
  <ul class="alert-list">
    <li v-for="(msg, i) in errors" :key="i">{{ msg }}</li>
  </ul>
</div>
    <div class="footer-bar">
      <button class="btn ghost" @click="onCancel">ยกเลิก</button>
      <button class="btn primary" @click="saveCreate()">สร้าง</button>
    </div>
  </section>

</template>

<style scoped>
/* หัวcard*/
.create-events {
  padding: 20px;
}

.title {
  color: #5f6063;
  font-size: 20px;
  font-weight: 400;
}


.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.page-big {
  font-size: 20px;
  font-weight: 700;
  margin: 10px 0 12px;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 14px;
  overflow: hidden;
  width: 100%;
}

.card-head {
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-head h2 {
  font-size: 17px;
  margin: 0;
  color: #2A3745;
}

.card-head.accent {
  background: #b8c7d6;
  color: #2b3642;
  position: relative;
}

.card-head.accent h2 {
  width: 100%;
  text-align: center;

}

.card-head.accent .chev {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #1f2937;
  opacity: .85;
}

.card-body {
  padding: 14px;
}

.card .row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.card .row label {
  margin-bottom: 6px;
}

.card .row .inp {
  width: 100%;
  resize: vertical;
}

button.chev {
  background: none;
  color: #1f2937;
  border: none;
  height: 60px;
  cursor: pointer;
}

/* รูปภาพ */

/* กรอบ upload */
.upload {
  position: relative;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #fafafa;
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}

.poster .upload {
  aspect-ratio: 420 / 594;
  min-height: unset;
}

::v-deep(.upload input[type="file"]) {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.upload .preview,
.upload .placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
}

.upload .preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  display: block;
}

.upload .placeholder {
  color: #9aa3af;
  font-size: 14px;
}

.text-del {
  font-size: 10px;
  cursor: pointer;
  padding-left: 5px;
  margin-left: 5px;
}
.gallery.two-col {
  display: grid;
  grid-template-columns: max-content max-content;
  justify-content: start;
  column-gap: 12px;
  row-gap: 12px;
}


.gallery.two-col .upload {
  width: 300px;
  max-width: none;
  aspect-ratio: 1 / 1;
}

/* -----------*/
/* Zone*/
/* หัวตาราง */
.zones-head,
.zone-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 28px;  
  gap: 12px;
  align-items: center;
}

/* แถวโซน สไตล์ให้ match rounds */
.zone-row {
  background: #f6f7f9;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.zones.is-single .zones-head,
.zones.is-single .zone-row {
  grid-template-columns: 2fr 1fr 1fr; 
}

/* ปุ่มลบกากบาทแดงด้านขวา */
.del {
  justify-self: end;
  background: none;
  border: none;
  color: #ef4444;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}


.inp.num {
  text-align: right;
}

/* -------------------*/
/* round */

/* หัวตาราง */
.rounds-head,
.round-row {
  display: grid;
  grid-template-columns: 2fr 1fr 28px;
  gap: 12px;
  align-items: center;
}

/* หัวตาราง */
.rounds-head {
  margin-bottom: 8px;
  color: #0b0f1a;
}

/* แถวข้อมูล */
.round-row {
  background: #f6f7f9;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.round-row .inp {
  width: 100%;
}

.round-row .inp.num {
  text-align: right;
}

/* ----------------  */
.uplabel {
  display: inline-block;
  font-size: 14px;
  margin-bottom: 8px;
  color: #374151;
}

.grid {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.fields .row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.fields .row.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.row.two>div {
  min-width: 0;
}

.fields label {
  font-size: 13px;
  color: #374151;
}

/* กล่อง input*/
.inp {
  width: 100%;
  height: 44px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
  border-radius: 12px;
  padding: 0 14px;
  outline: none;
  box-sizing: border-box;
}


.inp:focus {
  border-color: #cbd5e1;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, .08);
}

.status-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-tag {
  font-size: 12px;
  color: #6b7280;
}

.status-tag.is-active {
  color: #111827;
  font-weight: 600;
}

.switch {
  position: relative;
  width: 44px;
  height: 24px;
  display: inline-block;
}

.switch input {
  display: none;
}

.switch .slider {
  position: absolute;
  inset: 0;
  background: #e5e7eb;
  border-radius: 999px;
  transition: .2s;
}

.switch .slider:before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: .2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .16);
}

.switch input:checked+.slider {
  background: #4ED642;
}

.switch input:checked+.slider:before {
  transform: translateX(20px);
}

.with-icon {
  position: relative;
}

.with-icon:before {
  content: '';
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  opacity: .55;
}

.with-icon input.inp {
  padding-left: 30px;
}

.with-icon.cal:before {
  background: url("data:image/svg+xml,%3Csvg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E") no-repeat center/18px;
}

.with-icon.loc:before {
  background: url("data:image/svg+xml,%3Csvg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z'/%3E%3Ccircle cx='12' cy='10' r='3'/%3E%3C/svg%3E") no-repeat center/18px;
}

.with-icon.time:before {
  background: url("data:image/svg+xml,%3Csvg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6v6l4 2'/%3E%3C/svg%3E") no-repeat center/18px;
}

.inline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.inline .grow {
  flex: 1;
}

.ck {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 13px;
}

.round {
  padding: 6px 3px;
  border-top: 1px solid #f1f5f9;
}

.chip-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
}

.ml-auto {
  margin-left: auto;
}

.row.grid5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr) 28px;
  gap: 5px;
  align-items: end;

  background: #f6f7f9;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* -------------------*/

/* ติ๊กโซน+งานหลายอัน*/
.pill-row {
  margin: 4px 0 14px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #eaf2ff;
  border: 1px solid #c7d2fe;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.pill input {
  accent-color: #3b82f6;
  transform: translateY(1px);
}

/* ปุ่มเพิ่ม งาน+โซน*/
.addbar {
  width: 100%;
  height: 42px;
  border-radius: 10px;
  border: 1px dashed #dfe3e8;
  background: #f5f7fa;
  color: #374151;
  cursor: pointer;
}

.addbar:hover {
  background: #eef2f6;
}

/* ปุ่มยกเลิก + ปุ่มบันทึก*/
.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
}

/* ปุ่มยกเลิก*/
.btn.ghost {
  background: #fff;
  border: 1px solid #d1d5db;
}

/* ปุ่มบันทึก*/
.btn.primary {
  background: #6366f1;
  color: #fff;
}

.footer-bar {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}
/* ผู้ใช้ไม่กรอก*/
.inp.is-invalid {
  border-color: #e0424a;
}
/* กล่องแจ้งเตือน */
.alert {
  padding: 12px 14px;
  margin-bottom: 14px;
  border: 1px solid transparent;
}

.alert.error {
  background: #fff7f7;
  border-color: #fecaca;
  color: #7f1d1d;
  position: relative;
}



</style>
