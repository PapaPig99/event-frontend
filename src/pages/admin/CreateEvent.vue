<script setup>
import { reactive, ref, nextTick, onMounted, watch } from 'vue'
import api from "@/lib/api";
import { computed } from "vue";

const activeStep = ref(0)
const steps = ["ข้อมูลอีเวนต์", "รอบ", "โซน"];
const templates = ref([])

async function loadTemplates() {
  const res = await api.get("/zone-templates")
  console.log("TEMPLATES =", res.data)
  templates.value = res.data
}


onMounted(() => {
  loadTemplates()
})

const groupTemplates = computed(() => {
  const g = {};
  templates.value.forEach(t => {
    const key = t.groupName || "OTHER";
    if (!g[key]) g[key] = [];
    g[key].push(t);
  });
  return g;
});

function nextStep() {
  if (activeStep.value < 2) {
    activeStep.value++;
  }
}

/* ---------- ตรวจข้อมูลที่จำเป็น  ---------- */

const showError = ref(false)
const errors = ref([])
const alertRef = ref < HTMLElement | null > (null)

function validateForm() {
  const errs = [];

  /* ---------------------------------------------------
     ตรวจข้อมูลอีเวนต์หลัก
  --------------------------------------------------- */
  if (!form.poster && !form.posterUrl) errs.push("กรุณาอัปโหลดรูปโปสเตอร์");
  if (!form.name?.trim()) errs.push("กรุณากรอกชื่ออีเวนต์");
  if (!form.category) errs.push("กรุณาเลือกหมวดหมู่");
  if (!form.regOpen) errs.push("กรุณากรอกวันที่และเวลาเปิดจำหน่าย");
  if (!form.saleNoEnd && !form.regClose)
    errs.push("กรุณากรอกวันที่และเวลาปิดจำหน่าย หรือเลือกปิดเมื่อบัตรหมด");
  if (!form.startDate) errs.push("กรุณากรอกวันเริ่มจัดงาน");
  if (!form.endDate) errs.push("กรุณากรอกวันสิ้นสุดงาน");
  if (!form.venue?.trim()) errs.push("กรุณากรอกสถานที่จัดงาน");

  /* ---------------------------------------------------
     ตรวจรอบ (Sessions)
  --------------------------------------------------- */
  if (!form.rounds?.length) {
    errs.push("กรุณาเพิ่มรอบงานอย่างน้อย 1 รอบ");
  }

  form.rounds.forEach((r, ridx) => {
    const row = ridx + 1;

    // ตรวจชื่อรอบ
    if (!r.roundName?.trim())
      errs.push(`กรุณากรอกชื่อรอบที่ ${row}`);

    // ตรวจเวลาเริ่ม
    if (!r.startTime)
      errs.push(`กรุณากรอกเวลาเริ่มของรอบที่ ${row}`);

    /* ---------------------------
       ถ้าเลือกใช้ Template
    --------------------------- */
    if (r.useZoneTemplate === true) {
      if (!r.templateIds || r.templateIds.length === 0) {
        errs.push(`รอบที่ ${row} กรุณาเลือก Zone Template อย่างน้อย 1 รายการ`);
      }
      return; // ⬅ ไม่ต้องตรวจ custom zones
    }

    /* ---------------------------
       ถ้าเป็น Custom Zones
    --------------------------- */
    if (!r.zones || r.zones.length === 0) {
      errs.push(`รอบที่ ${row} กรุณาเพิ่มโซนอย่างน้อย 1 โซน`);
    }

    r.zones.forEach((z, zidx) => {
      const zrow = zidx + 1;

      if (!z.zoneName?.trim())
        errs.push(`รอบที่ ${row} โซนแถวที่ ${zrow} กรุณากรอกชื่อโซน`);

      if (z.capacity == null || z.capacity <= 0)
        errs.push(`รอบที่ ${row} โซนแถวที่ ${zrow} กรุณากรอกจำนวนที่นั่งให้ถูกต้อง`);

      if (z.price == null || z.price < 0)
        errs.push(`รอบที่ ${row} โซนแถวที่ ${zrow} กรุณากรอกราคาให้ถูกต้อง`);
    });
  });

  /* ---------------------------------------------------
     ส่งผลลัพธ์
  --------------------------------------------------- */
  errors.value = errs;
  showError.value = errs.length > 0;
  return errs.length === 0;
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
  seatmapImage: null,  // File|null
  posterUrl: null,     // string|null (preview หรือชื่อไฟล์เดิม)
  seatmapUrl: null,

  // sessions/rounds
  rounds: [
    {
      roundName: "",
      startTime: "",
      useZoneTemplate: true,      // ค่า default = ใช้ template
      templateIds: [],            // ถ้าใช้ template -> เลือกหลายอัน
      zones: []                   // ถ้า custom -> ใช้ zones แทน
    }
  ]

  ,

})

