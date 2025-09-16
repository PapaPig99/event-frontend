import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'   // ✅ default import
createApp(App).use(router).mount('#app')
