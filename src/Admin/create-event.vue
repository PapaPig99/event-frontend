<script setup>
import { reactive, ref, computed } from 'vue'

/** ฟอร์มหลัก (ตรงกับ Figma) */
const form = reactive({
  poster: null,
  name: '',
  category: '',
  organizer: '',

  // ประเภท/สถานะอีเวนต์
  type: 'offline',      // offline | online | hybrid
  status: false,        // false=ปิดใช้งาน, true=เผยแพร่

  // จำหน่ายบัตร
  regOpen: '',
  regClose: '',
  saleNoEnd: false,

  // วันงาน
  startDate: '',
  endDate: '',

  // สถานที่/เวลา
  venue: '',
  address: '',
  gateOpen: '',
  ageLimit: '',

  // รายละเอียด/สื่อ
  description: '',
  hero: null,
  gallery1: null,
  gallery2: null,

  // รอบ/โซน
  zones: [],
rounds: [
  {
    roundName: '',
    startTime: '',
    endTime: '',
    maxAttendees: 0,
    price: 0
  }
]
}) // ✅ ปิด reactive object ตรงนี้

/** preview รูป */
const posterUrl = ref('')
const heroUrl = ref('')
const g1Url = ref('')
const g2Url = ref('')
function toPreview (file, targetRef) {
  if (!file) { targetRef.value = ''; return }
  targetRef.value = URL.createObjectURL(file)
}

/** เพิ่ม/ลบ tier & รอบ */
function addTier (r) { form.rounds[r].tiers.push({ name: '', qty: '', minPerUser: '1', maxPerUser: '4', price: '' }) }
function removeTier (r, i) { form.rounds[r].tiers.splice(i, 1) }
function addRound () { form.rounds.push({ roundName: '', saleStart: '', saleClose: '', tiers: [{ name: '', qty: '', minPerUser: '1', maxPerUser: '4', price: '' }] }) }
function removeRound (i) { form.rounds.splice(i, 1) }

/** accordion */
const secBasic  = ref(true)
const secMedia  = ref(true)
const secStage  = ref(true)
const secRounds = ref(true)
const toggle = (refBool) => (refBool.value = !refBool.value)

/** validate + submit */
const isValid = computed(() =>
  form.name.trim() &&
  form.category.trim() &&
  form.type &&
  form.regOpen &&
  (form.saleNoEnd || form.regClose) &&
  form.startDate &&
  form.endDate &&
  form.venue.trim()
)

async function onSubmit () {
  if (!isValid.value) { alert('กรอกฟิลด์ที่จำเป็นให้ครบก่อนนะ'); return }
  const fd = new FormData()
  const entries = {
    name: form.name, category: form.category, organizer: form.organizer,
    type: form.type, status: form.status,
    regOpen: form.regOpen, regClose: form.regClose, saleNoEnd: form.saleNoEnd,
    startDate: form.startDate, endDate: form.endDate,
    gateOpen: form.gateOpen, ageLimit: form.ageLimit,
    venue: form.venue, address: form.address,
    description: form.description
  }
  Object.entries(entries).forEach(([k, v]) => fd.append(k, v ?? ''))
  if (form.poster)   fd.append('poster',   form.poster)
  if (form.hero)     fd.append('hero',     form.hero)
  if (form.gallery1) fd.append('gallery1', form.gallery1)
  if (form.gallery2) fd.append('gallery2', form.gallery2)
  fd.append('rounds', JSON.stringify(form.rounds))
  fd.append('zones',  JSON.stringify(form.zones))

  try{
    const res = await fetch('/api/events', { method: 'POST', body: fd })
    if(!res.ok) throw new Error('Upload failed')
    alert('บันทึกสำเร็จ!')
  }catch(e){
    console.error(e); alert('เกิดข้อผิดพลาดในการบันทึก')
  }
}

function onCancel(){ history.back() }
</script>

