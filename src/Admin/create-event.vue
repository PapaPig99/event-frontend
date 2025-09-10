<script setup>
import { reactive, ref, computed } from 'vue'

/** ฟอร์มหลัก */
const form = reactive({
  poster: null,
  name: '',
  category: '',
  organizer: '',
  type: 'offline',
  regOpen: '',
  regClose: '',
  startDate: '',
  endDate: '',
  ageLimit: '',
  venue: '',
  address: '',
  description: '',
  hero: null,
  gallery1: null,
  gallery2: null,
  zones: [],
  rounds: [
    {
      roundName: '',
      saleStart: '',
      saleClose: '',
      tiers: [{ name: '', qty: '', minPerUser: '1', maxPerUser: '4', price: '' }]
    }
  ]
})

/** ตัวช่วยแสดงรูป preview */
const posterUrl = ref('');  const heroUrl = ref('');  const g1Url = ref('');  const g2Url = ref('');
function toPreview(file, targetRef) {
  if (!file) { targetRef.value = ''; return }
  targetRef.value = URL.createObjectURL(file)
}

/** เพิ่ม/ลบ tier */
function addTier(r){ form.rounds[r].tiers.push({ name:'', qty:'', minPerUser:'1', maxPerUser:'4', price:'' }) }
function removeTier(r,i){ form.rounds[r].tiers.splice(i,1) }
/** เพิ่ม/ลบรอบ */
function addRound(){ form.rounds.push({ roundName:'', saleStart:'', saleClose:'', tiers:[{ name:'', qty:'', minPerUser:'1', maxPerUser:'4', price:'' }] }) }
function removeRound(i){ form.rounds.splice(i,1) }

/** section accordion */
const secBasic = ref(true)
const secMedia = ref(true)
const secStage = ref(true)
const secRounds = ref(true)
const toggle = (refBool)=> refBool.value = !refBool.value

/** validate + submit (เดิม) */
const isValid = computed(() =>
  form.name.trim() && form.category.trim() && form.type && form.startDate && form.endDate && form.venue.trim()
)

