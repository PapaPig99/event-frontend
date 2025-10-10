<!-- src/pages/TicketSuccess.vue -->
<script setup>
import { useRoute, useRouter } from 'vue-router'
const router = useRouter()
const reg = history.state?.reg
if (!reg) router.replace({ name:'home' })
</script>

<template>
  <section v-if="reg" class="ok">
    <h1>ชำระเงินสำเร็จ</h1>
    <p>หมายเลขการจอง: <strong>{{ reg.id }}</strong></p>
    <router-link :to="{ name:'event-detail', params:{ id: reg.eventId } }">กลับไปดูรายละเอียด</router-link>
  </section>
</template>
