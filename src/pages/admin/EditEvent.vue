<script setup>
import { ref, reactive, nextTick, onMounted, watch, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from "@/lib/api";

const showError = ref(false)
const errors = ref([])
const alertRef = ref < HTMLElement | null > (null)

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

/* ---------- รองรับข้อมูลที่ไม่มี(/images/ prefix)  ---------- */
function resolveImage(filename) {
  if (!filename) return ""
  if (/^https?:\/\//i.test(filename)) return filename

  // ถ้า backend ส่ง "/images/xxx.png" อยู่แล้ว → ใช้เลย
  if (filename.startsWith("/images/")) return filename

  // ถ้าเป็นชื่อไฟล์เปล่า → เติม /images/ ให้
  return `/images/${filename.replace(/^\/+/, "")}`
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
/*------- เปลี่ยนรูป --------- */
const posterObjUrl = ref(null)
const detailObjUrl = ref(null)
const seatmapObjUrl = ref(null)

/*---------------- Poster ----------------*/
function onPosterChange(e) {
  const f = e.target?.files?.[0] || null
  form.poster = f
  if (posterObjUrl.value) URL.revokeObjectURL(posterObjUrl.value)
  posterObjUrl.value = f ? URL.createObjectURL(f) : null
  form.posterUrl = posterObjUrl.value
}
const posterSrc = computed(() =>
  form.poster ? posterObjUrl.value : resolveImage(form.posterUrl)
)

/*---------------- Detail ----------------*/
function onDetailChange(e) {
  const f = e.target?.files?.[0] || null
  form.detailImage = f
  if (detailObjUrl.value) URL.revokeObjectURL(detailObjUrl.value)
  detailObjUrl.value = f ? URL.createObjectURL(f) : null
  form.detailUrl = detailObjUrl.value
}
const detailSrc = computed(() =>
  form.detailImage ? detailObjUrl.value : resolveImage(form.detailUrl)
)

/*---------------- Seatmap ----------------*/
function onSeatmapChange(e) {
  const f = e.target?.files?.[0] || null
  form.seatmapImage = f
  if (seatmapObjUrl.value) URL.revokeObjectURL(seatmapObjUrl.value)
  seatmapObjUrl.value = f ? URL.createObjectURL(f) : null
  form.seatmapUrl = seatmapObjUrl.value
}
const seatmapSrc = computed(() =>
  form.seatmapImage ? seatmapObjUrl.value : resolveImage(form.seatmapUrl)
)

/*---------------- Cleanup ----------------*/
onUnmounted(() => {
  if (posterObjUrl.value) URL.revokeObjectURL(posterObjUrl.value)
  if (detailObjUrl.value) URL.revokeObjectURL(detailObjUrl.value)
  if (seatmapObjUrl.value) URL.revokeObjectURL(seatmapObjUrl.value)
})

/* ---------- form ---------- */
const form = reactive({
  // รูป (URL เดิม/พรีวิว)
  posterUrl: null,
  detailUrl: null,
  seatmapUrl: null,

  // core fields (ตรงกับ template เดิมของพ้ม)
  name: '',
  category: '',
  organizer: '',
  type: 'offline',
  status: false,            // true = OPEN
  regOpen: '',              // 'YYYY-MM-DDTHH:mm'
  regClose: '',             // 'YYYY-MM-DDTHH:mm'
  saleNoEnd: false,
  startDate: '',            // 'YYYY-MM-DD'
  endDate: '',              // 'YYYY-MM-DD'
  venue: '',
  address: '',
  gateOpen: '',             // 'HH:mm' หรือข้อความอิสระ
  ageLimit: '',
  description: '',

  // ไฟล์ใหม่ (ถ้ามีผู้ใช้อัปโหลดในหน้า Edit)
  poster: null,             // File|null
  detailImage: null,        // File|null
  seatmapImage: null,       // File|null

  // sessions/rounds
  rounds: [],
  // zones
  zones: [],
})
const route = useRoute()
const multiRounds = ref(false)
const multiZones = ref(false)
const loading = ref(false)
const saving = ref(false)

const emptyRound = () => ({
  roundName: '',
  startTime: ''
})
const emptyZone = () => ({
  zoneName: '',
  capacity: '',
  price: ''

})
// เติมวินาทีให้ 'YYYY-MM-DDTHH:mm' → '...:ss'
function withSecDT(dt) {
  if (!dt) return null
  return dt.length === 16 ? dt + ':00' : dt
}

// เติมวินาทีให้ 'HH:mm' → 'HH:mm:00'; ถ้าไม่ใช่เวลา ให้คงข้อความเดิม
function withSec(t) {
  if (!t) return null
  return /^\d{2}:\d{2}$/.test(t) ? `${t}:00` : t
}

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
    form.description = data.description ?? ''
    form.startDate = thaiDateToISODate(data.startDate)
    form.endDate = thaiDateToISODate(data.endDate)
    form.status = (data.status === 'OPEN')
    form.regOpen = thaiDateTimeToISOLocal(data.saleStartAt)
    form.saleNoEnd = !!data.saleUntilSoldout
    form.regClose = form.saleNoEnd ? '' : thaiDateTimeToISOLocal(data.saleEndAt)
    form.gateOpen = data.doorOpenTime || ''

    // รูปจาก API
    form.posterUrl = data.posterImageUrl || null
    form.detailUrl = data.detailImageUrl || null
    form.seatmapUrl = data.seatmapImageUrl || null

    // sessions -> rounds
    const sessions = Array.isArray(data.sessions) ? data.sessions : []
    form.rounds = sessions.length
      ? sessions.map(s => ({
        id: s.id ?? null,
        roundName: s.name ?? '',
        startTime: (s.startTime || '').slice(0, 5),
      }))
      : [emptyRound()]
    multiRounds.value = form.rounds.length > 1

    // zones
    const zones = Array.isArray(data.zones) ? data.zones : []
    form.zones = zones.length
      ? zones.map(z => ({
        id: z.id ?? null,
        zoneName: z.name ?? '',
        capacity: z.capacity ?? 0,
        price: z.price ?? 0
      }))
      : [emptyZone()]
    multiZones.value = form.zones.length > 1
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
function onToggleMultiZones(v) {
  const val = typeof v === 'object' && v?.value !== undefined ? v.value : !!v
  if (val) {
    if (form.zones.length === 1) form.zones.push(emptyZone())
  } else {
    form.zones = [form.zones[0] ?? emptyZone()]
  }
}
// ป้องกันกรณีลืมส่ง .value ใน template
watch(multiZones, (val) => onToggleMultiZones(val))
function addZone() {
  form.zones.push(emptyZone())
  multiZones.value = form.zones.length > 1
}
function removeZone(i) {
  form.zones.splice(i, 1)
  multiZones.value = form.zones.length > 1
}

/* ---------- mapping form -> DTO (สำหรับ @RequestPart("data")) ---------- */
function buildDto() {
  return {
    title: form.name,
    description: form.description || '',
    category: form.category,
    location: form.venue,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    status: form.status ? 'OPEN' : 'CLOSED',

    saleStartAt: withSecDT(form.regOpen),                                  // required
    saleEndAt: form.saleNoEnd ? null : (form.regClose ? withSecDT(form.regClose) : null),
    saleUntilSoldout: !!form.saleNoEnd,
    doorOpenTime: form.gateOpen || null,

    // รูป: ถ้าอัปใหม่ -> ให้ backend จัดการจากไฟล์; ถ้าไม่อัป -> ส่ง URL เดิม
    posterImageUrl: form.poster ? null : form.posterUrl,                   // required
    detailImageUrl: form.detailImage ? null : (form.detailUrl || null),
    seatmapImageUrl: form.seatmapImage ? null : (form.seatmapUrl || null),
   
    // sessions: ส่งเฉพาะที่มี startTime
    sessions: (form.rounds || [])
      .filter(r => !!r.startTime)
      .map(r => ({
        id: r.id ?? null,
        name: r.roundName,
        startTime: withSec(r.startTime),
        status: 'OPEN',
      })),

    // zones
    zones: (form.zones || [])
      .map(z => ({
        id: z.id ?? null,
        name: z.zoneName,
        capacity: Number(z.capacity || 0),
        price: Number(z.price || 0)
      }))
  }
}
/* ---------- save (PUT) ---------- */
async function save() {
  try {
    saving.value = true

    if (!validateForm()) {
      await scrollAlertIntoView()
      return
    }

    const id = route.params.id
    const dto = buildDto()

    const fd = new FormData()
    fd.append('data', new Blob([JSON.stringify(dto)], { type: 'application/json' }))
    if (form.poster) fd.append('poster', form.poster)
    if (form.detailImage) fd.append('detail', form.detailImage)
    if (form.seatmapImage) fd.append('seatmap', form.seatmapImage)

    try {
      // axios จะจัดการ Content-Type ให้อัตโนมัติ
      await api.put(`/events/${id}`, fd)
      alert('บันทึกสำเร็จ')
    } catch (err) {
      if (err.response) {
        console.error('Server error:', err.response.status, err.response.data)
        alert(`บันทึกไม่สำเร็จ (${err.response.status})`)
      } else {
        console.error(err)
        alert('บันทึกไม่สำเร็จ (network)')
      }
    }
  } finally {
    saving.value = false
  }
}


</script>


<template>
  <section class="edit-events">

    <header class="toolbar">
      <!-- กล่องแจ้งเตือน -->

      <div class="title">Edit event ยังไม่ได้แก้</div>

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
                <img v-if="posterSrc" :src="posterSrc" class="poster" />
              </div>
              <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
            </div>
          </div>



          <!-- ฟิลด์ข้อความ -->
          <div class="fields">
            <div class="row">
              <label>ชื่อ *</label>
              <input class="inp" :class="{ 'is-invalid': showError && !form.name?.trim() }" v-model="form.name"
                placeholder="เช่น NCT Reboot Live" />
            </div>

            <div class="row two">
              <div>
                <label>หมวดหมู่ *</label>
                <select class="inp" v-model="form.category" :class="{ 'is-invalid': showError && !form.category }">
                  <option value="">ยังไม่ได้เลือก</option>
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
                  <input class="inp" :class="{ 'is-invalid': showError && !form.startDate }" type="date"
                    v-model="form.startDate" />
                </div>
              </div>
              <div>
                <label>วันสิ้นสุดงาน *</label>
                <div class="with-icon cal">
                  <input class="inp" :class="{ 'is-invalid': showError && !form.endDate }" type="date"
                    v-model="form.endDate" />
                </div>
              </div>
            </div>

            <div class="row two">
              <div>
                <label>ที่ตั้ง *</label>
                <div class="with-icon loc">
                  <input class="inp" :class="{ 'is-invalid': showError && !form.venue?.trim() }" v-model="form.venue"
                    placeholder="เช่น Impact Arena, Hall 9" />
                </div>
              </div>
              <div>
                <label>เวลาประตูเปิด *</label>
                <div class="with-icon time">
                  <input class="inp" :class="{ 'is-invalid': showError && !form.gateOpen?.trim() }"
                    v-model="form.gateOpen" placeholder="เช่น 17:00" />
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
      <div v-show="open.description" class="card-body">
        <div class="card-body">
          <div class="stack">
            <div class="row">
              <label>คำอธิบาย</label>
              <textarea class="inp" rows="4" v-model="form.description" placeholder="เล่ารายละเอียดเกี่ยวกับงาน" />
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
                    <img v-if="detailSrc" :src="detailSrc" class="detail" />
                  </div>
                  <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                </div>
              </div> -->

              <div class="gallery-item">
                <label class="uplabel">ผังงาน/ผังที่นั่ง</label>
                <button v-if="form.seatmapUrl" class="text-del" type="button" @click="clearSeat"
                  aria-label="ลบรูปโปสเตอร์">✕</button>
                <div class="upload small">
                  <input type="file" accept="image/png, image/jpeg" @change="onSeatmapChange" />
                  <div class="preview" v-if="form.seatmapUrl">
                    <img v-if="seatmapSrc" :src="seatmapSrc" class="detail" />
                  </div>
                  <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                </div>
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
      <div v-show="open.zone" class="card-body">
        <div class="card-body">
          <div class="pill-row">
            <label class="pill">
              <input type="checkbox" v-model="multiZones" @change="onToggleMultiZones(multiZones)" />
              มีหลายโซน
            </label>
          </div>

          <div class="zones" v-if="form.zones.length">
            <div class="zones-head">
              <div>ชื่อโซน</div>
              <div>จำนวนที่นั่ง</div>
              <div>ราคา</div>
              <div></div>
            </div>

            <div v-for="(z, i) in form.zones" :key="i" class="zone-row">
              <input class="inp" v-model="z.zoneName" :class="{ 'is-invalid': showError && !z.zoneName?.trim() }"
                placeholder="เช่น Zone A" required />

              <input class="inp num" type="number" min="0" v-model.number="z.capacity"
                :class="{ 'is-invalid': showError && (!z.capacity || Number(z.capacity) <= 0) }" />

              <input class="inp num" type="number" min="0" step="100" v-model.number="z.price"
                :class="{ 'is-invalid': showError && (!z.price || Number(z.price) <= 0) }" />

              <button class="del" type="button" v-if="multiZones && form.zones.length > 1 && i !== 0"
                @click="removeZone(i)" aria-label="ลบโซน">✕</button>
            </div>

            <button class="addbar mt-3" type="button" v-if="multiZones" @click="addZone()">+ เพิ่มโซน</button>
          </div>
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
              <div></div>
            </div>

            <div v-for="(r, i) in form.rounds" :key="i" class="round-row">
              <input class="inp" v-model="r.roundName" :class="{ 'is-invalid': showError && !r.roundName?.trim() }"
                :placeholder="i === 0 ? 'Main Day / รอบหลัก' : 'เช่น รอบเช้า / รอบบ่าย'" required />
              <input class="inp" :class="{ 'is-invalid': showError && !r.startTime }" type="time" v-model="r.startTime"
                required />

              <button class="del" type="button" v-if="multiRounds && form.rounds.length > 1 && i !== 0"
                @click="removeRound(i)" aria-label="ลบรอบ">✕</button>
            </div>

            <button class="addbar mt-3" type="button" v-if="multiRounds" @click="addRound()">+ เพิ่มรอบ</button>
          </div>
        </div>
      </div>
    </section>
    <div v-if="showError" ref="alertRef" class="alert error" role="alert" aria-live="assertive">
      <div class="alert-title">กรุณากรอกข้อมูลให้ครบถ้วน</div>
      <ul class="alert-list">
        <li v-for="(msg, i) in errors" :key="i">{{ msg }}</li>
      </ul>
    </div>
    <div class="footer-bar">
      <button class="btn ghost" @click="onCancel">ยกเลิก</button>
      <button class="btn primary" @click="save()">บันทึก</button>
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