async function onSubmit(){
  if(!isValid.value){ alert('กรอกฟิลด์ที่จำเป็นให้ครบก่อนนะ'); return }
  const fd = new FormData()
  const entries = {
    name:form.name, category:form.category, organizer:form.organizer, type:form.type,
    regOpen:form.regOpen, regClose:form.regClose, startDate:form.startDate, endDate:form.endDate,
    ageLimit:form.ageLimit, venue:form.venue, address:form.address, description:form.description
  }
  Object.entries(entries).forEach(([k,v]) => fd.append(k, v ?? ''))
  if(form.poster) fd.append('poster', form.poster)
  if(form.hero) fd.append('hero', form.hero)
  if(form.gallery1) fd.append('gallery1', form.gallery1)
  if(form.gallery2) fd.append('gallery2', form.gallery2)
  fd.append('rounds', JSON.stringify(form.rounds))
  fd.append('zones', JSON.stringify(form.zones))

  try{
    const res = await fetch('/api/events', { method:'POST', body:fd })
    if(!res.ok) throw new Error('Upload failed')
    alert('บันทึกสำเร็จ!')
  }catch(e){ console.error(e); alert('เกิดข้อผิดพลาดในการบันทึก') }
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
        <div class="user">
          <i class="i-user" /> Username
        </div>
        <button class="btn small ghost">Signout</button>
      </div>
    </header>

    <!-- Body -->
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
                         @change="e => { form.poster = e.target.files?.[0] ?? null; toPreview(form.poster, posterUrl) }">
                  <div class="preview" v-if="posterUrl"><img :src="posterUrl" alt="poster"></div>
                  <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                </div>
              </div>

              <!-- fields -->
              <div class="fields">
                <div class="row">
                  <label>ชื่อ *</label>
                  <input v-model="form.name" placeholder="เช่น NCT Reboot Live">
                </div>

                <div class="row two">
                  <div>
                    <label>หมวดหมู่ *</label>
                    <input v-model="form.category" placeholder="Concert, Seminar, Sport...">
                  </div>
                  <div>
                    <label>ประเภทอีเวนต์ *</label>
                    <div class="radio">
                      <label><input type="radio" value="offline" v-model="form.type"> Offline</label>
                      <label><input type="radio" value="online"  v-model="form.type"> Online</label>
                      <label><input type="radio" value="hybrid"  v-model="form.type"> Hybrid</label>
                    </div>
                  </div>
                </div>

                <div class="row two">
                  <div>
                    <label>วันเปิดลงทะเบียน</label>
                    <input type="datetime-local" v-model="form.regOpen">
                  </div>
                  <div>
                    <label>วันปิดลงทะเบียน</label>
                    <input type="datetime-local" v-model="form.regClose">
                  </div>
                </div>

                <div class="row two">
                  <div>
                    <label>วันเริ่มอีเวนต์ *</label>
                    <input type="datetime-local" v-model="form.startDate" required>
                  </div>
                  <div>
                    <label>วันสิ้นสุด *</label>
                    <input type="datetime-local" v-model="form.endDate" required>
                  </div>
                </div>

                <div class="row two">
                  <div>
                    <label>จำกัดอายุ</label>
                    <input v-model="form.ageLimit" placeholder="เช่น 6+, 18+, All age">
                  </div>
                  <div>
                    <label>ผู้จัด (Organizer)</label>
                    <input v-model="form.organizer" placeholder="ชื่อผู้จัด">
                  </div>
                </div>

                <div class="row">
                  <label>สถานที่จัด *</label>
                  <input v-model="form.venue" placeholder="เช่น Impact Arena, Hall 9">
                </div>
                <div class="row">
                  <label>ที่อยู่</label>
                  <input v-model="form.address" placeholder="ที่อยู่/รายละเอียดเพิ่มเติม">
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
                <textarea v-model="form.description" rows="4" placeholder="เล่ารายละเอียดเกี่ยวกับงาน"></textarea>
              </div>

              <div class="gallery">
                <div>
                  <label class="uplabel">ภาพ Hero</label>
                  <div class="upload small">
                    <input type="file" accept="image/*"
                           @change="e => { form.hero = e.target.files?.[0] ?? null; toPreview(form.hero, heroUrl) }">
                    <div class="preview" v-if="heroUrl"><img :src="heroUrl" alt=""></div>
                    <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                  </div>
                </div>
                <div>
                  <label class="uplabel">ภาพแกลเลอรี 1</label>
                  <div class="upload small">
                    <input type="file" accept="image/*"
                           @change="e => { form.gallery1 = e.target.files?.[0] ?? null; toPreview(form.gallery1, g1Url) }">
                    <div class="preview" v-if="g1Url"><img :src="g1Url" alt=""></div>
                    <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                  </div>
                </div>
                <div>
                  <label class="uplabel">ภาพแกลเลอรี 2</label>
                  <div class="upload small">
                    <input type="file" accept="image/*"
                           @change="e => { form.gallery2 = e.target.files?.[0] ?? null; toPreview(form.gallery2, g2Url) }">
                    <div class="preview" v-if="g2Url"><img :src="g2Url" alt=""></div>
                    <div class="placeholder" v-else>อัปโหลดรูปภาพ</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- โซนของสนาม (placeholder ตาม mockup) -->
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
            <button class="chev" @click="toggle(secRounds)">{{ secRounds ? '▴' : '▾' }}</button>
          </header>

          <div v-show="secRounds" class="card-body">
            <div v-for="(round, rIdx) in form.rounds" :key="rIdx" class="round">
              <div class="chip-row">
                <span class="chip blue">ขั้นตอนสร้างกิจกรรม</span>
              </div>

              <div class="row two">
                <div>
                  <label>ชื่อรอบ/ช่วงขาย*</label>
                  <input v-model="round.roundName" placeholder="Early bird / Regular / VIP ...">
                </div>
                <div class="actions">
                  <button class="btn danger" v-if="form.rounds.length>1" @click="removeRound(rIdx)">ลบรอบ</button>
                </div>
              </div>

              <div class="row two">
                <div>
                  <label>เวลาเริ่มขาย</label>
                  <input type="datetime-local" v-model="round.saleStart">
                </div>
                <div>
                  <label>เวลาปิดขาย</label>
                  <input type="datetime-local" v-model="round.saleClose">
                </div>
              </div>

              <div class="tiers">
                <div class="tiers-head">
                  <div>ชื่อบัตร</div>
                  <div>จำนวนที่นั่ง</div>
                  <div>ซื้อขั้นต่ำ</div>
                  <div>ซื้อสูงสุด</div>
                  <div>ราคา (฿)</div>
                  <div></div>
                </div>

                <div class="tiers-row" v-for="(t, i) in round.tiers" :key="i">
                  <input v-model="t.name" placeholder="เช่น Zone A">
                  <input v-model="t.qty" type="number" min="0" placeholder="0">
                  <input v-model="t.minPerUser" type="number" min="1" placeholder="1">
                  <input v-model="t.maxPerUser" type="number" min="1" placeholder="4">
                  <input v-model="t.price" type="number" min="0" placeholder="0">
                  <button class="icon danger" v-if="round.tiers.length>1" @click="removeTier(rIdx, i)">✕</button>
                </div>

                <button class="btn small" @click="addTier(rIdx)">+ เพิ่มบัตร</button>
              </div>
            </div>

            <div class="mt12">
              <button class="btn ghost" @click="addRound">+ เพิ่มรอบ</button>
            </div>
          </div>
        </section>

        <!-- ปุ่มล่าง -->
        <div class="footer-bar">
          <button class="btn ghost">ยกเลิก</button>
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

/* ====== shell layout ====== */
.shell{ min-height:100vh; background:var(--bg); display:flex; flex-direction:column; color:var(--text); }

/* topbar */
.topbar{
  height:56px; background:var(--brand); color:#fff; display:flex; align-items:center; justify-content:space-between;
  padding:0 16px; position:sticky; top:0; z-index:20;
}
.logo{ font-weight:800; letter-spacing:.3px; }
.top-actions{ display:flex; align-items:center; gap:10px; }
.search{ height:34px; border:none; border-radius:8px; padding:0 10px; min-width:220px; }
.user{ display:flex; align-items:center; gap:6px; }
.i-user{ display:inline-block; width:16px; height:16px; border-radius:50%; background:#fff; }

/* body (aside + main) */
.body{
  flex:1;
  display:grid;
  /* ✅ กันคอลัมน์ขวาหดเหลือ 0 */
  grid-template-columns: 220px minmax(0, 1fr);
  align-items:start;
}
.sidebar{
  background:#fff; border-right:1px solid var(--line); min-height:calc(100vh - 56px); padding:14px 10px;
}
.sidebar-title{ font-size:12px; color:var(--muted); margin:6px 8px; letter-spacing:.08em; }
.menu{ display:flex; flex-direction:column; gap:4px; }
.menu-section{ font-size:12px; color:var(--muted); margin:8px 8px 4px; }
.menu-item{ display:block; padding:8px 10px; border-radius:10px; color:#374151; text-decoration:none; cursor:pointer; }
.menu-item.active{ background:#fce7e7; color:#a31616; font-weight:600; }

/* ✅ ทำให้คอลัมน์ขวากว้างเต็มและอยู่กึ่งกลาง */
.content{
  padding:18px 22px;
  width:100%;
  max-width:1200px;   /* ปรับได้ตามต้องการ เช่น 1140/1280 */
  margin:0 auto;
  display:flex;
  flex-direction:column;
  gap:16px;
}

/* title */
.page-big{ font-size:20px; font-weight:700; margin:10px 0 12px; }

/* ====== cards ====== */
.card{
  background:var(--card); border:1px solid var(--line); border-radius:12px; margin-bottom:14px; overflow:hidden;
  width:100%; /* ✅ ให้การ์ดขยายเต็มความกว้างของ .content */
}
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
.grid{
  display:grid;
  grid-template-columns: 260px minmax(0,1fr); /* ✅ กันคอลัมน์ขวาหด */
  gap:16px;
  align-items:start;
}
.fields{ display:block; min-width:0; }
.fields .row{ display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
.fields .row.two{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.fields label{ font-size:13px; color:#374151; }
.fields input, .fields textarea{
  width:100%; height:40px; border:1px solid #d1d5db; border-radius:10px; padding:0 12px; outline:none; box-sizing:border-box; background:#fff;
}
.fields textarea{ height:auto; min-height:96px; padding:10px 12px; }
.radio{ display:flex; gap:14px; align-items:center; height:40px; }

/* gallery */
.stack{ display:block; }
.gallery{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-top:10px; }

/* rounds / tiers */
.round{ padding:6px 0; border-top:1px solid #f1f5f9; }
.chip-row{ margin-bottom:8px; }
.chip{ display:inline-block; font-size:12px; padding:6px 8px; border-radius:10px; border:1px solid #c7d2fe; color:#1d4ed8; background:#eef2ff; }
.tiers{ margin-top:10px; display:flex; flex-direction:column; gap:8px; }
.tiers-head{ display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr 40px; gap:8px; font-size:12px; color:#6b7280; }
.tiers-row{ display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr 40px; gap:8px; }
.tiers-row input{ width:100%; height:38px; border:1px solid #d1d5db; border-radius:10px; padding:0 10px; box-sizing:border-box; }
.icon{ border:none; background:#fff; cursor:pointer; border-radius:8px; }
.icon.danger{ color:#ef4444; }

/* footer buttons */
.footer-bar{ display:flex; justify-content:flex-end; gap:10px; margin-top:14px; }
.btn{ border:none; border-radius:10px; padding:10px 14px; cursor:pointer; }
.btn.small{ padding:6px 10px; }
.btn.tiny{ padding:4px 8px; font-size:12px; }
.btn.ghost{ background:#fff; border:1px solid #d1d5db; }
.btn.primary{ background:#6366f1; color:#fff; }
.btn.danger{ background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }
.btn.blue{ background:#3b82f6; color:#fff; }

/* responsive */
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
