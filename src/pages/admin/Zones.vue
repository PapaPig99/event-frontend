<template>
  <section class="zone-template-page">
    <!-- Toast Container -->
    <div class="toast-container">
      <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.type">
        <span>{{ t.message }}</span>
        <button class="toast-close" @click="closeToast(t.id)">✕</button>
      </div>
    </div>

    <!-- LEFT: -->
    <aside class="sidebar-left">

      <h2 class="sidebar-title">Groups</h2>

      <div class="group-item" :class="{ active: selectedGroup === null }" @click="selectGroup(null)">
        All Templates
      </div>

      <p class="sidebar-sub">{{ grouped.length }} groups</p>

      <div v-for="g in grouped" :key="g.name" :class="['group-item', { active: g.name === selectedGroup }]"
        @click="selectGroup(g.name)">
        {{ g.name }}
      </div>

    </aside>



    <!-- CENTER: TEMPLATE LIST -->
    <main class="center-panel">
      <div class="center-content">

        <!-- Header -->
        <header class="center-header">
          <h2 class="center-title">{{ headerTitle }}</h2>

          <button v-if="!selectedGroup && !showForm" class="add-btn" @click="openCreateForm">
            + Add Template
          </button>
        </header>

        <div v-if="showForm" class="form-box">

          <div class="form-row">
            <label>Name</label>
            <div v-if="errors.name" class="form-msg">{{ errors.name }}</div>

            <input v-model="form.name" type="text" />
          </div>

          <div class="form-row">
            <label>Group</label>

            <input v-model="form.groupName" type="text" />
          </div>

          <div class="form-row">
            <label>Capacity</label>
            <div v-if="errors.capacity" class="form-msg">{{ errors.capacity }}</div>

            <input v-model="form.capacity" type="number" />
          </div>

          <div class="form-row">
            <label>Price</label>
            <div v-if="errors.price" class="form-msg">{{ errors.price }}</div>

            <input v-model="form.price" type="number" />
          </div>

          <div class="form-actions">
            <button class="btn-light" @click="showForm = false">Cancel</button>
            <button class="btn-dark" @click="saveTemplate">Save</button>
          </div>
        </div>


        <!-- Template list -->
        <div v-else class="template-list">
          <div v-for="t in templatesByGroup" :key="t.id"
            :class="['template-card', { active: selectedTemplate?.id === t.id }]" @click="selectTemplate(t)">
            <div class="template-name">{{ t.name }}</div>
            <div class="template-meta">
              {{ t.capacity }} seats • {{ t.price }} ฿
            </div>
          </div>
        </div>
        <div v-if="!showForm && templatesByGroup.length" class="show-more-box">

          <!-- ปุ่ม Show more -->
          <button v-if="!showAll && fullCount > showLimit" class="show-more-btn" @click="showAll = true">
            Show more...
          </button>

          <!-- ปุ่ม Show less -->
          <button v-if="showAll" class="show-more-btn" @click="showAll = false">
            Show less
          </button>
        </div>

        <div v-if="!showForm && !templatesByGroup.length" class="center-empty">
          Select a group to view templates
        </div>

      </div>
    </main>

    <!-- RIGHT: DETAIL PANEL -->
    <aside class="detail-panel" v-if="selectedTemplate">
      <h2 class="detail-title">{{ selectedTemplate.name }}</h2>
      <div class="detail-actions">

      </div>

      <div class="detail-info">
        <div class="detail-row">
          <span>Group:</span> {{ selectedTemplate.groupName }}
        </div>
        <div class="detail-row">
          <span>Capacity:</span> {{ selectedTemplate.capacity }}
        </div>
        <div class="detail-row">
          <span>Price:</span> {{ selectedTemplate.price }}
        </div>

      </div>
      <div class="actions">
      <button class="btn-light" @click="openEditForm">Edit</button>
      <button class="btn-danger" @click="deleteTemplate">Delete</button>
      </div>
    </aside>


    <aside class="detail-panel empty" v-else>
      <div class="empty-text">Select a template</div>

    </aside>

  </section>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import api from "@/lib/api";

