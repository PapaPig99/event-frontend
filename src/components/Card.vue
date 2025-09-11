<script setup>
defineProps({ event: { type: Object, required: true } })
const emit = defineEmits(['open'])
</script>

<template>
  <article class="card">
    <div class="thumb">
      <img :src="event.img" :alt="event.title" />
    </div>
    <div class="body">
      <h3 class="title">{{ event.title }}</h3>
      <div class="meta">
        <p><i class="fa-regular fa-calendar"></i> {{ event.date }}</p>
        <p><i class="fa-solid fa-location-dot"></i> {{ event.location }}</p>
      </div>
      <button class="join-btn" @click="emit('open', event.id)">เข้าร่วมงาน</button>

    </div>
  </article>
</template>

<style scoped>
/* กำหนดความกว้างด้วย clamp: ไม่เล็กเกิน/ไม่อ้วนเกิน */
.card{
  --card-w: clamp(210px, 22vw, 260px); /* ปรับได้ */
  width: var(--card-w);
  flex: 0 0 var(--card-w);             /* ให้คงความกว้างเมื่ออยู่ในแถวเลื่อน */
  background:#fffdfd;border-radius:16px;overflow:hidden;
  box-shadow:0 6px 16px rgba(0,0,0,.1);
  transition:transform .2s;
}
.card:hover{transform:translateY(-6px)}

/* ใช้ aspect-ratio ให้รูปนิ่ง 3:4 จะไม่ยืดอ้วน */
.thumb{ position:relative; aspect-ratio: 3 / 4; }
.thumb img{
  position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; display:block;
}


.body{padding:12px}
.title{font-size:14px;font-weight:700;margin:0 0 3px;padding-bottom: 0;text-align: left;}
.meta{font-size:12px;color:#666;display: block;}
.join-btn{background:#ff2d2d;color:#fff;border:none;padding:10px;border-radius:8px;font-weight:600;cursor:pointer;text-align: center;width: 100%;}
.join-btn:hover{background:#d92020}
</style>
