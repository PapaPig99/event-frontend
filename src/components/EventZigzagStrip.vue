<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  items:  { type: Array,  required: true },
  height: { type: Number, default: 360 },
  gap:    { type: Number, default: 0 },
  auto:        { type: Boolean, default: true },
  autoSpeed:   { type: Number,  default: 0.6 },   // px/เฟรม
  edgePause:   { type: Number,  default: 700 },
  pauseOnHover:{ type: Boolean, default: false },

  // 🆕 ทำให้กลับมาเลื่อน “นุ่ม” หลัง mouseleave
  rampMs:      { type: Number,  default: 300 },   // ระยะเวลาค่อย ๆ เร่ง
  leavePause:  { type: Number,  default: 300 },   // หน่วงหลังออกจาก hover
})

const wrap = ref(null)
let dragging = false
let lastX = 0
let lastT = 0
let vX = 0
let raf = null
let snapTimer = null

// auto-scroll
let autoRAF = null
let autoDir = 1
let hovering = false
let pauseUntil = 0

// 🆕 ramp state
let rampStart = 0   // เวลาเริ่ม ramp (กำหนดเป็น timestamp)
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3) }

function enableSnapLater(el, delay=80){
  // ❗เอาแค่เอา class dragging ออก ไม่ไปยุ่ง nosnap เพื่อลดการสลับสถานะ
  if (snapTimer){ clearTimeout(snapTimer) }
  snapTimer = setTimeout(()=> el.classList.remove('dragging'), delay)
}

function onPointerDown(e){
  const el = wrap.value; if(!el) return
  cancelMomentum()
  dragging = true
  el.setPointerCapture?.(e.pointerId)
  lastX = e.clientX
  lastT = performance.now()
  el.classList.add('nosnap','dragging')
}

function onPointerMove(e){
  if(!dragging) return
  const el = wrap.value
  const now = performance.now()
  const dt = Math.max(1, now - lastT)
  el.scrollLeft -= (e.clientX - lastX)
  vX = (e.clientX - lastX) / dt
  lastX = e.clientX
  lastT = now
  e.preventDefault()
}

function onPointerUp(){
  const el = wrap.value; if(!el) return
  dragging = false
  startMomentumScroll()
}

// ---------- inertia ----------
function startMomentumScroll(){
  const el = wrap.value; if(!el) return
  let vx = vX * 16.67
  const friction = 0.92
  const min = 0.25

  cancelMomentum()
  const step = ()=>{
    if (Math.abs(vx) > min){
      el.scrollLeft -= vx
      vx *= friction
      raf = requestAnimationFrame(step)
    } else {
      cancelMomentum()
      enableSnapLater(el, 80)
      pauseUntil = performance.now() + 600
      // หลัง inertia จบ ไม่ต้องแตะ nosnap — autoLoop จะคุมเอง
    }
  }
  raf = requestAnimationFrame(step)
}
function cancelMomentum(){
  if (raf){ cancelAnimationFrame(raf); raf = null }
}

// ---------- auto-scroll (+ ramp หลัง mouseleave) ----------
function autoLoop(){
  const el = wrap.value
  autoRAF = requestAnimationFrame(autoLoop)
  if (!props.auto || !el) return
  if (dragging || (props.pauseOnHover && hovering)) return

  const now = performance.now()
  if (now < pauseUntil) return

  const max = el.scrollWidth - el.clientWidth
  if (max <= 0) return

  // คุม snap ให้คงที่ระหว่างวิ่ง
  if (!el.classList.contains('nosnap')) el.classList.add('nosnap')

  // คูณด้วย ramp multiplier เพื่อให้กลับมาลื่นหลัง mouseleave
  let mult = 1
  if (rampStart){
    const t = (now - rampStart) / props.rampMs
    if (t <= 0) mult = 0
    else if (t < 1) mult = easeOutCubic(t)
    else { mult = 1; rampStart = 0 }
  }

  el.scrollLeft += autoDir * props.autoSpeed * mult

  if (el.scrollLeft <= 0){
    el.scrollLeft = 0
    autoDir = 1
    pauseUntil = now + props.edgePause
    // ไม่ถอด nosnap เพื่อลดการ "ดูด" กลับ
  } else if (el.scrollLeft >= max){
    el.scrollLeft = max
    autoDir = -1
    pauseUntil = now + props.edgePause
  }
}

