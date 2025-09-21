<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/** router */
const route = useRoute()
const router = useRouter()
const eventId = route.params.id

/** สถานะโหลด/บันทึก */
const loading = ref(true)
const saving  = ref(false)

/** ฟอร์มหลัก (เหมือนหน้า create) */
const form = reactive({
  poster: null,
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
  extraImage: null,
  layoutPlan: null,
  rounds: [{ roundName: '', startTime: '', endTime: '', maxAttendees: 0, price: 0 }],
  zones: []
})

/** preview รูป */
const posterUrl = ref('')
const extraUrl  = ref('')
const planUrl   = ref('')

function toPreview (file, targetRef) {
  if (!file) { targetRef.value = ''; return }
  targetRef.value = URL.createObjectURL(file)
}

/** หลายรอบ/หลายโซน */
const multiRounds = ref(false)
const multiZones  = ref(false)

function addRound () {
  if (!multiRounds.value) return
  form.rounds.push({ roundName: '', startTime: '', endTime: '', maxAttendees: 0, price: 0 })
}
function removeRound (i) { form.rounds.splice(i, 1) }
function onToggleMultiRounds(v){
  if (!v && form.rounds.length > 1) form.rounds = [ form.rounds[0] ]
}

function addZone () {
  if (!multiZones.value) return
  form.zones.push({ name: '', capacity: 0, price: 0, color: '' })
}
function removeZone (i) { form.zones.splice(i, 1) }

