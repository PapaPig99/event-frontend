<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

/* ---------- หุบ/ขยาย ---------- */
const open = reactive({ event: true, description: true, sessions: true, zones: true })
const toggle = key => (open[key] = !open[key])

/* ---------- แปลงวันที่ พ.ศ. -> ค.ศ. ---------- */
function thaiDateToISODate(thai) {
  if (!thai) return ''
  const [y, m, d] = thai.split('-')
  const year = Number(y) > 2400 ? Number(y) - 543 : Number(y)
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}
function thaiDateTimeToISOLocal(thaiDT) {
  if (!thaiDT) return ''
  const [datePart, timeRaw] = thaiDT.split('T')
  const dateISO = thaiDateToISODate(datePart)
  const time = (timeRaw || '').slice(0, 5) // HH:mm
  return `${dateISO}T${time}`
}

/* ---------- ช่วยต่อ URL รูปจาก API ---------- */
function toImageUrl(val) {
  if (!val) return null
  // ถ้ามาเป็น http(s) เต็มอยู่แล้ว ใช้ต่อได้เลย
  if (/^https?:\/\//i.test(val)) return val
  // ถ้าเป็นชื่อไฟล์ เช่น "poster.jpg" → ต่อกับ __IMAGE_BASE__
  return (typeof __IMAGE_BASE__ !== 'undefined' ? __IMAGE_BASE__ : '/images/') + val
}
/*------- ลบรูป --------- */
function clearPoster() {
  form.posterUrl = null
}
function clearDetail() {
  form.detailUrl = null
}
function clearSeat() {
  form.seatmapUrl = null
}

/* ---------- form ---------- */
const form = reactive({
  posterUrl: null,
  name: '',
  category: '',
  organizer: '',
  type: 'offline',
  status: false,
  regOpen: '',
  regClose: '',
  saleNoEnd: false,
  startDate: '',
  endDate: '',
  venue: '',
  address: '',
  gateOpen: '',
  ageLimit: '',
  description: '',
  detailUrl: null,
  seatmapUrl: null,
  rounds: [],
  zones: []
})

const multiRounds = ref(false)
const multiZones = ref(false)
const loading = ref(false)
const saving = ref(false)
const route = useRoute()

const emptyRound = () => ({
  roundName: '',
  startTime: '',
  endTime: '',
  maxAttendees: null,
  price: null,
})

/* ---------- load ---------- */
onMounted(async () => {
  try {
    loading.value = true
    const id = route.params.id || 1
    const res = await fetch(`/api/events/${id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    // event
    form.name = data.title ?? ''
    form.category = data.category ?? ''
    form.venue = data.location ?? ''
    form.startDate = thaiDateToISODate(data.startDate)
    form.endDate = thaiDateToISODate(data.endDate)
    form.status = (data.status === 'OPEN')
    form.regOpen = thaiDateTimeToISOLocal(data.saleStartAt)
    form.saleNoEnd = !!data.saleUntilSoldout
    form.regClose = form.saleNoEnd ? '' : thaiDateTimeToISOLocal(data.saleEndAt)
    form.gateOpen = (data.doorOpenTime || '').slice(0, 5)

    // รูปจาก API (รองรับทั้ง URL เต็มและชื่อไฟล์)
    form.posterUrl = toImageUrl(data.posterImageUrl)
    form.detailUrl = toImageUrl(data.detailImageUrl)
    form.seatmapUrl = toImageUrl(data.seatmapImageUrl)

    // sessions -> rounds
    const sessions = Array.isArray(data.sessions) ? data.sessions : []
    form.rounds = sessions.length
      ? sessions.map(s => ({
        roundName: s.name ?? '',
        startTime: (s.startTime || '').slice(0, 5),
        endTime: s.endTime ? s.endTime.slice(0, 5) : '',
        maxAttendees: s.maxParticipants ?? null,
        price: s.price ?? null
      }))
      : [emptyRound()]
    multiRounds.value = form.rounds.length > 1

    // zones
    const zones = Array.isArray(data.zones) ? data.zones : []
    form.zones = zones.map(z => ({
      id: z.id, name: z.name ?? '', capacity: z.capacity ?? 0, price: z.price ?? 0
    }))
    multiZones.value = form.zones.length > 0
  } catch (e) {
    console.error(e)
    alert('โหลดข้อมูลไม่สำเร็จ')
  } finally {
    loading.value = false
  }
})

/* ---------- rounds ops ---------- */
function onToggleMultiRounds(v) {
  const val = typeof v === 'object' && v?.value !== undefined ? v.value : !!v
  if (val) {
    if (form.rounds.length === 1) form.rounds.push(emptyRound())
  } else {
    form.rounds = [form.rounds[0] ?? emptyRound()]
  }
}
// ป้องกันกรณีลืมส่ง .value ใน template
watch(multiRounds, (val) => onToggleMultiRounds(val))

function addRound() {
  form.rounds.push(emptyRound())
  multiRounds.value = form.rounds.length > 1
}
function removeRound(i) {
  if (form.rounds.length <= 1) return
  form.rounds.splice(i, 1)
  multiRounds.value = form.rounds.length > 1
}

/* ---------- zones ops ---------- */
function addZone() {
  form.zones.push({ name: '', capacity: 0, price: 0 })
  multiZones.value = form.zones.length > 0
}
function removeZone(i) {
  form.zones.splice(i, 1)
  multiZones.value = form.zones.length > 0
}

/* ---------- uploads (preview อย่างเดียว) ---------- */
/* ถ้าภายหลังต้องอัปโหลดไฟล์จริง ควรใช้ FormData ส่งไฟล์แยก */
function onPosterChange(e) {
  const f = e.target.files?.[0]
  form.posterUrl = f ? URL.createObjectURL(f) : null
}
function onDetailChange(e) {
  const f = e.target.files?.[0]
  form.detailUrl = f ? URL.createObjectURL(f) : null
}
function onSeatmapChange(e) {
  const f = e.target.files?.[0]
  form.seatmapUrl = f ? URL.createObjectURL(f) : null
}

/* ---------- save (PUT) ---------- */
async function save() {
  try {
    saving.value = true
    const id = route.params.id || 1

    const payload = {
      title: form.name,
      category: form.category,
      location: form.venue,
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status ? 'OPEN' : 'CLOSE',
      saleStartAt: form.regOpen ? `${form.regOpen}:00` : null,
      saleEndAt: form.saleNoEnd ? null : (form.regClose ? `${form.regClose}:00` : null),
      saleUntilSoldout: !!form.saleNoEnd,
      doorOpenTime: form.gateOpen ? `${form.gateOpen}:00` : null,
      posterImageUrl: form.posterUrl,
      detailImageUrl: form.detailUrl,
      seatmapImageUrl: form.seatmapUrl,
      sessions: form.rounds.map(r => ({
        name: r.roundName,
        startTime: r.startTime ? `${r.startTime}:00` : null,
        endTime: r.endTime ? `${r.endTime}:00` : null,
        status: 'OPEN',
        maxParticipants: r.maxAttendees ?? null,
        price: r.price ?? null
      })),
      zones: form.zones.map(z => ({
        id: z.id,
        name: z.name,
        capacity: Number(z.capacity || 0),
        price: Number(z.price || 0)
      }))
    }

    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error(`Save failed: ${res.status}`)
    alert('บันทึกสำเร็จ')
  } catch (e) {
    console.error(e)
    alert('บันทึกไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}
</script>


<template>
  <section class="edit-events">

    <header class="toolbar">

      <div class="title">Edit event</div>
    </header>
    <!-- ข้อมูลอีเวนต์ -->
    <section class="card">
      <header class="card-head accent">
        <h2>ข้อมูลอีเวนต์</h2>
        <button class="chev" :class="{ open: open.event }" @click="toggle('event')">▲
        </button>
      </header>

      <div v-show="open.event" class="card-body" v-if="!loading">
        <!-- รายละเอียดหลัก -->
        <div class="grid">
          <!-- โปสเตอร์ -->
          <div class="poster">
              <label class="uplabel">รูปโปสเตอร์</label>
              <button v-if="form.posterUrl" class="text-del" type="button" @click="clearPoster"
                aria-label="ลบรูปโปสเตอร์">✕</button>
    

            <div class="upload" :style="{ aspectRatio: '420 / 594' }">
              <input type="file" accept="image/png, image/jpeg" @change="onPosterChange" />
              <div class="preview" v-if="form.posterUrl">
                <img :src="form.posterUrl" alt="poster" />
              </div>
              <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
            </div>
          </div>



          <!-- ฟิลด์ข้อความ -->
          <div class="fields">
            <div class="row">
              <label>ชื่อ *</label>
              <input class="inp" v-model="form.name" placeholder="เช่น NCT Reboot Live" />
            </div>

            <div class="row two">
              <div>
                <label>หมวดหมู่ *</label>
                <select class="inp" v-model="form.category">
                  <option value="">ยังไม่ได้เลือก</option>
                  <option value="Concert">คอนเสิร์ต</option>
                  <option value="Show">การแสดง</option>
                  <option value="Education">การศึกษา</option>
                  <option value="Business">ธุรกิจ</option>
                  <option value="Sport">กีฬา</option>
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
                  <input class="inp" type="datetime-local" v-model="form.regOpen" />
                </div>
              </div>
              <div>
                <label>วันที่และเวลาปิดจำหน่าย *</label>
                <div class="inline">
                  <div class="with-icon cal grow">
                    <input class="inp" type="datetime-local" v-model="form.regClose" :disabled="form.saleNoEnd" />
                  </div>
                  <label class="ck"><input type="checkbox" v-model="form.saleNoEnd" /> ปิดเมื่อบัตรหมด</label>
                </div>
              </div>
            </div>

            <div class="row two">
              <div>
                <label>วันเริ่มจัดงาน *</label>
                <div class="with-icon cal">
                  <input class="inp" type="date" v-model="form.startDate" />
                </div>
              </div>
              <div>
                <label>วันสิ้นสุดงาน *</label>
                <div class="with-icon cal">
                  <input class="inp" type="date" v-model="form.endDate" />
                </div>
              </div>
            </div>

            <div class="row two">
              <div>
                <label>ที่ตั้ง *</label>
                <div class="with-icon loc">
                  <input class="inp" v-model="form.venue" placeholder="เช่น Impact Arena, Hall 9" />
                </div>
              </div>
              <div>
                <label>เวลาประตูเปิด *</label>
                <div class="with-icon time">
                  <input class="inp" v-model="form.gateOpen" placeholder="เช่น 17:00" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="card-body">กำลังโหลดข้อมูล…</div>
    </section>

    <!-- รายละเอียดและรูปภาพ -->
    <section class="card">
      <header class="card-head accent">
        <h2>รายละเอียดและรูปภาพ</h2>
        <button class="chev" :class="{ open: open.description }" @click="toggle('description')">▲</button>

      </header>

      <div class="card-body">
        <div class="stack">
          <div class="row">
            <label>คำอธิบาย *</label>
            <textarea class="inp" rows="4" v-model="form.description" placeholder="เล่ารายละเอียดเกี่ยวกับงาน" />
          </div>

          <div class="gallery two-col">
            <div class="gallery-item">
              <label class="uplabel">รูปภาพเพิ่มเติม</label>
              <button v-if="form.detailUrl" class="text-del" type="button" @click="clearDetail"
                aria-label="ลบรูปโปสเตอร์">✕</button>
              <div class="upload small">
                <input type="file" accept="image/png, image/jpeg" @change="onDetailChange" />
                <div class="preview" v-if="form.detailUrl">
                  <img :src="form.detailUrl" alt="detail" />
                </div>
                <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
              </div>
            </div>

            <div class="gallery-item">
              <label class="uplabel">ผังงาน/ผังที่นั่ง</label>
              <button v-if="form.seatmapUrl" class="text-del" type="button" @click="clearSeat"
                aria-label="ลบรูปโปสเตอร์">✕</button>
              <div class="upload small">
                <input type="file" accept="image/png, image/jpeg" @change="onSeatmapChange" />
                <div class="preview" v-if="form.seatmapUrl">
                  <img :src="form.seatmapUrl" alt="seatmap" />
                </div>
                <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- โซน -->
    <section class="card">
      <header class="card-head accent">
        <h2>โซนของงาน</h2>
        <button class="chev" :class="{ open: open.zone }" @click="toggle('zone')">▲</button>

      </header>

      <div class="card-body">
        <div class="pill-row">
          <label class="pill">
            <input type="checkbox" v-model="multiZones" />
            มีหลายโซน
          </label>
        </div>

        <div v-if="multiZones" class="zones">
          <div class="zones-head">
            <div>ชื่อโซน</div>
            <div>จำนวนที่นั่ง</div>
            <div>ราคา</div>
            <div></div>
          </div>

          <div v-for="(z, i) in form.zones" :key="i" class="zone-row">
            <input class="inp" v-model="z.name" placeholder="เช่น Zone A" />
            <input class="inp num" type="number" min="0" v-model.number="z.capacity" />
            <input class="inp num" type="number" min="0" step="100" v-model.number="z.price" />
            <button class="zone-del" type="button" @click="removeZone(i)" aria-label="ลบโซน">✕</button>
          </div>

          <button class="addbar mt-3" type="button" @click="addZone()">+ เพิ่มโซน</button>
        </div>
      </div>
    </section>

    <!-- รอบของงาน -->
    <section class="card">
      <header class="card-head accent">
        <h2>รอบของงาน</h2>
        <button class="chev" :class="{ open: open.session }" @click="toggle('session')">▲</button>

      </header>

      <div class="card-body">
        <div class="pill-row">
          <label class="pill">
            <input type="checkbox" v-model="multiRounds" @change="onToggleMultiRounds(multiRounds)" />
            อีเวนต์มีหลายวัน/หลายรอบ
          </label>
        </div>

        <div class="rounds" v-if="form.rounds.length">
          <div class="rounds-head">
            <div>ชื่อรอบ</div>
            <div>เวลาเริ่ม</div>
            <div>เวลาจบ</div>
            <div>ผู้เข้าร่วมสูงสุด</div>
            <div>ราคา</div>
            <div></div>
          </div>

          <div v-for="(r, i) in form.rounds" :key="i" class="round-row">
            <input class="inp" v-model="r.roundName"
              :placeholder="i === 0 ? 'Main Day / รอบหลัก' : 'เช่น รอบเช้า / รอบบ่าย'" required />
            <input class="inp" type="time" v-model="r.startTime" required />
            <input class="inp" type="time" v-model="r.endTime" />
            <input class="inp num" type="number" min="0" v-model.number="r.maxAttendees" />
            <input class="inp num" type="number" min="0" v-model.number="r.price" />

            <button class="del" type="button" v-if="multiRounds && form.rounds.length > 1 && i !== 0"
              @click="removeRound(i)" aria-label="ลบรอบ">✕</button>
          </div>

          <button class="addbar mt-3" type="button" v-if="multiRounds" @click="addRound()">+ เพิ่มรอบ</button>
        </div>
      </div>
    </section>

    <div class="footer-bar">
      <button class="btn ghost" @click="onCancel">ยกเลิก</button>
      <button class="btn primary" :disabled="!isValid" @click="onSubmit">บันทึก</button>
    </div>
  </section>
</template>

<style scoped>
/* หัวcard*/
.edit-events {
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

.upload {
  position: relative;
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
.zones-head {
  display: grid;
  grid-template-columns: 1.4fr .6fr .8fr 40px;
  /* ชื่อ / จำนวน / ราคา / ปุ่มลบ */
  gap: 12px;
  margin-bottom: 8px;
  color: #0b0f1a;
}

/* แถวโซน */
.zone-row {
  display: grid;
  grid-template-columns: 1.4fr .6fr .8fr 40px;
  gap: 12px;
  align-items: center;
  background: #f6f7f9;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
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
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 28px;
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
</style>
