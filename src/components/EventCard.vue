<template>
  <div class="event-card">
    <!-- TODO: ใส่รูป event ที่ assets เช่น src/assets/event1.jpg -->
    <img :src="image" alt="Event Poster" class="event-image" />

    <div class="event-info">
      <h3>{{ title }}</h3>
      <p>📅 {{ date }} | 🕒 {{ time }}</p>
      <p>📍 {{ location }}</p>
      <button class="join-btn">เข้าร่วมงาน</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  image: String,   // path ของรูป
  title: String,   // ชื่อ event
  date: String,    // วันเวลา
  time: String,    
  location: String // สถานที่
})
</script>

<style scoped>
.event-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  overflow: hidden;
  width: 250px;
}
.event-image {
  width: 100%;
  height: 300px;
  object-fit: cover;
}
.event-info {
  padding: 15px;
}
.join-btn {
  margin-top: 10px;
  background: #ff3d00;
  border: none;
  padding: 8px 14px;
  color: #fff;
  border-radius: 5px;
  cursor: pointer;
}
</style>