const templates = ref([]);
const selectedGroup = ref(null);
const selectedTemplate = ref(null);
const msg = ref("");
const toasts = ref([]);


// แจ้งเตือน
function showToast(message, type = "success") {
  const id = Date.now() + Math.random();

  toasts.value.push({
    id,
    message,
    type
  });
}
// ปิดแจ้งเตือน
function closeToast(id) {
  toasts.value = toasts.value.filter(t => t.id !== id);
}

// load templates
async function loadTemplates() {
  const res = await api.get("/zone-templates");
  templates.value = res.data;
}
onMounted(loadTemplates);

// group list
const grouped = computed(() => {
  const map = {};

  templates.value.forEach(t => {
    // ข้าม empty group
    if (!t.groupName || t.groupName.trim() === "") return;

    if (!map[t.groupName]) map[t.groupName] = [];
    map[t.groupName].push(t);
  });

  return Object.entries(map).map(([name, items]) => ({ name, items }));
});

const showLimit = ref(8);
const showAll = ref(false);

const templatesByGroup = computed(() => {
  // 1) ถ้ายังไม่เลือก group → แสดงทั้งหมด
  let list = selectedGroup.value
    ? templates.value.filter(t => t.groupName === selectedGroup.value)
    : templates.value;

  // 2) ถ้า showAll = false → แสดงแค่ 8
  if (!showAll.value) {
    return list.slice(0, showLimit.value);
  }

  // 3) ถ้า showAll = true → แสดงทั้งหมด
  return list;
});

const fullCount = computed(() => {
  return selectedGroup.value
    ? templates.value.filter(t => t.groupName === selectedGroup.value).length
    : templates.value.length;
});


function selectGroup(g) {
  if (showForm.value) return;

  selectedGroup.value = g;
  selectedTemplate.value = null;

  // Reset show more เมื่อเปลี่ยน group
  showAll.value = false;
}




function selectTemplate(t) {
  selectedTemplate.value = t;
  msg.value = "";
}

const showForm = ref(false);
const form = ref({
  id: null,
  name: "",
  groupName: "",
  capacity: "",
  price: ""
});

function openCreateForm() {
  showForm.value = true;
  errors.value = { name: "", groupName: "", capacity: "", price: "" };

  form.value = {
    id: null,
    name: "",
    groupName: "",
    capacity: "",
    price: ""
  };
}


function openEditForm() {
  if (!selectedTemplate.value) return;
  showForm.value = true;
  form.value = { ...selectedTemplate.value };
}
// errors
const errors = ref({
  name: "",
  groupName: "",
  capacity: "",
  price: ""
});

async function saveTemplate() {
  // reset errors
  errors.value = { name: "", groupName: "", capacity: "", price: "" };
  let hasError = false;

  // NAME
  if (!form.value.name || form.value.name.trim() === "") {
    errors.value.name = "Name is required";
    hasError = true;
  }

  // CAPACITY
  if (form.value.capacity === "" || isNaN(Number(form.value.capacity))) {
    errors.value.capacity = "Capacity must be a number";
    hasError = true;
  } else if (Number(form.value.capacity) <= 0) {
    errors.value.capacity = "Capacity must be greater than 0";
    hasError = true;
  }

  // PRICE
  if (form.value.price === "" || isNaN(Number(form.value.price))) {
    errors.value.price = "Price must be a number";
    hasError = true;
  } else if (Number(form.value.price) < 0) {
    errors.value.price = "Price cannot be negative";
    hasError = true;
  }

  if (hasError) return;

  const payload = {
    name: form.value.name.trim(),
    groupName: form.value.groupName?.trim() || null,
    capacity: Number(form.value.capacity),
    price: Number(form.value.price)
  };

  if (form.value.id == null) {
    await api.post("/zone-templates", payload);
    showToast("Template created successfully", "success");
  } else {
    await api.put(`/zone-templates/${form.value.id}`, payload);
    showToast("Template updated successfully", "success");
  }
  showForm.value = false;
  await loadTemplates();
}


