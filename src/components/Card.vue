<script setup>
import { useRouter } from 'vue-router'

defineProps({ event: { type: Object, required: true } })
const emit = defineEmits(['open'])
const router = useRouter()

function isTokenValid() {
  try {
    const token = localStorage.getItem('token') || ''
    if (!token) return false
    const [, payloadB64] = token.split('.')
    if (!payloadB64) return false
    const json = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    // exp เป็นวินาที; Date.now() เป็นมิลลิวินาที
    const now = Math.floor(Date.now() / 1000)
    return typeof json.exp === 'number' && json.exp > now
  } catch {
    return false
  }
}

function handleOpen(id) {
  if (!isTokenValid()) {
    // เก็บที่มาว่าจะกลับมาหน้าไหนหลัง login
    router.push({ path: '/login', query: { redirect: `/events/${id}/view` } })
    return
  }
  emit('open', id)
}
</script>

<template>
  <article class="card" @click.self="handleOpen(event.id)">
    <figure class="poster">
      <img :src="event.img" :alt="event.title" />
      <i class="shade" aria-hidden="true"></i>
    </figure>

    <div class="body">
      <h3 class="title" :title="event.title">{{ event.title }}</h3>

      <ul class="meta">
        <li>
          <i class="fa-regular fa-calendar"></i>
          <span>{{ event.date }}</span>
        </li>
        <li class="loc">
          <i class="fa-solid fa-location-dot"></i>
          <span :title="event.location">{{ event.location }}</span>
        </li>
      </ul>

      <RouterLink :to="`/events/${event.id}/view`" custom v-slot="{ navigate }">
  <button class="btn" @click.stop="navigate">เข้าร่วมงาน</button>
</RouterLink>


    </div>
  </article>
</template>

<style scoped>
/* ====== Card ====== */
.card{
  --w: clamp(220px, 22vw, 270px);
  --radius: 18px;
  --shadow: 0 8px 22px rgba(16, 24, 40, .10);
  --border: 1px solid rgba(16, 24, 40, .06);

  width: var(--w);
  flex: 0 0 var(--w);
  border-radius: var(--radius);
  background: #fff;
  box-shadow: var(--shadow);
  border: var(--border);
  overflow: clip;             /* กันซึมขอบโค้ง */
  display: grid;
  grid-template-rows: auto 1fr;
  transition: transform .18s ease, box-shadow .18s ease;
}
.card:hover{
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(16,24,40,.14);
}

/* ====== Poster (แก้ขอบดำ/ช่องว่าง) ====== */
.poster{
  position: relative;
  margin: 0;
  aspect-ratio: 4 / 5;        /* โปสเตอร์ส่วนใหญ่จะลงตัวกับ 4:5 */
  overflow: hidden;
}
.poster img{
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;          /* ไม่มีแถบดำแน่นอน */
  object-position: 50% 30%;   /* โฟกัสสูงขึ้นนิดให้หัวไม่โดนตัด */
  display: block;
}
.poster .shade{
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, transparent 65%, rgba(0,0,0,.05));
  pointer-events: none;
}

/* เส้นแบ่งนุ่ม ๆ */
.card::after{
  content:"";
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(16,24,40,.08), transparent);
}

/* ====== Body ====== */
.body{
  padding: 12px 14px 14px;
  display: grid;
  grid-template-rows: auto auto 1fr;
  row-gap: 8px;
}

/* ชื่อ 2 บรรทัดพอดี */
.title{
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  color: #0f172a;
  display: -webkit-box;
  text-align: left;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* เมตาแบบกะทัดรัด */
.meta{
  list-style: none; padding: 0; margin: 0;
  display: grid; row-gap: 6px;
  font-size: 12.5px; color: #475569;
}
.meta li{ display: grid; grid-template-columns: 16px 1fr; column-gap: 8px; align-items: center; }
.meta i{ text-align: center; opacity: .9; }

/* ตำแหน่งยาว → ตัดด้วย ellipsis */
.meta .loc span{
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ปุ่มวางชิดล่างพอดี ไม่ดัน spacing */
.btn{
  margin-top: auto;                /* ✅ ดันลงสุด */
  height: 44px;                    /* ✅ ขนาดเท่ากันทุกใบ */
  border: none;
  border-radius: 10px;
  background: #ff3b30;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  transition: background .15s;
}
.btn:hover{ background: #e22f26; box-shadow: 0 8px 18px rgba(255,59,48,.26); }
.btn:active{ transform: translateY(1px); }
</style>
