// src/lib/registrations.js
import api from '@/lib/api' // <- axios instance ที่คุณใช้อยู่ (แนบ token แล้ว)

export const createRegistration = (p) => api.post('/registrations', p).then(r => r.data)
export const confirmRegistration = (id, p) => api.patch(`/registrations/${id}/confirm`, p).then(r => r.data)
export const cancelRegistration = (id, p={}) => api.patch(`/registrations/${id}/cancel`, p).then(r => r.data)

export async function myRegistrations(status) {
  const { data } = await api.get('/registrations/me', { params: { status } })
  return data
}