async function deleteTemplate() {
  if (!selectedTemplate.value) return;
  await api.delete(`/zone-templates/${selectedTemplate.value.id}`);
  selectedTemplate.value = null;
  showToast("Template deleted successfully", "danger");
  loadTemplates();
}
const headerTitle = computed(() => {
  if (showForm.value) {
    if (form.value.id == null) {
      // CREATE MODE → ไม่ต้องมี group
      return "Create Template";
    } else {
      // EDIT MODE
      return `Edit Template: ${form.value.name}`;
    }
  }

  // NORMAL MODE
  if (selectedGroup.value) {
    return `Templates in ${selectedGroup.value}`;
  }

  return "Zone templates";
});

</script>

<style scoped>
.zone-template-page {
  display: flex;
  height: calc(100vh - var(--header-h));
  background: #fafafa;
  color: #333;
  font-family: system-ui, sans-serif;
}

/* LEFT ------------------------------------- */
.sidebar-left {
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #e5e5e5;
  padding: 24px 18px;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.sidebar-sub {
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
}

/* group item */
.group-item {
  padding: 8px 12px;
  margin-bottom: 4px;
  background: #f7f7f7;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: 0.15s;
  color: #444;
}

.group-item:hover {
  background: #efefef;
}

.group-item.active {
  background: #e8e8e8;
  font-weight: 500;
  color: #222;
}


/* CENTER ------------------------------------- */
.center-panel {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 40px 24px;
}

.center-content {
  width: 620px;
}

.center-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
}

.add-btn {
  background: #ffffff;
  border: 1px solid #ccc;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: 0.15s;
}

.add-btn:hover {
  background: #f2f2f2;
}


.center-title {
  font-size: 20px;
  font-weight: 500;
  color: #333;
}

/* Template List */
.template-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.template-card {
  padding: 14px;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e5e5e5;
  cursor: pointer;
  transition: 0.2s;
}

.template-card:hover {
  background: #fafafa;
  border-color: #dcdcdc;
}

.template-card.active {
  border: 1px solid #cccccc;
  background: #f0f0f0;
}

.template-name {
  font-size: 14px;
  font-weight: 500;
}

.template-meta {
  font-size: 12px;
  color: #777;
  margin-top: 4px;
}

.center-empty {
  margin-top: 40px;
  font-size: 14px;
  color: #888;
  text-align: center;
}

/* RIGHT PANEL ------------------------------------- */
.detail-panel {
  width: 280px;
  background: #ffffff;
  border-left: 1px solid #e5e5e5;
  padding: 26px;
}

.detail-panel.empty {
  display: flex;
  justify-content: center;
  align-items: center;
}

.detail-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;

}

.detail-info {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
  margin-bottom: 15px;

}

.detail-row {
  margin-bottom: 4px;
}

.empty-text {
  font-size: 13px;
  color: #aaa;
}

/* FORM ---------------------------------- */
.form-box {
  background: #fff;
  border: 1px solid #e5e5e5;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.form-row label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.form-row input {
  border: 1px solid #ccc;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 14px;
  background: #fafafa;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.form-msg {
  margin-top: 8px;
  font-size: 13px;
  color: #c04040;
}

/* BUTTON TYPES --------------------------- */
.btn-light {
  background: #fff;
  border: 1px solid #ccc;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
  transition: 0.15s;
}
.btn-danger {
  background: #FF3336;
  color: #fff;
  padding: 6px 14px;
  border: none;
  border-radius: 6px ;
  cursor: pointer;
}

.btn-light:hover {
  background: #f2f2f2;
}

.btn-dark {
  background: #333;
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
}

.detail-actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 9999;
}

.toast-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 6px;
  min-width: 240px;
  background: #333;
  color: white;
  font-size: 14px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.25s ease;
}

/* สีแบบ success / danger / info */
.toast-item.success {
  background: #2b8a3e;
}

.toast-item.danger {
  background: #c92a2a;
}

.toast-item.info {
  background: #1c7ed6;
}

.toast-close {
  background: transparent;
  border: none;
  color: white;
  font-size: 16px;
  margin-left: 12px;
  cursor: pointer;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.show-more-box {
  margin-top: 12px;
  text-align: center;
}

.show-more-btn {
  background: none;
  border: none;
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  transition: 0.15s;
}
.actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>