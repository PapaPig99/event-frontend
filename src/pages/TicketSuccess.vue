<!-- src/pages/TicketSuccess.vue -->
<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'

const router = useRouter()
const reg = history.state?.reg
if (!reg) router.replace({ name: 'home' })

const eventId = ref(reg?.eventId)
</script>

<template>
  <section v-if="reg" class="success-section">
    <div class="success-card">
      <div class="icon-circle">
        <i class="fa-solid fa-circle-check"></i>
      </div>

      <h1>ชำระเงินสำเร็จ!</h1>
      <p class="desc">ขอบคุณสำหรับการจองตั๋วของคุณ 🎟️</p>

      <div class="info-box">
        <p>หมายเลขการจอง</p>
        <strong>#{{ reg.id }}</strong>
      </div>

      <router-link
        :to="{ name: 'event-detail', params: { id: eventId } }"
        class="back-btn"
      >
        กลับไปดูรายละเอียดงาน
      </router-link>

      <router-link
        :to="{ name: 'my-event' }"
        class="secondary-btn"
      >
        ดูตั๋วของฉัน
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.success-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 16px;
  min-height: 80vh;
  background: #f9fafc;
}

.success-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.05);
  text-align: center;
  padding: 40px 30px;
  max-width: 460px;
  width: 100%;
  animation: fadeIn 0.6s ease;
}

.icon-circle {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: #e8f9f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #16a34a;
  font-size: 42px;
}

h1 {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 8px;
  color: #111827;
}

.desc {
  color: #6b7280;
  font-size: 15px;
  margin-bottom: 24px;
}

.info-box {
  background: #f3f4f6;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 28px;
}

.info-box p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.info-box strong {
  font-size: 18px;
  color: #111827;
}

.back-btn {
  display: block;
  background: #1e88ff;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  padding: 12px 20px;
  border-radius: 10px;
  margin-bottom: 12px;
  transition: background 0.2s ease;
}

.back-btn:hover {
  background: #0070f3;
}

.secondary-btn {
  display: block;
  color: #1e88ff;
  font-weight: 600;
  text-decoration: none;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