<template>
  <div class="shell">
    <!-- Topbar -->
    <header class="topbar">
      <div class="brand">
        <span class="logo">JoinUp</span>
      </div>
      <div class="top-actions">
        <input class="search" placeholder="Search…" />
        <div class="user"><i class="i-user" /> Username</div>
        <button class="btn small ghost">Signout</button>
      </div>
    </header>

    <div class="body">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-title">Navigation</div>
        <nav class="menu">
          <a class="menu-item active">Overview</a>
          <div class="menu-section">Events</div>
          <a class="menu-item">All Events</a>
          <a class="menu-item">Create Event</a>
        </nav>
      </aside>

      <!-- Main -->
      <main class="content">
        <h1 class="page-big">Create event</h1>

        <!-- ข้อมูลอีเวนต์ -->
        <section class="card">
          <header class="card-head">
            <h2>ข้อมูลอีเวนต์</h2>
            <button class="chev" @click="toggle(secBasic)">{{ secBasic ? '▴' : '▾' }}</button>
          </header>

          <div v-show="secBasic" class="card-body">
            <div class="grid">
              <!-- poster -->
              <div class="poster">
                <label class="uplabel">รูปโปสเตอร์ *</label>
                <div class="upload">
                  <input type="file" accept="image/*"
                         @change="e => { form.poster = e.target.files?.[0] ?? null; toPreview(form.poster, posterUrl) }" />
                  <div class="preview" v-if="posterUrl"><img :src="posterUrl" alt="poster" /></div>
                  <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                </div>
              </div>

              <!-- fields -->
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
                      <option>Concert</option>
                      <option>Seminar</option>
                      <option>Sport</option>
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

                 <!--<div class="row">
                  <label>ประเภทอีเวนต์ *</label>
                  <div class="types">
                    <label class="type">
                      <input type="radio" value="offline" v-model="form.type" />
                      <span class="dot"></span><span>Offline</span>
                    </label>
                    <label class="type">
                      <input type="radio" value="online" v-model="form.type" />
                      <span class="dot"></span><span>Online</span>
                    </label>
                    <label class="type">
                      <input type="radio" value="hybrid" v-model="form.type" />
                      <span class="dot"></span><span>Hybrid</span>
                    </label>
                  </div>
                </div>-->

                <!-- เปิด/ปิดจำหน่าย -->
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

                <!-- วันงาน -->
                <div class="row two">
                  <div>
                    <label>วันเริ่มจัดงาน *</label>
                    <div class="with-icon cal"><input class="inp" type="datetime-local" v-model="form.startDate" /></div>
                  </div>
                  <div>
                    <label>วันสิ้นสุดงาน *</label>
                    <div class="with-icon cal"><input class="inp" type="datetime-local" v-model="form.endDate" /></div>
                  </div>
                </div>

                <!-- สถานที่/เวลา -->
                <div class="row two">
                  <div>
                    <label>ที่ตั้ง *</label>
                    <div class="with-icon loc"><input class="inp" v-model="form.venue" placeholder="เช่น Impact Arena, Hall 9" /></div>
                  </div>
                  <div>
                    <label>เวลาประตูเปิด *</label>
                    <div class="with-icon time"><input class="inp" v-model="form.gateOpen" placeholder="เช่น 17:00" /></div>
                  </div>
                </div>

                <div class="row">
                  <label>ที่อยู่</label>
                  <input class="inp" v-model="form.address" placeholder="ที่อยู่/รายละเอียดเพิ่มเติม" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- รายละเอียดและรูปภาพ -->
        <section class="card">
          <header class="card-head">
            <h2>รายละเอียดและรูปภาพ</h2>
            <button class="chev" @click="toggle(secMedia)">{{ secMedia ? '▴' : '▾' }}</button>
          </header>
          <div v-show="secMedia" class="card-body">
            <div class="stack">
              <div class="row">
                <label>คำอธิบาย *</label>
                <textarea class="inp" v-model="form.description" rows="4" placeholder="เล่ารายละเอียดเกี่ยวกับงาน"></textarea>
              </div>

              <div class="gallery">
                <div>
                  <label class="uplabel">ภาพ Hero</label>
                  <div class="upload small">
                    <input type="file" accept="image/*"
                           @change="e => { form.hero = e.target.files?.[0] ?? null; toPreview(form.hero, heroUrl) }" />
                    <div class="preview" v-if="heroUrl"><img :src="heroUrl" alt="" /></div>
                    <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                  </div>
                </div>
                <div>
                  <label class="uplabel">ภาพแกลเลอรี 1</label>
                  <div class="upload small">
                    <input type="file" accept="image/*"
                           @change="e => { form.gallery1 = e.target.files?.[0] ?? null; toPreview(form.gallery1, g1Url) }" />
                    <div class="preview" v-if="g1Url"><img :src="g1Url" alt="" /></div>
                    <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                  </div>
                </div>
                <div>
                  <label class="uplabel">ภาพแกลเลอรี 2</label>
                  <div class="upload small">
                    <input type="file" accept="image/*"
                           @change="e => { form.gallery2 = e.target.files?.[0] ?? null; toPreview(form.gallery2, g2Url) }" />
                    <div class="preview" v-if="g2Url"><img :src="g2Url" alt="" /></div>
                    <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- โซนของงาน -->
        <section class="card">
          <header class="card-head">
            <h2>โซนของงาน</h2>
            <button class="chev" @click="toggle(secStage)">{{ secStage ? '▴' : '▾' }}</button>
          </header>
          <div v-show="secStage" class="card-body">
            <button class="btn tiny ghost">Generate</button>
          </div>
        </section>

