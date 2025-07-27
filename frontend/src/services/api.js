import axios from 'axios';

const api = axios.create({
  baseURL: 'https://agendalyn-20-production.up.railway.app/api',
});

// Aplica token do cliente ou admin conforme a rota
api.interceptors.request.use((config) => {
  const clientToken = localStorage.getItem('clientToken');
  const adminToken = localStorage.getItem('token');

  if (config.url?.startsWith('/portal') && clientToken) {
    config.headers.Authorization = `Bearer ${clientToken}`;
  } else if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }

  return config;
});

export default api;
