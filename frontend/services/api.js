import axios from 'axios';

const API_URL = 'https://agendalyn-20-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const clientToken = localStorage.getItem('clientToken');
  const adminToken = localStorage.getItem('token');

  // Se for rota do portal e houver clientToken, usa o token do cliente
  if (config.url?.includes('/portal') && clientToken) {
    config.headers.Authorization = `Bearer ${clientToken}`;
  }

  // Caso contrário, se houver token de admin, usa ele
  else if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }

  return config;
});

export default api;
