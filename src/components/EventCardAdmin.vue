<template>
  <article class="card">
    <!-- Header -->
    <header class="card-head">
      <h3 class="card-title" :title="event.title">
        {{ event.title }}
      </h3>

      <div class="actions">
        <!-- ดูรายละเอียด -->
        <button class="icon" title="ดูรายละเอียด" @click="$emit('view', event.id)">
          <!-- eye (stroke) -->
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M12 5C7 5 3.3 8.1 2 12c1.3 3.9 5 7 10 7s8.7-3.1 10-7c-1.3-3.9-5-7-10-7Z"
                  fill="none" stroke="currentColor" stroke-width="1.6" />
            <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/>
          </svg>
        </button>

        <!-- แก้ไข -->
        <button class="icon" title="แก้ไข" @click="$emit('edit', event.id)">
          <!-- pencil -->
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
                  fill="currentColor"/>
            <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                  fill="currentColor"/>
          </svg>
        </button>

        <!-- ลบ -->
        <button class="icon danger" title="ลบ" @click="$emit('remove', event.id)">
          <!-- trash -->
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M9 3h6m-9 4h12m-1 0-.8 13a2 2 0 0 1-2 1.9H7.8a2 2 0 0 1-2-1.9L5 7m4 3v8m6-8v8"
                  fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Poster -->
    <div class="poster-wrap">
      <img
        v-if="event.posterImageUrl"
        class="poster"
        :src="resolveImage(event.posterImageUrl)"
        alt=""
        @error="hideImg"
      />
      <div v-else class="poster placeholder">ไม่มีรูปภาพ</div>
    </div>
  </article>
</template>

<script setup>
const resolveImage = (filename) => {
  if (!filename) return ""
  if (/^https?:\/\//i.test(filename)) return filename 
  return filename
}
const props = defineProps({
  event: {
    type: Object,
    required: true, // ควรมี { id, title, image }
  },
})
defineEmits(['view', 'edit', 'remove'])

function hideImg(e) {
  e.target.style.display = 'none'
  e.target.parentElement?.classList.add('no-image')
}
</script>

<style scoped>
.card{
  width: 100%;
  display: block;
  border: 1px solid #e5e5e5;
  border-radius: 0;
  box-shadow: none;
  background: #fff;
}

/* header ของการ์ด */
.card-head{
  display:flex; align-items:center; justify-content:space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #eaeaea;
  background:#fafafa;
}

.card-title{
  margin:0; font-size:18px; font-weight:800; color:#6a6a6a;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

/* ปุ่มไอคอน */
.actions{ display:flex; gap:8px; }
.icon{ width:32px; height:32px; border:0; background:transparent; color:#8b8f94; border-radius:4px; }
.icon:hover{ background:#f1f3f4; color:#5f6368; }
.icon.danger:hover{ background:#fdecea; color:#d93025; }

/* รูปโปสเตอร์ */
.poster-wrap {
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.poster {
  width: 100%;
  height: 380px;        
  object-fit: cover;    
  border-radius: 6px;
  display: block;
  background: #f5f5f5;
}


.poster.placeholder{
  height:220px;
  display:flex; align-items:center; justify-content:center;
  color:#9aa0a6; background:#f5f5f5; border-radius:0; 
}

@media (max-width: 900px) {
  .poster {
    height: 300px;
  }
}
@media (max-width: 600px) {
  .poster {
    height: 240px;
  }
}

</style>
