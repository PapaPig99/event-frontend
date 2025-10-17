<template>
  <section class="all-events">
    <header class="toolbar">
      <div class="title">All Events</div>
      <RouterLink to="/admin/create" class="title">
        <button class="btn add" @click="goCreate">+ เพิ่มอีเวนต์</button>
      </RouterLink>
    </header>

    <!-- แถวฟิลเตอร์หมวดหมู่ -->
    <CategoryFilter
      v-model="selectedCats"
      :options="categoryOptions"
      class="mb-12"
    />

    <!-- แถวค้นหาชื่อรวม -->
    <div class="search-bar">
      <input
        v-model="qTitle"
        type="text"
        placeholder="ค้นหาชื่ออีเวนต์ทั้งหมด"
        aria-label="ค้นหาอีเวนต์"
      />
      <svg class="search-ic" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor"
          d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.71.71l.27.28v.79L20 20.5 21.5 19 15.5 14zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/>
      </svg>
    </div>

    <!-- สรุปจำนวนผลลัพธ์ + ปุ่มเคลียร์ -->
    <div class="result-info">
      <span>พบ {{ filteredEvents.length }} รายการ</span>
      <button v-if="selectedCats.length || qTitle" class="link" @click="clearAll">ล้างตัวกรอง</button>
    </div>

    <!-- แสดงผลแบบกริดรายการเดียว -->
    <div class="grid">
      <EventCardAdmin
        v-for="ev in filteredEvents"
        :key="ev.id"
        :event="ev"
        @view="onView"
        @edit="onEdit"
        @remove="onRemove"
      />
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import CategoryFilter from "@/components/EventColumnHead.vue"
import EventCardAdmin from "@/components/EventCardAdmin.vue"
import api from "@/lib/api"

const router = useRouter()
const events = ref([])

onMounted(async () => {
  try {
    const res = await fetch("/api/events", { headers: { Accept: "application/json" } })
    const data = await res.json()
    events.value = Array.isArray(data) ? data : (data.items ?? [])
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
    await api.delete(`/events/${id}`)
    events.value = events.value.filter(ev => ev.id !== id)
    alert("ลบอีเวนต์เรียบร้อยแล้ว")
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการลบ:", err)
    alert("ไม่สามารถลบอีเวนต์ได้")
  }
}

const qTitle = ref("")
const selectedCats = ref([]) // array ของ key หมวดที่เลือก

const categoryOptions = [
  { key: "concert",   label: "คอนเสิร์ต",     color: "#51A6F7" },
  { key: "show",      label: "การแสดง",       color: "#F7B23B" },
  { key: "education", label: "การศึกษา",      color: "#8F79F6" },
  { key: "business",  label: "ธุรกิจและการ",  color: "#35C864" },
  { key: "sport",     label: "กีฬา",           color: "#7A7A7A" },
]

// utils เดิม: normalize category
const lc = (v) => String(v ?? "").toLowerCase()
const catKey = (c) => {
  const s = lc(c)
  if (s.includes("concert")   || s.includes("คอนเสิร์ต")) return "concert"
  if (s.includes("show")      || s.includes("แสดง"))      return "show"
  if (s.includes("education") || s.includes("ศึกษา"))     return "education"
  if (s.includes("business")  || s.includes("ธุรกิจ"))    return "business"
  if (s.includes("sport")     || s.includes("กีฬา"))      return "sport"
  return "other"
}

const filteredEvents = computed(() => {
  const title = lc(qTitle.value)
  const selected = new Set(selectedCats.value)
  return events.value.filter(ev => {
    const evCat = catKey(ev.category)
    const matchCat = selected.size === 0 ? true : selected.has(evCat)
    const matchTitle = lc(ev.title).includes(title)
    return matchCat && matchTitle
  })
})

function clearAll() {
  selectedCats.value = []
  qTitle.value = ""
}
</script>

<style scoped>
.all-events { padding: 20px; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title { color: #5f6063; font-size: 20px; font-weight: 400; }
.btn.add {
  font-size: 18px; color: #fff; border: 1px solid #eee;
  background: #5465FF; border-radius: 8px; padding: 8px 15px; cursor: pointer;
}

.mb-12 { margin-bottom: 12px; }

.search-bar {
  position: relative;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,.08);
  border: 1px solid #e5e5e5;
  height: 50px;
  width: 80;
  margin-bottom: 8px;
}
.search-bar input {
  all: unset;
  width: 100%;
  height: 100%;
  padding: 0 36px 0 12px;
  color: #333;
  font-size: 15px;
}
.search-ic {
  position: absolute; right: 10px; top: 50%;
  transform: translateY(-50%);
  width: 18px; height: 18px; color: #9aa0a6;
}

.result-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
  margin-bottom: 10px;
  font-size: 14px;
}
.link {
  appearance: none;
  background: transparent;
  border: 0;
  color: #5465FF;
  cursor: pointer;
  padding: 0;
}

.grid {
  display: grid;
  gap: 10px;
  align-items: start;
}
</style>
