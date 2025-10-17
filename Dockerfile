# syntax=docker/dockerfile:1.7   # เปิดใช้ cache mounts กับ buildx

# ===== Build stage =====
FROM node:20-alpine AS build
WORKDIR /app

# ติดตั้งด้วย npm ci เพื่อให้ reproducible และใช้แคช npm
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ค่อยก็อปซอร์ส
COPY . .

# สร้างไฟล์ production build
RUN --mount=type=cache,target=/root/.npm npm run build

# ===== Run stage =====
FROM nginx:alpine

# ถ้ามี SPA ให้ใช้ nginx.conf ของคุณ (มีอยู่แล้วในโปรเจค)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# เอาไฟล์ build ไปเสิร์ฟ
COPY --from=build /app/dist /usr/share/nginx/html

# เสริมเล็กน้อยให้ container คาดเดาง่าย
ENV NODE_ENV=production

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