function onEnter(){ if (props.pauseOnHover) hovering = true }
function onLeave(){
  const now = performance.now()
  if (props.pauseOnHover){
    hovering = false
    pauseUntil = now + 300
    rampStart = pauseUntil // เริ่ม ramp หลังหยุด
  } else {
    // 🆕 ถึงจะไม่ pause ตอน hover ก็ผ่อนแรง/พักสั้น ๆ หลังออก
    pauseUntil = now + props.leavePause
    rampStart  = pauseUntil
  }
}

function onVisibility(){
  if (!document.hidden){
    pauseUntil = performance.now() + 500
    rampStart  = pauseUntil
  }
}

onMounted(()=>{
  autoRAF = requestAnimationFrame(autoLoop)
  document.addEventListener('visibilitychange', onVisibility, { passive:true })
  const el = wrap.value
  if (el){
    el.classList.add('nosnap')        // คง nosnap ระหว่างวิ่ง auto
    if (el.scrollLeft === 0) el.scrollLeft = 0.5 // กันติด snap ตำแหน่งเริ่ม
  }
})
onBeforeUnmount(()=>{
  if (autoRAF) cancelAnimationFrame(autoRAF)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div
    class="zigzag"
    ref="wrap"
    :style="{ '--card-h': height + 'px', '--gap': gap + 'px' }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerUp"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <figure
      v-for="(it, i) in items"
      :key="it.id ?? i"
      class="card"
      :class="{ down: i % 2 === 1, up: i % 2 === 0 }"
      :style="{ '--offset': (i % 2 === 0 ? 0 : 26) + 'px' }"
    >
      <img :src="it.img" :alt="it.alt || 'event'"
           loading="lazy" draggable="false" />
    </figure>
  </div>
</template>

<style scoped>
.zigzag{
  display:flex; align-items:flex-start; gap:var(--gap);
  overflow-x:auto; overflow-y:hidden;
  scroll-snap-type:x proximity;   /* ปิดด้วย .nosnap ตอนวิ่ง */
  scroll-behavior:auto;
  padding-bottom:50px;
  user-select:none; cursor:grab;
  touch-action: pan-x;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  will-change: scroll-position;
}
.zigzag::-webkit-scrollbar{ display:none }
.zigzag.dragging{ cursor:grabbing }
.zigzag.nosnap{ scroll-snap-type: none }

.card{
  min-width:calc(var(--card-h)*0.77);
  width:calc(var(--card-h)*0.77);
  height:var(--card-h);
  border-radius:18px;
  overflow:hidden;
  background:#fff;
  box-shadow:0 10px 22px rgba(0,0,0,.12);
  scroll-snap-align:start;
  transform:translateY(var(--offset));
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  cursor:pointer;

  /* 🆕 ลด jank ตอน hover scale */
  contain: paint;
  will-change: transform;
}
.card.up{ --offset:0px }
/* .card.down ใช้ inline style */

.card:hover{
  transform:translateY(calc(var(--offset) - 8px)) scale(1.03);
  box-shadow:0 16px 32px rgba(0,0,0,.18);
  z-index:1;
}
.card img{
  width:100%; height:100%; object-fit:cover; display:block;
  pointer-events:none;
  -webkit-user-drag:none;
  transition: transform 0.4s ease;

  /* 🆕 ช่วยให้ scale ลื่น */
  will-change: transform;
}
.card:hover img{ transform:scale(1.08) }

@media (max-width:768px){
  .card{ height:calc(var(--card-h)*.9); width:calc(var(--card-h)*.9*.77) }
}
</style>
