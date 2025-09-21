<template>
  <div class="event-detail-page">
    <!-- Title -->
    <div class="title">Event Detail</div>

    <!-- Event Banner -->
    <div class="banner">
      <img :src="event.banner" alt="Event Banner" />
    </div>

    <!-- Event Info -->
    <div class="event-info">
      <h2 class="event-name">{{ event.name }}</h2>
      <p class="event-date">
        วันที่จัดแสดง: {{ event.date }} เวลา {{ event.time }}
      </p>
    </div>

    <!-- Zone Selection -->
    <div class="zone-box">
      <h3>เลือกโซนที่นั่ง</h3>
      <table>
        <thead>
          <tr>
            <th>โซน</th>
            <th>ราคา</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(zone, i) in event.zones" :key="i">
            <td>{{ zone.name }}</td>
            <td>{{ zone.price.toLocaleString() }}</td>
            <td :class="zone.status">{{ getStatusText(zone.status) }}</td>
          </tr>
        </tbody>
      </table>
      <button class="btn-book" @click="bookTicket">จองบัตร</button>
    </div>

    <!-- Event Description -->
    <div class="description">
      <h3>รายละเอียดการแสดง</h3>
      <p>{{ event.description }}</p>
    </div>
  </div>
  <section class="detail-events">
    <header class="toolbar">
      <div class="title">
        Event details
      </div>
    </header>
  </section>
</template>

<script setup>
import { reactive } from "vue";

const event = reactive({
  name: "Mariah Carey: The Celebration of Mimi",
  date: "15 ตุลาคม 2568",
  time: "19:00 น.",
  banner: "/assets/event-banner.jpg",
  zones: [
    { name: "Zone A (ใกล้เวที)", price: 20000, status: "available" },
    { name: "Zone B (กลาง)", price: 15000, status: "few" },
    { name: "Zone C (ด้านหลัง)", price: 8000, status: "soldout" },
  ],
  description:
    "MARIAH CAREY The Celebration of Mimi ... (เนื้อหาอธิบายรายละเอียดงาน / ศิลปิน / สิ่งที่ผู้ชมจะได้สัมผัส)"
});

function getStatusText(status) {
  switch (status) {
    case "available":
      return "ว่าง";
    case "few":
      return "เหลือน้อย";
    case "soldout":
      return "เต็มแล้ว";
    default:
      return "-";
  }
}

function bookTicket() {
  alert("ไปหน้าจองบัตรได้เลย 🚀");
}
</script>

<style scoped>
.event-detail-page {
  max-width: 900px;
  margin: auto;
  padding: 20px;
}

.title {
  font-weight: 700;
  font-size: 50px;
  text-align: center;
  margin-bottom: 30px;
}

.banner img {
  width: 100%;
  border-radius: 10px;
  margin-bottom: 20px;
}

.event-info {
  text-align: center;
  margin-bottom: 30px;
}

.event-name {
  font-size: 28px;
  font-weight: bold;
}

.event-date {
  font-size: 18px;
  color: #777;
}

.zone-box {
  margin-bottom: 40px;
}

.zone-box table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}

.zone-box th,
.zone-box td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: center;
}

.available {
  color: green;
}
.few {
  color: orange;
}
.soldout {
  color: red;
}

.btn-book {
  background: #e74c3c;
  color: #fff;
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-book:hover {
  background: #c0392b;
}

.description {
  margin-top: 40px;
}

.description h3 {
  font-size: 22px;
  margin-bottom: 15px;
}
<style>
.detail-events {
  padding: 20px;
}
.title {
  color: #5f6063;
  font-size: 20px;
  font-weight: 400;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
</style>
