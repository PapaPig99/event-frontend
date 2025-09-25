<script setup>
import EventCard from './Card.vue'
import { toRefs, computed } from 'vue'

const props = defineProps({
  title:    { type: String, default: 'แนะนำสำหรับคุณ' },
  events:   { type: Array,  required: true },
  // หมวดที่จะกรอง (ค่าเริ่มต้น = Concert)
  category: { type: [String, Array], default: 'Concert' }
})

const { title, events, category } = toRefs(props)
const emit = defineEmits(['open'])

// ปรับตัวช่วยเล็กน้อยให้ทนเคส/ช่องว่าง
const norm = (s) => String(s ?? '').trim().toLowerCase()
const wanted = computed(() =>
  (Array.isArray(category.value) ? category.value : [category.value]).map(norm)
)

// ✅ กรองตามหมวด (รองรับทั้ง e.category / e.type / e.tags)
const filtered = computed(() => {
  return (events.value ?? []).filter(e => {
    const cat = norm(e.category ?? e.type)
    const tags = (Array.isArray(e.tags) ? e.tags : []).map(norm)
    return wanted.value.some(w => cat.includes(w) || tags.some(t => t.includes(w)))
  })
})



</script>

<template>
  <section class="recommended">
    <div class="row-rec">
      <div class="section-header">
        <h2>{{ title }}</h2>
        <a href="/event" class="more">เพิ่มเติม</a>
      </div>

      <div class="scroll-viewport" v-if="filtered.length">
        <div class="scroll-row">
          <EventCard
            v-for="e in filtered"
            :key="e.id"
            :event="e"
            @open="emit('open', $event)"
          />
        </div>
      </div>

      <p v-else style="opacity:.7; padding: 12px 0 24px;">
        ไม่มีรายการในหมวดนี้ตอนนี้นะคะ 🙂
      </p>
    </div>
  </section>
</template>


<style scoped>
.recommended{
  background: linear-gradient(135deg, #ff620036, #ffa54c25);
  padding-bottom: 30px;


}
.row-rec{
  padding: 0 8rem;
  align-items: center;
  justify-content: center;
}
@media (min-width: 1440px) {
  .row-rec {
    padding: 0 25rem; /* desktop กว้างๆ */
  }
}
.section-header{
  display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-top: 30px;
}
.section-header h2{margin:0;font-size:18px;font-weight:700}
.section-header .more{font-size:14px;color:#333;text-decoration:none}

.scroll-viewport{
  position:relative;
  margin-inline:-24px;
  padding-inline:24px;
}
.scroll-viewport::before,
.scroll-viewport::after{
  content:"";
  position:absolute;top:0;bottom:0;width:36px;pointer-events:none;
}
.scroll-viewport::before{
  left:0;
}
.scroll-viewport::after{
  right:0;
}

.scroll-row{
  display:flex;gap:20px;overflow-x:auto;
  padding:6px 4px 10px;
  scroll-snap-type:x mandatory;
  -webkit-overflow-scrolling:touch;
}
.scroll-row::-webkit-scrollbar{display:none}

.scroll-row > *{
  flex:0 0 calc((100% - 3*20px)/4);
  scroll-snap-align:start;
}

@media (max-width:1024px){
  .scroll-row > *{flex:0 0 calc((100% - 2*20px)/3)}
}
@media (max-width:640px){
  .scroll-row > *{flex:0 0 85%}
}
</style>