<!-- รอบของงาน -->
<section class="card">
  <header class="card-head">
    <h2>รอบของงาน</h2>
    <button class="chev" @click="toggle(secRounds)">
      {{ secRounds ? '▴' : '▾' }}
    </button>
  </header>

  <div v-show="secRounds" class="card-body">
    <!-- pill toggle -->
    <div class="pill-row">
      <label class="pill">
        <input
          type="checkbox"
          v-model="multiRounds"
          @change="onToggleMultiRounds(multiRounds)"
        />
        อีเวนต์มีหลายวัน/หลายรอบ
      </label>
    </div>

    <!-- rounds list -->
    <div v-for="(round, rIdx) in form.rounds" :key="rIdx" class="round">
      <div class="chip-row">
        <button
          class="btn danger ml-auto"
          v-if="form.rounds.length > 1"
          @click="removeRound(rIdx)"
          type="button"
        >
          ลบรอบ
        </button>
      </div>

      <!-- ✅ เปลี่ยนจาก row grid5 → Tailwind -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div>
          <label>ชื่อรอบหลัก*</label>
          <input
            class="inp w-full"
            v-model="round.roundName"
            placeholder="Main Day / รอบหลัก"
          />
        </div>

        <div>
          <label>เวลาเริ่มรอบ *</label>
          <input class="inp w-full" type="time" v-model="round.startTime" />
        </div>

        <div>
          <label>เวลาจบรอบ (ถ้ามี)</label>
          <input class="inp w-full" type="time" v-model="round.endTime" />
        </div>

        <div>
          <label>ผู้เข้าร่วมสูงสุด</label>
          <input
            class="inp w-full"
            type="number"
            v-model.number="round.maxAttendees"
            min="0"
          />
        </div>

        <div>
          <label>ราคา</label>
          <input
            class="inp w-full"
            type="number"
            v-model.number="round.price"
            min="0"
          />
        </div>
      </div>
    </div>

    <!-- ปุ่มเพิ่มรอบ -->
    <button class="addbar mt-3" type="button" @click="addRound">
      + เพิ่มรอบ
    </button>
  </div>
</section>


        <!-- ปุ่มล่าง -->
        <div class="footer-bar">
          <button class="btn ghost"   @click="onCancel">ยกเลิก</button>
          <button class="btn primary" :disabled="!isValid" @click="onSubmit">บันทึก</button>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
:root{
  --bg:#f1f3f6;
  --card:#fff;
  --line:#e5e7eb;
  --muted:#6b7280;
  --text:#111827;
  --brand:#ef4444;
}

/* ===== shell ===== */
.shell{ min-height:100vh; background:var(--bg); display:flex; flex-direction:column; color:var(--text); }