/** utils: วันที่สำหรับ input[type=datetime-local] */
function toLocalInput(iso){
  if(!iso) return ''
  // ตัดวินาที/โซนเวลา -> YYYY-MM-DDTHH:MM
  const d = new Date(iso)
  const pad = n => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** โหลดข้อมูลเดิม */
async function loadEvent () {
  try{
    const res = await fetch(`/api/events/${eventId}`)
    if(!res.ok) throw new Error('Load failed')
    const data = await res.json()

    // map -> form
    form.name       = data.name ?? ''
    form.category   = data.category ?? ''
    form.organizer  = data.organizer ?? ''
    form.type       = data.type ?? 'offline'
    form.status     = !!data.status
    form.regOpen    = toLocalInput(data.regOpen)
    form.regClose   = toLocalInput(data.regClose)
    form.saleNoEnd  = !!data.saleNoEnd
    form.startDate  = toLocalInput(data.startDate)
    form.endDate    = toLocalInput(data.endDate)
    form.venue      = data.venue ?? ''
    form.address    = data.address ?? ''
    form.gateOpen   = data.gateOpen ?? ''
    form.ageLimit   = data.ageLimit ?? ''
    form.description= data.description ?? ''

    // รูป (ใช้ url เดิมแสดง preview / ถ้าอัปโหลดใหม่ค่อยแทน)
    posterUrl.value = data.posterUrl || ''
    extraUrl.value  = data.extraImageUrl || ''
    planUrl.value   = data.layoutPlanUrl || ''

    // rounds / zones
    form.rounds = Array.isArray(data.rounds) && data.rounds.length
      ? data.rounds.map(r => ({
          roundName: r.roundName ?? '',
          startTime: r.startTime ?? '',
          endTime:   r.endTime ?? '',
          maxAttendees: Number(r.maxAttendees ?? 0),
          price: Number(r.price ?? 0),
        }))
      : [{ roundName: '', startTime: '', endTime: '', maxAttendees: 0, price: 0 }]

    form.zones = Array.isArray(data.zones) ? data.zones.map(z => ({
      name: z.name ?? '',
      capacity: Number(z.capacity ?? 0),
      price: Number(z.price ?? 0),
      color: z.color ?? ''
    })) : []

    // toggle เริ่มต้น
    multiRounds.value = form.rounds.length > 1
    multiZones.value  = form.zones.length  > 0
  }catch(e){
    console.error(e)
    alert('โหลดข้อมูลอีเวนต์ไม่สำเร็จ')
  }finally{
    loading.value = false
  }
}

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

async function onUpdate () {
  if (!isValid.value) { alert('กรอกฟิลด์ที่จำเป็นให้ครบก่อนนะ'); return }
  saving.value = true
  try{
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

    // ส่งไฟล์เฉพาะที่ผู้ใช้เลือกใหม่ (ไม่งั้น backend บางตัวจะทับค่าเป็นว่าง)
    if (form.poster instanceof File)     fd.append('poster',     form.poster)
    if (form.extraImage instanceof File) fd.append('extraImage', form.extraImage)
    if (form.layoutPlan instanceof File) fd.append('layoutPlan', form.layoutPlan)

    fd.append('rounds', JSON.stringify(form.rounds))
    fd.append('zones',  JSON.stringify(form.zones))

    const res = await fetch(`/api/events/${eventId}`, { method: 'PUT', body: fd })
    if(!res.ok) throw new Error('Update failed')
    alert('บันทึกการแก้ไขสำเร็จ!')
    router.back()
  }catch(e){
    console.error(e)
    alert('เกิดข้อผิดพลาดระหว่างบันทึก')
  }finally{
    saving.value = false
  }
}

function onCancel(){ router.back() }

onMounted(loadEvent)
</script>

<template>
  <div class="shell">
    <!-- Topbar -->
    <header class="topbar">
      <div class="brand"><span class="logo">JoinUp</span></div>
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
          <a class="menu-item">All Events</a>
          <a class="menu-item active">Edit Event</a>
        </nav>
      </aside>

      <main class="content">
        <h1 class="page-big">Edit Event</h1>

        <div v-if="loading" class="card"><div class="card-body">กำลังโหลดข้อมูล…</div></div>

        <template v-else>
          <!-- ข้อมูลอีเวนต์ -->
          <section class="card">
            <header class="card-head accent">
              <h2>ข้อมูลอีเวนต์</h2>
              <button class="chev" @click="secBasic = !secBasic">{{ secBasic ? '▴' : '▾' }}</button>
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
                  <div class="row"><label>ชื่อ *</label><input class="inp" v-model="form.name" /></div>

                  <div class="row two">
                    <div>
                      <label>หมวดหมู่ *</label>
                      <select class="inp" v-model="form.category">
                        <option value="">ยังไม่ได้เลือก</option>
                        <option>Concert</option><option>Seminar</option><option>Sport</option>
                      </select>
                    </div>

                    <div>
                      <label>สถานะอีเวนต์</label>
                      <div class="status-line">
                        <span :class="['status-tag', !form.status && 'is-active']">ปิดใช้งาน</span>
                        <label class="switch"><input type="checkbox" v-model="form.status" /><span class="slider"></span></label>
                        <span :class="['status-tag', form.status && 'is-active']">เผยแพร่</span>
                      </div>
                    </div>
                  </div>

                  <div class="row two">
                    <div>
                      <label>วันที่และเวลาเปิดจำหน่าย *</label>
                      <div class="with-icon cal"><input class="inp" type="datetime-local" v-model="form.regOpen" /></div>
                    </div>
                    <div>
                      <label>วันที่และเวลาปิดจำหน่าย *</label>
                      <div class="inline">
                        <div class="with-icon cal grow"><input class="inp" type="datetime-local" v-model="form.regClose" :disabled="form.saleNoEnd" /></div>
                        <label class="ck"><input type="checkbox" v-model="form.saleNoEnd" /> ปิดเมื่อบัตรหมด</label>
                      </div>
                    </div>
                  </div>

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

                  <div class="row two">
                    <div><label>ที่ตั้ง *</label><div class="with-icon loc"><input class="inp" v-model="form.venue" /></div></div>
                    <div><label>เวลาประตูเปิด *</label><div class="with-icon time"><input class="inp" v-model="form.gateOpen" placeholder="เช่น 17:00" /></div></div>
                  </div>

                  <div class="row"><label>ที่อยู่</label><input class="inp" v-model="form.address" /></div>
                </div>
              </div>
            </div>
          </section>

          <!-- รายละเอียดและรูปภาพ -->
          <section class="card">
            <header class="card-head accent">
              <h2>รายละเอียดและรูปภาพ</h2>
              <button class="chev" @click="secMedia=!secMedia">{{ secMedia ? '▴' : '▾' }}</button>
            </header>
            <div v-show="secMedia" class="card-body">
              <div class="stack">
                <div class="row">
                  <label>คำอธิบาย *</label>
                  <textarea class="inp" v-model="form.description" rows="4" />
                </div>

                <div class="gallery two-col">
                  <div>
                    <label class="uplabel">รูปภาพเพิ่มเติม</label>
                    <div class="upload small">
                      <input type="file" accept="image/*"
                             @change="e => { form.extraImage = e.target.files?.[0] ?? null; toPreview(form.extraImage, extraUrl) }" />
                      <div class="preview" v-if="extraUrl"><img :src="extraUrl" alt="" /></div>
                      <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                    </div>
                  </div>

                  <div>
                    <label class="uplabel">ผังงาน/ผังที่นั่ง</label>
                    <div class="upload small">
                      <input type="file" accept="image/*"
                             @change="e => { form.layoutPlan = e.target.files?.[0] ?? null; toPreview(form.layoutPlan, planUrl) }" />
                      <div class="preview" v-if="planUrl"><img :src="planUrl" alt="" /></div>
                      <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- โซนของงาน (เพิ่มตารางแก้ไขแบบง่าย) -->
          <section class="card">
            <header class="card-head accent">
              <h2>โซนของงาน</h2>
              <button class="chev" @click="secStage=!secStage">{{ secStage ? '▴' : '▾' }}</button>
            </header>
            <div v-show="secStage" class="card-body">
              <div class="pill-row">
                <label class="pill"><input type="checkbox" v-model="multiZones" /> มีหลายโซน</label>
              </div>

              <div v-if="multiZones" class="zones">
                <div class="zones-head">
                  <div>ชื่อโซน</div><div>ความจุ</div><div>ราคา</div><div>สี</div><div></div>
                </div>
                <div v-for="(z,i) in form.zones" :key="i" class="zones-row">
                  <input class="inp" v-model="z.name" placeholder="เช่น VIP A" />
                  <input class="inp" type="number" v-model.number="z.capacity" min="0" />
                  <input class="inp" type="number" v-model.number="z.price" min="0" />
                  <input class="inp" v-model="z.color" placeholder="#FF66AA / red" />
                  <button class="icon danger" @click="removeZone(i)">✕</button>
                </div>

                <button class="addbar mt-3" type="button" @click="addZone()">+ เพิ่มโซน</button>
              </div>
            </div>
          </section>

          <!-- รอบของงาน -->
          <section class="card">
            <header class="card-head accent">
              <h2>รอบของงาน</h2>
              <button class="chev" @click="secRounds=!secRounds">{{ secRounds ? '▴' : '▾' }}</button>
            </header>

            <div v-show="secRounds" class="card-body">
              <div class="pill-row">
                <label class="pill">
                  <input type="checkbox" v-model="multiRounds" @change="onToggleMultiRounds(multiRounds)" />
                  อีเวนต์มีหลายวัน/หลายรอบ
                </label>
              </div>

              <div v-for="(round, rIdx) in form.rounds" :key="rIdx" class="round">
                <div class="chip-row">
                  <button class="btn danger ml-auto" v-if="multiRounds && form.rounds.length > 1" @click="removeRound(rIdx)" type="button">ลบรอบ</button>
                </div>

                <div class="row grid5">
                  <div><label>ชื่อรอบ*</label><input class="inp" v-model="round.roundName" placeholder="Main Day / รอบหลัก" /></div>
                  <div><label>เวลาเริ่มรอบ *</label><input class="inp" type="time" v-model="round.startTime" /></div>
                  <div><label>เวลาจบรอบ (ถ้ามี)</label><input class="inp" type="time" v-model="round.endTime" /></div>
                  <div><label>ผู้เข้าร่วมสูงสุด</label><input class="inp" type="number" v-model.number="round.maxAttendees" min="0" /></div>
                  <div><label>ราคา</label><input class="inp" type="number" v-model.number="round.price" min="0" /></div>
                </div>
              </div>

              <button class="addbar mt-3" type="button" v-if="multiRounds" @click="addRound()">+ เพิ่มรอบ</button>
            </div>
          </section>

          <!-- ปุ่มล่าง -->
          <div class="footer-bar">
            <button class="btn ghost" @click="onCancel">ยกเลิก</button>
            <button class="btn primary" :disabled="!isValid || saving" @click="onUpdate">{{ saving ? 'กำลังบันทึก…' : 'บันทึก' }}</button>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
:root{
  --bg:#f1f3f6; --card:#fff; --line:#e5e7eb; --muted:#6b7280; --text:#111827; --brand:#ef4444;
}

/* shell & layout */
.shell{ min-height:100vh; background:var(--bg); display:flex; flex-direction:column; color:var(--text); }
.topbar{ height:56px; background:var(--brand); color:#fff; display:flex; align-items:center; justify-content:space-between; padding:0 16px; position:sticky; top:0; z-index:20; }
.logo{ font-weight:800; letter-spacing:.3px; }
.top-actions{ display:flex; align-items:center; gap:10px; }
.search{ height:34px; border:none; border-radius:8px; padding:0 10px; min-width:220px; }
.user{ display:flex; align-items:center; gap:6px; }
.i-user{ display:inline-block; width:16px; height:16px; border-radius:50%; background:#fff; }
.body{ flex:1; display:grid; grid-template-columns: 220px minmax(0, 1fr); align-items:start; }
.sidebar{ background:#fff; border-right:1px solid var(--line); min-height:calc(100vh - 56px); padding:14px 10px; }
.sidebar-title{ font-size:12px; color:var(--muted); margin:6px 8px; letter-spacing:.08em; }
.menu{ display:flex; flex-direction:column; gap:4px; }
.menu-item{ display:block; padding:8px 10px; border-radius:10px; color:#374151; text-decoration:none; cursor:pointer; }
.menu-item.active{ background:#fce7e7; color:#a31616; font-weight:600; }
.content{ padding:18px 22px; width:100%; max-width:1200px; margin:0 auto; display:flex; flex-direction:column; gap:16px; }

/* cards */
.card{ background:var(--card); border:1px solid var(--line); border-radius:12px; margin-bottom:14px; overflow:hidden; width:100%; }
.card-head{ padding:10px 14px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; }
.card-head h2{ font-size:14px; margin:0; }
.card-body{ padding:14px; }
.chev{ border:none; background:transparent; font-size:16px; cursor:pointer; color:#334155; }

/* accent header (ทุก section) */
.card-head.accent{ background:#b8c7d6; color:#2b3642; position:relative; }
.card-head.accent h2{ margin:0; width:100%; text-align:center; font-weight:700; }
.card-head.accent .chev{ position:absolute; right:12px; top:50%; transform:translateY(-50%); color:#1f2937; opacity:.85; }

/* upload */
.upload{ border:1px dashed #cbd5e1; border-radius:12px; background:#fafafa; display:grid; place-items:center; position:relative; min-height:240px; }
.upload.small{ min-height:160px; }
.upload input[type=file]{ position:absolute; inset:0; opacity:0; cursor:pointer; }
.preview img{ max-width:100%; max-height:100%; border-radius:12px; }
.placeholder{ color:#9aa3af; font-size:14px; text-align:center; line-height:1.6; }
.uplabel{ display:block; font-size:14px; margin-bottom:8px; color:#374151; }

/* fields & inputs */
.grid{ display:grid; grid-template-columns: 260px minmax(0,1fr); gap:16px; align-items:start; }
.fields .row{ display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
.fields .row.two{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.inp{ width:100%; height:44px; border:1px solid #e5e7eb; background:#fff; color:#111827; border-radius:12px; padding:0 14px; outline:none; box-sizing:border-box; }
.inp:focus{ border-color:#cbd5e1; box-shadow:0 0 0 3px rgba(59,130,246,.08); }
.fields label{ font-size:13px; color:#374151; }

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

/* icons */
.with-icon{ position:relative; }
.with-icon:before{ content:''; position:absolute; left:12px; top:50%; transform:translateY(-50%); width:18px; height:18px; opacity:.55; }
.with-icon input.inp{ padding-left:40px; }
.with-icon.cal:before{ background:url("data:image/svg+xml,%3Csvg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E") no-repeat center/18px; }
.with-icon.loc:before{ background:url("data:image/svg+xml,%3Csvg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z'/%3E%3Ccircle cx='12' cy='10' r='3'/%3E%3C/svg%3E") no-repeat center/18px; }
.with-icon.time:before{ background:url("data:image/svg+xml,%3Csvg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6v6l4 2'/%3E%3C/svg%3E") no-repeat center/18px; }

/* rounds */
.round{ padding:6px 0; border-top:1px solid #f1f5f9; }
.chip-row{ display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.ml-auto{ margin-left:auto; }
.row.grid5{ display:grid; grid-template-columns: 1.2fr .8fr .8fr .8fr .8fr; gap:10px; align-items:end; }

/* zones table */
.zones{ display:flex; flex-direction:column; gap:8px; }
.zones-head, .zones-row{ display:grid; grid-template-columns: 2fr 1fr 1fr 1fr 40px; gap:8px; align-items:center; }
.icon{ border:1px solid #e5e7eb; background:#fff; border-radius:8px; height:40px; cursor:pointer; }
.icon.danger{ color:#b91c1c; }
.mt-3{ margin-top:12px; }

/* gallery/stack */
.gallery.two-col{ display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
.stack{ display:flex; flex-direction:column; gap:12px; }

/* pill & addbar */
.pill-row{ display:flex; align-items:center; gap:10px; margin:4px 0 14px; }
.pill{ display:inline-flex; align-items:center; gap:8px; padding:6px 12px; border-radius:999px; background:#eaf2ff; border:1px solid #c7d2fe; color:#1d4ed8; font-size:13px; font-weight:600; line-height:1; }
.pill input{ accent-color:#3b82f6; transform:translateY(1px); }
.addbar{ width:100%; height:42px; border-radius:10px; border:1px dashed #dfe3e8; background:#f5f7fa; color:#374151; cursor:pointer; }
.addbar:hover{ background:#eef2f6; }

/* footer buttons */
.footer-bar{ display:flex; justify-content:flex-end; gap:10px; margin-top:14px; }
.btn{ border:none; border-radius:10px; padding:10px 14px; cursor:pointer; }
.btn.small{ padding:6px 10px; }
.btn.ghost{ background:#fff; border:1px solid #d1d5db; }
.btn.primary{ background:#6366f1; color:#fff; }
.btn.danger{ background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }

/* responsive */
@media (max-width: 1000px){ .body{ grid-template-columns: 200px minmax(0,1fr); } }
@media (max-width: 920px){
  .grid{ grid-template-columns:1fr; }
  .fields .row.two{ grid-template-columns:1fr; }
  .gallery.two-col{ grid-template-columns:1fr; }
  .zones-head, .zones-row{ grid-template-columns: 1.5fr 1fr 1fr 1fr 40px; }
}
@media (max-width: 860px){
  .body{ grid-template-columns: 1fr; }
  .sidebar{ position:sticky; top:56px; min-height:auto; }
}
</style>
