<script setup>
import EventCard from './Card.vue'

defineProps({
  title: { type: String, default: 'แนะนำสำหรับคุณ' },
  events: { type: Array, required: true }
})
</script>

<template>
  <section class="recommended">
    <div class="row-rec">
      <div class="section-header">
      <h2>{{ title }}</h2>
      <a href="#" class="more">เพิ่มเติม</a>
    </div>

    <div class="scroll-viewport">
      <div class="scroll-row">
        <!-- ใช้ EventCard -->
        <EventCard v-for="e in events" :key="e.id" :event="e" />
      </div>
    </div>

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
    padding: 0 20rem; /* desktop กว้างๆ */
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
