import axios from 'axios';

const api = axios.create({
  baseURL: 'https://agendalyn-20-production.up.railway.app/api',
});

api.interceptors.request.use((config) => {
  const clientToken = localStorage.getItem('clientToken');
  const adminToken = localStorage.getItem('token');

  const isPortalRoute = config.url?.startsWith('/portal');

  // Define qual token usar baseado na rota
  if (isPortalRoute && clientToken) {
    config.headers.Authorization = `Bearer ${clientToken}`;
  } else if (!isPortalRoute && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }

  return config;
});

export default api;