/* topbar */
.topbar{ height:56px; background:var(--brand); color:#fff; display:flex; align-items:center; justify-content:space-between; padding:0 16px; position:sticky; top:0; z-index:20; }
.logo{ font-weight:800; letter-spacing:.3px; }
.top-actions{ display:flex; align-items:center; gap:10px; }
.search{ height:34px; border:none; border-radius:8px; padding:0 10px; min-width:220px; }
.user{ display:flex; align-items:center; gap:6px; }
.i-user{ display:inline-block; width:16px; height:16px; border-radius:50%; background:#fff; }

/* layout */
.body{ flex:1; display:grid; grid-template-columns: 220px minmax(0, 1fr); align-items:start; }
.sidebar{ background:#fff; border-right:1px solid var(--line); min-height:calc(100vh - 56px); padding:14px 10px; }
.sidebar-title{ font-size:12px; color:var(--muted); margin:6px 8px; letter-spacing:.08em; }
.menu{ display:flex; flex-direction:column; gap:4px; }
.menu-section{ font-size:12px; color:var(--muted); margin:8px 8px 4px; }
.menu-item{ display:block; padding:8px 10px; border-radius:10px; color:#374151; text-decoration:none; cursor:pointer; }
.menu-item.active{ background:#fce7e7; color:#a31616; font-weight:600; }

/* content */
.content{ padding:18px 22px; width:100%; max-width:1200px; margin:0 auto; display:flex; flex-direction:column; gap:16px; }

/* title */
.page-big{ font-size:20px; font-weight:700; margin:10px 0 12px; }

/* cards */
.card{ background:var(--card); border:1px solid var(--line); border-radius:12px; margin-bottom:14px; overflow:hidden; width:100%; }
.card-head{ background:#e3e8ef; padding:10px 14px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; }
.card-head h2{ font-size:14px; margin:0; }
.chev{ border:none; background:transparent; font-size:16px; cursor:pointer; color:#334155; }
.card-body{ padding:14px; }

/* upload */
.upload{ border:1px dashed #cbd5e1; border-radius:12px; background:#fafafa; display:grid; place-items:center; position:relative; min-height:240px; }
.upload.small{ min-height:160px; }
.upload input[type=file]{ position:absolute; inset:0; opacity:0; cursor:pointer; }
.preview img{ max-width:100%; max-height:100%; border-radius:12px; }
.placeholder{ color:#9aa3af; font-size:14px; text-align:center; line-height:1.6; }
.uplabel{ display:block; font-size:14px; margin-bottom:8px; color:#374151; }

/* grid poster + fields */
.grid{ display:grid; grid-template-columns: 260px minmax(0,1fr); gap:16px; align-items:start; }
.fields{ display:block; min-width:0; }
.fields .row{ display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
.fields .row.two{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.fields label{ font-size:13px; color:#374151; }

/* ===== NEW: look & feel (Figma) ===== */
.inp{
  width:100%; height:44px;
  border:1px solid #e5e7eb; background:#fff; color:#111827;
  border-radius:12px; padding:0 14px; outline:none; box-sizing:border-box;
}
.inp:focus{ border-color:#cbd5e1; box-shadow:0 0 0 3px rgba(59,130,246,.08); }

/* status / switch */
.status-line{ display:flex; align-items:center; gap:10px; }
.status-tag{ font-size:12px; color:#6b7280; }
.status-tag.is-active{ color:#111827; font-weight:600; }
.switch{ position:relative; width:44px; height:24px; display:inline-block; }
.switch input{ display:none; }
.switch .slider{ position:absolute; inset:0; background:#e5e7eb; border-radius:999px; transition:.2s; }
.switch .slider:before{ content:''; position:absolute; height:18px; width:18px; left:3px; top:3px; background:#fff; border-radius:50%; transition:.2s; box-shadow:0 1px 2px rgba(0,0,0,.16); }
.switch input:checked + .slider{ background:#3b82f6; }
.switch input:checked + .slider:before{ transform:translateX(20px); }

/* (ถ้ามีใช้งาน) event type radios */
.types{ display:flex; gap:18px; align-items:center; }
.type{ display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none; }
.type input{ display:none; }
.type .dot{ width:38px; height:38px; border-radius:50%; border:2px solid #d1d5db; display:inline-block; }
.type input:checked + .dot{ border-color:#3b82f6; box-shadow: inset 0 0 0 8px #3b82f6; }

/* icons inside inputs */
.with-icon{ position:relative; }
.with-icon:before{
  content:''; position:absolute; left:12px; top:50%; transform:translateY(-50%); width:18px; height:18px; opacity:.55;
}
.with-icon input.inp{ padding-left:40px; }
.with-icon.cal:before{
  background:url("data:image/svg+xml,%3Csvg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E") no-repeat center/18px;
}
.with-icon.loc:before{
  background:url("data:image/svg+xml,%3Csvg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z'/%3E%3Ccircle cx='12' cy='10' r='3'/%3E%3C/svg%3E") no-repeat center/18px;
}
.with-icon.time:before{
  background:url("data:image/svg+xml,%3Csvg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6v6l4 2'/%3E%3C/svg%3E") no-repeat center/18px;
}

.inline{ display:flex; align-items:center; gap:10px; }
.inline .grow{ flex:1; }
.ck{ display:flex; align-items:center; gap:8px; color:#6b7280; font-size:13px; }

/* rounds / tiers */
.round{ padding:6px 0; border-top:1px solid #f1f5f9; }
.chip-row{ display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.ml-auto{ margin-left:auto; }
.mt12{ margin-top:12px; }

/* ✅ 3 คอลัมน์ตาม Figma */
.grid3{ display:grid; grid-template-columns: 1.4fr 1fr 1fr; gap:10px; }

/* tiers table */
.tiers{ margin-top:10px; display:flex; flex-direction:column; gap:8px; }
.tiers-head{ display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr 40px; gap:8px; font-size:12px; color:#6b7280; }
.tiers-row{ display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr 40px; gap:8px; }
.tiers-row .inp{ height:42px; }
.icon{ border:none; background:#fff; cursor:pointer; border-radius:8px; }
.icon.danger{ color:#ef4444; }

/* ✅ pill เม็ดโค้ง + checkbox โทนฟ้า */
.pill-row{ display:flex; align-items:center; gap:10px; margin:4px 0 14px; }
.pill{
  display:inline-flex; align-items:center; gap:8px;
  padding:6px 12px; border-radius:999px;
  background:#eaf2ff; border:1px solid #c7d2fe; color:#1d4ed8;
  font-size:13px; font-weight:600; line-height:1;
}
.pill input{ accent-color:#3b82f6; transform:translateY(1px); }

/* ✅ ปุ่ม + เพิ่มรอบ แบบเต็มกว้าง */
.addbar{
  width:100%; height:42px; border-radius:10px;
  border:1px dashed #dfe3e8; background:#f5f7fa; color:#374151; cursor:pointer;
}
.addbar:hover{ background:#eef2f6; }

/* footer buttons */
.footer-bar{ display:flex; justify-content:flex-end; gap:10px; margin-top:14px; }
.btn{ border:none; border-radius:10px; padding:10px 14px; cursor:pointer; }
.btn.small{ padding:6px 10px; }
.btn.tiny{ padding:4px 8px; font-size:12px; }
.btn.ghost{ background:#fff; border:1px solid #d1d5db; }
.btn.primary{ background:#6366f1; color:#fff; }
.btn.danger{ background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }
.btn.blue{ background:#3b82f6; color:#fff; }



/* ========== responsive (ของเดิม) ========== */
@media (max-width: 1000px){
  .body{ grid-template-columns: 200px minmax(0,1fr); }
}
@media (max-width: 860px){
  .body{ grid-template-columns: 1fr; }
  .sidebar{ position:sticky; top:56px; min-height:auto; }
}
@media (max-width: 920px){
  .grid{ grid-template-columns:1fr; }
  .gallery{ grid-template-columns:1fr; }
  .fields .row.two{ grid-template-columns:1fr; }
  .tiers-head, .tiers-row{ grid-template-columns:1.5fr 1fr 1fr 1fr 1fr 40px; }
}
</style>
