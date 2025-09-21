<template>
  <section class="all-events">
    <header class="toolbar">
      <div class="title"> All Events</div>
      <RouterLink to="/admin/create" class="title">

        <button class="btn add" @click="goCreate">+ เพิ่มอีเวนต์</button>
      </RouterLink>

    </header>

    <!-- คอนเทนเนอร์คอลัมน์ -->
    <div class="columns">
      <!-- คอนเสิร์ต -->
      <div class="col">
        <EventColumnHead title="คอนเสิร์ต" color="#51A6F7" v-model="qConcert" />
        <EventCardAdmin v-for="ev in filteredConcerts" :key="ev.id" :event="ev" @view="onView" @edit="onEdit"
          @remove="onRemove" />

      </div>

      <!-- การแสดง -->
      <div class="col">
        <EventColumnHead title="การแสดง" color="#F7B23B" v-model="qShow" />
        <EventCardAdmin v-for="ev in filteredShows" :key="ev.id" :event="ev" @view="onView" @edit="onEdit"
          @remove="onRemove" />

      </div>

      <!-- การศึกษา -->
      <div class="col">
        <EventColumnHead title="การศึกษา" color="#8F79F6" v-model="qEdu" />
        <EventCardAdmin v-for="ev in filteredEdu" :key="ev.id" :event="ev" @view="onView" @edit="onEdit"
          @remove="onRemove" />

      </div>

      <!-- ธุรกิจและการ -->
      <div class="col">
        <EventColumnHead title="ธุรกิจและการ" color="#35C864" v-model="qBiz" />
        <EventCardAdmin v-for="ev in filteredBiz" :key="ev.id" :event="ev" @view="onView" @edit="onEdit"
          @remove="onRemove" />

      </div>

      <!-- กีฬา -->
      <div class="col">
        <EventColumnHead title="กีฬา" color="#7A7A7A" v-model="qSport" />
        <EventCardAdmin v-for="ev in filteredSports" :key="ev.id" :event="ev" @view="onView" @edit="onEdit"
          @remove="onRemove" />

      </div>
    </div>
  </section>
</template>

<script setup>

import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import EventColumnHead from "@/components/EventColumnHead.vue"
import EventCardAdmin from '@/components/EventCardAdmin.vue'

const router = useRouter()
const events = ref([])

onMounted(async () => {
  try {
    const res = await fetch("/api/events", { headers: { Accept: "application/json" } })
    const data = await res.json()

    events.value = Array.isArray(data) ? data : (data.items ?? [])
    console.log("events:", events.value)
  } catch (err) {
    console.error("โหลด events ไม่ได้:", err)
  }
})


function onView(id) {
  router.push(`/admin/events/${id}/detail`)
}

function onEdit(id) {
  router.push(`/admin/events/${id}/edit`)
}
async function onRemove(id) {
  if (!confirm("คุณต้องการลบอีเวนต์นี้ใช่หรือไม่?")) return

  try {
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("ลบไม่สำเร็จ")
    // ลบออกจาก state ทันที
    events.value = events.value.filter(ev => ev.id !== id)
    alert("ลบอีเวนต์เรียบร้อยแล้ว")
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการลบ:", err)
    alert("ไม่สามารถลบอีเวนต์ได้")
  }
}


const qConcert = ref("")
const qShow = ref("")
const qEdu = ref("")
const qBiz = ref("")
const qSport = ref("")



const lc = (v) => String(v ?? "").toLowerCase()
const catKey = (c) => {
  const s = lc(c)
  if (s.includes("concert") || s.includes("คอนเสิร์")) return "concert"
  if (s.includes("show") || s.includes("แสดง")) return "show"
  if (s.includes("education") || s.includes("ศึกษา")) return "education"
  if (s.includes("business") || s.includes("ธุรกิจ")) return "business"
  if (s.includes("sport") || s.includes("กีฬา")) return "sport"
  return "other"
}

const filteredConcerts = computed(() =>
  events.value.filter(ev => catKey(ev.category) === "concert" && lc(ev.title).includes(lc(qConcert.value)))
)
const filteredShows = computed(() =>
  events.value.filter(ev => catKey(ev.category) === "show" && lc(ev.title).includes(lc(qShow.value)))
)
const filteredEdu = computed(() =>
  events.value.filter(ev => catKey(ev.category) === "education" && lc(ev.title).includes(lc(qEdu.value)))
)
const filteredBiz = computed(() =>
  events.value.filter(ev => catKey(ev.category) === "business" && lc(ev.title).includes(lc(qBiz.value)))
)
const filteredSports = computed(() =>
  events.value.filter(ev => catKey(ev.category) === "sport" && lc(ev.title).includes(lc(qSport.value)))
)
</script>


<style scoped>
.all-events {
  padding: 20px;
}

/* แถวบนสุด */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  color: #5f6063;
  font-size: 20px;
  font-weight: 400;
}

.btn.add {
  font-size: 18px;
  color: #fff;
  border: 1px solid #eee;
  background: #5465FF;
  border-radius: 8px;
  padding: 8px 15px;
  cursor: pointer;
}

.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
  align-items: start;
}

/* กล่องคอลัมน์ */
.col {
  display: flex;
  flex-direction: column;
}
</style>
