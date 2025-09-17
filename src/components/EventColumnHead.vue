<template>
  <header class="column-head" :style="{ '--head-color': color }">
    <!-- ชั้นที่ 1: ชื่อ category -->
    <div class="head-title">
      <span class="title">{{ title }}</span>
    </div>

    <!-- ชั้นที่ 2: ค้นหา -->
    <div class="head-search">
      <input
        :placeholder="placeholder"
        v-model="localValue"
        @input="$emit('update:modelValue', localValue)"
      />
      <svg class="search-ic" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor"
          d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.71.71l.27.28v.79L20 20.5 21.5 19 15.5 14zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/>
      </svg>
    </div>
  </header>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  color: { type: String, default: '#4EA5FF' },       // สีแถบหมวด (ชั้นบน)
  modelValue: { type: String, default: '' },         // v-model สำหรับข้อความค้นหา
  placeholder: { type: String, default: 'ค้นหาในหมวด' },
})
const emit = defineEmits(['update:modelValue'])

const localValue = ref(props.modelValue)
watch(() => props.modelValue, v => (localValue.value = v))
</script>

<style scoped>
.column-head { padding: 5px; }
.head-title {
  background: var(--head-color);
  color: #fff;
  font-weight: 700;
  text-align: center;
  padding: 10px 8px;
}
.title { 
  letter-spacing: .2px;
  font-size: 16px;
 }

/* แถบค้นหา */
.head-search {
  position: relative;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,.16);
  border: 1px solid #e5e5e5;
  border-top: none;
  height: 36px;
}
.head-search input {
  all: unset;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 0 34px 0 10px; 
  color: #333;
}
.search-ic {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px; height: 18px;
  color: #9aa0a6;
}

</style>