/* ---------- upload handlers ---------- */
function onPosterChange(e) {
  const f = e.target.files?.[0] || null
  form.poster = f
  form.posterUrl = f ? URL.createObjectURL(f) : null
  console.log('preview =', form.posterUrl)
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

  return u
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
    seatmapImageUrl: form.seatmapImage ? null : form.seatmapUrl,

    sessions: form.rounds.map(r => ({
      name: r.roundName,
      startTime: withSec(r.startTime),
      useZoneTemplate: r.useZoneTemplate,

      // ถ้าใช้เทมเพลต ส่งเป็น Array
      templateIds: r.useZoneTemplate ? r.templateIds : null,

      // custom zones
      zones: r.useZoneTemplate
        ? null
        : r.zones.map(z => ({
          name: z.zoneName,
          capacity: Number(z.capacity),
          price: Number(z.price),
        }))
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
  if (form.poster) fd.append('poster', form.poster);
  if (form.seatmapImage) fd.append('seatmap', form.seatmapImage);

  //Log ดูว่าใน FormData มีอะไรบ้าง
  for (const [k, v] of fd.entries()) {
    console.log('FormData field:', k, v);
  }

  try {
    const res = await api.post("/events", fd);

    // อ่าน Location header (axios headers เป็น object ปกติ)
    const loc = res.headers?.location || res.headers?.Location;
    const id = loc ? String(loc).split('/').pop() : null;

    addToast(`สร้างอีเวนต์สำเร็จ! (ID: ${id ?? "?"})`, "success");

    setTimeout(() => {
      window.location.href = `/admin/events/${id}/detail`;    
    }, 1300);

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
function addRound() {
  form.rounds.push({
    roundName: '',
    startTime: '',
    useZoneTemplate: true,
    templateIds: [],
    zones: []
  })
}

function removeRound(i) {
  if (form.rounds.length <= 1) return
  form.rounds.splice(i, 1)
}


/* ---ลบรูป ---- */
function clearPoster() {
  form.posterUrl = null
}
function clearSeat() {
  form.seatmapUrl = null
}
function toggleGroup(r, groupName) {
  const groupItems = groupTemplates.value[groupName].map(t => t.id);

  const allSelected = groupItems.every(id => r.templateIds.includes(id));

  if (allSelected) {
    // ถ้า group ถูกเลือกอยู่ → ยกเลิกทั้ง group
    r.templateIds = r.templateIds.filter(id => !groupItems.includes(id));
  } else {
    // ถ้ายังไม่ได้เลือก → เพิ่มทั้ง group
    r.templateIds = Array.from(new Set([...r.templateIds, ...groupItems]));
  }
}
watch(
  () => form.rounds.map(r => r.useZoneTemplate),   // ดูการเปลี่ยนของทุก round
  (newVals, oldVals) => {
    form.rounds.forEach((r, idx) => {
      if (newVals[idx] !== oldVals?.[idx]) {
        // ถ้าเพิ่งสลับโหมด
        if (r.useZoneTemplate) {
          // เปลี่ยนเป็น "ใช้ Template" -> ล้าง zones
          r.zones = [];
        } else {
          // เปลี่ยนเป็น "Custom Zone" -> ล้าง templateIds + เตรียม zone แรก
          r.templateIds = [];
          if (r.zones.length === 0) {
            r.zones.push({ zoneName: "", capacity: 0, price: 0 });
          }
        }
      }
    });
  },
  { deep: true }
);

const toasts = ref([]);

function addToast(message, type = "success") {
  const id = Date.now();
  toasts.value.push({ id, message, type });

  setTimeout(() => {
    closeToast(id);
  }, 3000);
}

function closeToast(id) {
  toasts.value = toasts.value.filter(t => t.id !== id);
}

</script>

<template>
  <div class="toast-container">
    <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.type">
      <span>{{ t.message }}</span>
      <button class="toast-close" @click="closeToast(t.id)">✕</button>
    </div>
  </div>
  <section class="create-events">

    <!-- HEADER -->
    <header class="toolbar">
      <div class="title">Create Event</div>
    </header>

    <!-- STEP -->
    <div v-for="(s, i) in steps" :key="i" class="step" :class="{ active: activeStep === i }" @click="activeStep = i"
      style="cursor: pointer;">
      {{ i + 1 }}. {{ s }}
    </div>


    <!-- STEP 1 — ข้อมูลอีเวนต์ -->
    <section v-if="activeStep === 0" class="card">
      <header class="card-head accent">
        <h2>ข้อมูลอีเวนต์</h2>
      </header>
      <div class="card-body">
        <!-- ใช้โค้ดเดิมทั้งหมด -->
        <div class="grid">

          <!-- poster -->
          <div class="poster">
            <label class="uplabel">รูปโปสเตอร์ *</label>
            <div class="upload">
              <button v-if="form.posterUrl" class="text-del" @click="clearPoster">✕</button>
              <input type="file" @change="onPosterChange" />
              <div v-if="form.posterUrl" class="preview">
                <img :src="srcFor(form.posterUrl)" />
              </div>
              <div v-else class="placeholder">อัปโหลดรูปภาพ</div>
            </div>
          </div>

          <!-- fields -->
          <div class="fields">
            <!-- ใช้ div.row ทั้งหมดที่คุณมี -->
            <div class="row">
              <label>ชื่อ *</label>
              <input class="inp" v-model="form.name" />
            </div>

            <div class="row two">
              <div>
                <label>หมวดหมู่ *</label>
                <select class="inp" v-model="form.category">
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

            <!-- วันที่ต่าง ๆ -->
            <div class="row two">
              <div>
                <label>วันที่และเวลาเปิดจำหน่าย *</label>
                <input class="inp" type="datetime-local" v-model="form.regOpen" />
              </div>

              <div>
                <label>วันที่และเวลาปิดจำหน่าย *</label>
                <input class="inp" type="datetime-local" v-model="form.regClose" :disabled="form.saleNoEnd" />
                <label class="ck"><input type="checkbox" v-model="form.saleNoEnd" /> ปิดเมื่อบัตรหมด</label>
              </div>
            </div>

            <div class="row two">
              <div>
                <label>วันเริ่มจัดงาน *</label>
                <input class="inp" type="date" v-model="form.startDate" />
              </div>
              <div>
                <label>วันสิ้นสุดงาน *</label>
                <input class="inp" type="date" v-model="form.endDate" />
              </div>
            </div>

            <div class="row two">
              <div>
                <label>ที่ตั้ง *</label>
                <input class="inp" v-model="form.venue" />
              </div>
              <div>
                <label>เวลาประตูเปิด *</label>
                <input class="inp" v-model="form.gateOpen" placeholder="17:00" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <header class="card-head accent">
        <h2>รายละเอียดและรูปภาพ</h2>
      </header>
      <div class="card-body">
        <!-- ใช้โค้ดของคุณทั้ง block -->
        <div class="stack">
          <div class="row">
            <label>คำอธิบาย</label>
            <textarea class="inp" rows="4" v-model="form.description"></textarea>
          </div>

          <!-- ผังงาน -->
          <div class="gallery two-col">
            <div class="gallery-item">
              <label class="uplabel">ผังงาน/ผังที่นั่ง</label>
              <button v-if="form.seatmapUrl" class="text-del" @click="clearSeat">✕</button>

              <div class="upload small">
                <input type="file" @change="onSeatmapChange" />
                <div v-if="form.seatmapUrl" class="preview">
                  <img :src="srcFor(form.seatmapUrl)" />
                </div>
                <div v-else class="placeholder">อัปโหลดรูปภาพ</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- STEP 3 — SESSIONS -->
    <section v-if="activeStep === 1" class="card">
      <header class="card-head accent">
        <h2>รอบของงาน</h2>
      </header>

      <div class="card-body">

        <div class="rounds-head">
          <div>ชื่อรอบ</div>
          <div>เวลาเริ่ม</div>
          <div>โหมดโซน</div>
          <div></div>
        </div>

        <div v-for="(r, i) in form.rounds" :key="i" class="round-row grid4">

          <input class="inp" v-model="r.roundName" placeholder="รอบหลัก" />
          <input class="inp" type="time" v-model="r.startTime" />

          <!-- เลือกโหมด -->
          <select class="inp" v-model="r.useZoneTemplate">
            <option :value="true">ใช้ Template</option>
            <option :value="false">กำหนดโซนเอง</option>
          </select>

          <button class="del" v-if="form.rounds.length > 1" @click="removeRound(i)">
            ✕
          </button>
        </div>

        <button class="addbar" @click="addRound">+ เพิ่มรอบ</button>
      </div>
    </section>


    <!-- STEP 4 — ZONES -->
    <section v-if="activeStep === 2" class="card">
      <header class="card-head accent">
        <h2>โซนของแต่ละรอบ</h2>
      </header>

      <div class="card-body">

        <div v-for="(r, i) in form.rounds" :key="i" class="session-box">

          <h3 class="session-title">
            รอบ: {{ r.roundName || ('Session ' + (i + 1)) }}
            <span class="mode-tag" :class="r.useZoneTemplate ? 'blue' : 'green'">
              {{ r.useZoneTemplate ? 'ใช้ Template' : 'Custom Zones' }}
            </span>
          </h3>

          <!-- Template Mode -->
          <div v-if="r.useZoneTemplate">
            <label>เลือก Template ตาม group</label>

            <div class="template-list">
              <label v-for="(items, gname) in groupTemplates" :key="gname" class="template-check">
                <input type="checkbox" :checked="items.every(t => r.templateIds.includes(t.id))"
                  @change="toggleGroup(r, gname)" />
                {{ gname }}
              </label>
            </div>



            <div class="template-box" v-if="r.templateIds.length">
              <b>เลือกแล้ว:</b><br>
              <span v-for="id in r.templateIds" :key="id">
                {{templates.find(t => t.id === id)?.name}}<br>
              </span>
            </div>
          </div>

          <!-- Custom Zone Mode -->
          <div v-else class="zones">
            <div class="zones-head">
              <div>ชื่อโซน</div>
              <div>จำนวนที่นั่ง</div>
              <div>ราคา</div>
              <div></div>
            </div>

            <div v-for="(z, zi) in r.zones" :key="zi" class="zone-row">
              <input class="inp" v-model="z.zoneName" placeholder="Zone A" />
              <input class="inp" type="number" v-model.number="z.capacity" />
              <input class="inp" type="number" v-model.number="z.price" />
              <button class="del" v-if="r.zones.length > 1" @click="r.zones.splice(zi, 1)">✕</button>
            </div>

            <button class="addbar" @click="r.zones.push({ zoneName: '', capacity: 0, price: 0 })">
              + เพิ่มโซน
            </button>
          </div>

        </div>

      </div>
    </section>




    <!-- ERROR -->
    <div v-if="showError" class="alert error" ref="alertRef">
      <div class="alert-title">กรุณากรอกข้อมูลให้ครบถ้วน</div>
      <ul>
        <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
      </ul>
    </div>

    <!-- WIZARD NAV -->
    <div class="wizard-nav">
      <button class="btn ghost" v-if="activeStep > 0" @click="activeStep--">
        Back
      </button>

      <button class="btn primary" v-if="activeStep < 2" @click="nextStep">
        Next
      </button>

      <div v-if="activeStep === steps.length - 1">
        <button class="btn primary" @click="saveCreate">
          Create
        </button>
      </div>
    </div>


  </section>

</template>

<style scoped>
/* หัวcard*/
.create-events {
  padding: 20px;
}

.title {
  font-weight: 500;
  color: #333;
  font-size: 20px;
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
  grid-template-columns: 4.1fr 2fr 2fr 50px;
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

.round-row.grid4 {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 28px;
  gap: 12px;
  align-items: center;
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
  background: #333;
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


.wizard-steps {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.step {
  margin: 0 5px 20px;
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #6b7280;
  font-weight: 500;
}

.step.active {
  background: #FF3336;
  color: white;
}

.wizard-nav {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.session-box {
  border: 1px solid #e5e7eb;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  background: #fafafa;
}

.session-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
}

.mode-tag {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  margin-left: 6px;
  font-weight: 500;
}

.mode-tag.blue {
  background: #dbeafe;
  color: #1e40af;
}

.mode-tag.green {
  background: #dcfce7;
  color: #166534;
}

.template-box {
  background: #eff6ff;
  padding: 12px;
  border-radius: 10px;
  color: #1d4ed8;
  margin-bottom: 12px;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 10px 0;
}

.template-check {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}

.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 9999;
}

.toast-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 6px;
  min-width: 240px;
  background: #333;
  color: white;
  font-size: 14px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.25s ease;
}

.toast-item.success {
  background: #2b8a3e;
}

.toast-close {
  background: transparent;
  border: none;
  color: white;
  font-size: 16px;
  margin-left: 12px;
  cursor: pointer;
}
</style>
