<template>
  <section class="help">
    <h1>Help Center</h1>
    <input v-model="search" placeholder="Search help..." class="search" />

    <div class="topics">
      <button v-for="t in topics" :key="t" @click="active = t" :class="{active:active===t}">{{ t }}</button>
    </div>

    <div class="faq-list">
      <div v-for="f in filteredFaqs" :key="f.q" class="faq-item">
        <strong>{{ f.q }}</strong>
        <p>{{ f.a }}</p>
      </div>
      <p v-if="filteredFaqs.length===0" class="muted">No results found.</p>
    </div>

    <div class="contact">
      <h2>Need more help?</h2>
      <p>Email: support@joinup.example</p>
      <p>Call: 02-123-4567</p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const topics = ['Tickets', 'Payment', 'Account', 'Technical']
const active = ref('Tickets')
const search = ref('')

const faqs = [
  { topic:'Tickets', q:'Where is my ticket?', a:'Go to My Tickets to view your QR code.' },
  { topic:'Payment', q:'Can I get a refund?', a:'Refund policy depends on the event organizer.' },
  { topic:'Account', q:'Forgot password?', a:'Click “Forgot password?” on Login page.' },
  { topic:'Technical', q:'Page not loading?', a:'Try refreshing or clearing browser cache.' }
]

const filteredFaqs = computed(() => {
  return faqs.filter(f => f.topic===active.value && f.q.toLowerCase().includes(search.value.toLowerCase()))
})
</script>

<style scoped>
.help{max-width:700px;margin:0 auto;padding:20px}
h1{text-align:center;margin-bottom:10px}
.search{width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:14px}
.topics{display:flex;gap:8px;justify-content:center;margin-bottom:16px;flex-wrap:wrap}
.topics button{padding:6px 10px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer}
.topics button.active{background:#2563eb;color:#fff;border-color:#2563eb}
.faq-item{border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:8px}
.faq-item strong{display:block;margin-bottom:4px}
.muted{text-align:center;color:#888;margin-top:20px}
.contact{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #eee}
</style>