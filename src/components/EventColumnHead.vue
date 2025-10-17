<template>
  <div class="filter-wrap">
    <button
      class="chip"
      :class="{ active: modelValue.length === 0 }"
      @click="$emit('update:modelValue', [])"
      title="แสดงทั้งหมด"
    >
      ทั้งหมด
    </button>

    <button
      v-for="opt in options"
      :key="opt.key"
      class="chip"
      :class="{ active: modelValue.includes(opt.key) }"
      @click="toggle(opt.key)"
      :style="opt.color ? { '--chip-color': opt.color } : {}"
      :title="opt.label"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  options: { type: Array, required: true },
  modelValue: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

function toggle(key) {
  const set = new Set(props.modelValue)
  if (set.has(key)) set.delete(key)
  else set.add(key)
  emit('update:modelValue', Array.from(set))
}
</script>

<style scoped>
.filter-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  --chip-color: #FF3336;
  appearance: none;
  border: 1.6px solid #e7e6e6;
  background: #fff;
  color: #333;
  padding: 10px 20px; /* ↑ เพิ่มขนาดปุ่ม */
  border-radius: 25px;
  cursor: pointer;
  font-size: 15px; /* ↑ ตัวอักษรใหญ่ขึ้น */
  font-weight: 500;
  transition: all 0.18s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.chip:hover {
  background: #f5f5f5;
  transform: translateY(-1px);
}

.chip.active {
  background: var(--chip-color);
  border-color: var(--chip-color);
  color: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.chip:active {
  transform: scale(0.97);
}
</style>
