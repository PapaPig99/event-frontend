// src/lib/api.js
import axios from "axios";

// ✅ ตั้ง baseURL ให้ยืดหยุ่น (ใช้ .env ถ้ามี)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
});

// ✅ แนบ token ทุก request
api.interceptors.request.use(cfg => {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export default api;
