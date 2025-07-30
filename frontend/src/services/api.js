import axios from 'axios';

const api = axios.create({
  baseURL: 'https://agendalyn-20-production.up.railway.app/api',
});

api.interceptors.request.use((config) => {
  const clientToken = localStorage.getItem('clientToken');
  const adminToken = localStorage.getItem('token');
  const isPortalRoute = config.url?.startsWith('/portal');

  if (isPortalRoute && clientToken) {
    config.headers.Authorization = `Bearer ${clientToken}`;
    console.log('✅ Enviando clientToken para', config.url);
  } else if (!isPortalRoute && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
    console.log('✅ Enviando adminToken para', config.url);
  } else {
    console.warn('⚠️ Nenhum token válido para', config.url);
  }

  return config;
});

export default api;
