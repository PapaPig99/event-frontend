<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  src:   { type: String, required: true },
  speed: { type: Number, default: 0.5 } // px/frame
})

const scroller = ref(null)
const copies   = ref(2)          // จำนวนรูปที่ซ้ำต่อกัน
let raf, paused = false

// ===== Auto scroll (วนลูป) =====
const loop = () => {
  const el = scroller.value
  if (el && !paused) {
    el.scrollLeft += props.speed
    const max = el.scrollWidth - el.clientWidth
    if (el.scrollLeft >= max) el.scrollLeft = 0
  }
  raf = requestAnimationFrame(loop)
}

// ===== ทำให้ “ต้องมีพื้นที่เลื่อน” เสมอ =====
// หลังรูปโหลดแล้ว คำนวนจำนวนชิ้นที่ต้องซ้ำให้ยาวกว่า viewport
const ensureOverflow = async () => {
  await nextTick()
  const first = scroller.value?.querySelector('img.strip')
  if (!first || !scroller.value) return
  const imgW = first.getBoundingClientRect().width
  const need = Math.ceil(scroller.value.clientWidth / Math.max(imgW,1)) + 1
  copies.value = Math.max(need, 2)
}

// ===== Drag to scroll =====
let isDown=false, startX=0, startLeft=0
const onDown = (e) => { isDown=true; paused=true; startX=e.pageX; startLeft=scroller.value.scrollLeft }
const onMove = (e) => { if(!isDown) return; scroller.value.scrollLeft = startLeft - (e.pageX - startX) }
const onUp   = () => { isDown=false; paused=false }

onMounted(() => {
  // รันออโต้เลื่อน
  raf = requestAnimationFrame(loop)
  // ผูกอีเวนต์
  const el = scroller.value
  el.addEventListener('mouseenter', () => paused = true)
  el.addEventListener('mouseleave', () => paused = false)
  el.addEventListener('mousedown', onDown)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)

  // เมื่อรูปโหลดให้คำนวน copies
  const img = el.querySelector('img.strip')
  if (img && !img.complete) img.addEventListener('load', ensureOverflow, { once:true })
  else ensureOverflow()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  const el = scroller.value
  if (el) {
    el.removeEventListener('mousedown', onDown)
  }
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
})
</script>

<template>
  <div class="scroller" ref="scroller">
    <div class="track">
      <img v-for="i in copies" :key="i" :src="src" alt="artists strip" class="strip" draggable="false" />
    </div>
  </div>
</template>

<style scoped>
.scroller {
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 16px 24px;
  cursor: grab;
}
.scroller::-webkit-scrollbar { display: none; }

.track { display: inline-flex; gap: 0; }

.strip {
  display: block;
  height: 220px;   /* ปรับความสูงที่ต้องการ */
  width: auto;
  user-select: none;
  pointer-events: none; /* ป้องกันลากรูปติดเบราว์เซอร์ */
}
.scroller:active { cursor: grabbing; }
</style>
