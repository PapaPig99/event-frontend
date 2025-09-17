import api from './api';

export async function registerUser(payload) {
  // payload: { name, email, password, phone?, organization? }
  const { data } = await api.post('/api/auth/register', payload);
  // data: { token, userId, email, name, role }
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data));
  return data;
}

export async function loginUser(payload) {
  const { data } = await api.post('/api/auth/login', payload);
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data));
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function isAuthed() {
  return !!localStorage.getItem('token');
}

export function currentUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
}
