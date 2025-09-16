
## 📁 Project Structure

```bash
event-frontend/
├─ .vscode/                # VS Code settings
├─ node_modules/           # Installed dependencies
├─ public/                 # Static assets (favicon, manifest, etc.)
├─ src/
│  ├─ Admin/               # Admin pages
│  │  ├─ create-event.vue
│  │  └─ login.vue
│  ├─ assets/              # Images, fonts, etc.
│  ├─ components/          # Reusable UI components
│  ├─ pages/                # Main application pages
│  ├─ router/
│  │  └─ index.js           # Vue Router configuration
│  ├─ App.vue               # Root component
│  ├─ main.js               # App entry point (mount + router setup)
│  ├─ style.css             # Global styles
│  └─ index.html             # Base HTML template
├─ .dockerignore
├─ .gitignore
└─ Dockerfile               # Docker build configuration
```

---

## 🛣 Routing Overview

Routing is handled using **Vue Router** in `src/router/index.js`.

```js
import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',                name: 'home',           component: () => import('../pages/AppHome.vue') },
    { path: '/event',           name: 'event-list',     component: () => import('../pages/Event.vue') },
    { path: '/event/:id',       name: 'event-detail',   component: () => import('../pages/Event-detail.vue'), props: true },
    { path: '/event/:id/plan',  name: 'concert-plan',   component: () => import('../pages/ConcertPlan.vue'), props: true },
    { path: '/event/:id/seat-zone', name: 'seat-zone', component: () => import('../pages/seatzone.vue'), props: true },

    { path: '/myevent',          name: 'my-event',      component: () => import('../pages/MyEvent.vue') },
    { path: '/help',              name: 'help',         component: () => import('../pages/Help.vue') },

    { path: '/admin',             name: 'admin-login',  component: () => import('../Admin/login.vue') },
    { path: '/create-event',      name: 'admin-create', component: () => import('../Admin/create-event.vue') },

    // Catch-all route (404)
    { path: '/:pathMatch(.*)*',   name: 'not-found',    component: () => import('../pages/NotFound.vue') },
  ],
})

export default router
```

---


## 💡 Tips

* `pages/` → Main pages (full views)
* `components/` → Reusable UI parts
* `router/` → Defines which URL loads which page

> 🧭 Think of `router` as the **map of your app** — it tells users where they end up when they click around.

---

