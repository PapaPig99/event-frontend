
## 📁 Project Structure

```bash
event-frontend/
├─ src/
│  ├─ assets/              # Images, fonts, etc.
│  ├─ components/          # Reusable UI components (NavBar, Footer, Modals, etc.)
│  ├─ layouts/             # Layout wrappers
│  │  ├─ AdminLayout.vue   # Admin zone (sidebar + header)
│  │  └─ UserLayout.vue    # User zone (NavBar + Footer)
│  ├─ pages/               # Main application pages
│  │  ├─ admin/            # Admin pages (Login, Overview, CreateEvent, ...)
│  │  ├─ (user pages...)     # AppHome, Event, EventDetail, ConcertPlan, ...
│  │  └─ (shared pages...)   # NotFound,etc.
│  ├─ router/
│  │  └─ index.js          # Vue Router configuration
│  ├─ App.vue              # Root component (<RouterView /> only)
│  ├─ main.js              # App entry point (mount + router)
│  ├─ style.css            # Global styles
│  └─ index.html           # Base HTML template
├─ .dockerignore
├─ .gitignore
└─ Dockerfile              # Docker build configuration


```

---

## 🛣 Routing Overview

Routing is handled using **Vue Router** in `src/router/index.js`.

```js
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ===== User Zone =====
    {
      path: '/',
      component: () => import('@/layouts/UserLayout.vue'),
      children: [
        { path: '',                name: 'home',          component: () => import('@/pages/AppHome.vue') },
        { path: 'event',           name: 'event-list',    component: () => import('@/pages/Event.vue') },
        { path: 'event/:id',       name: 'event-detail',  component: () => import('@/pages/EventDetail.vue'), props: true },
        { path: 'event/:id/plan',  name: 'concert-plan',  component: () => import('@/pages/ConcertPlan.vue'), props: true },
        { path: 'event/:id/seat-zone', name: 'seat-zone', component: () => import('@/pages/SeatZone.vue'), props: true },
        { path: 'myevent',         name: 'my-event',      component: () => import('@/pages/MyEvent.vue') },
        { path: 'help',            name: 'help',          component: () => import('@/pages/Help.vue') },
      ],
    },

    // ===== Admin Zone =====
    { path: '/admin/login', name: 'admin-login', component: () => import('@/pages/admin/Login.vue') },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        { path: '', redirect: '/admin/overview' },
        { path: 'overview',      name: 'admin-overview',     component: () => import('@/pages/admin/Overview.vue') },
        { path: 'events/all',    name: 'admin-events-all',   component: () => import('@/pages/admin/AllEvent.vue') },
        { path: 'events/create', name: 'admin-events-create',component: () => import('@/pages/admin/CreateEvent.vue') },
      ],
    },

    // ===== Not Found =====
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/pages/NotFound.vue') },
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
