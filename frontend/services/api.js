import axios from 'axios';

const API_URL = 'https://agendalyn-20-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor de token: separa bem rotas do cliente e do admin
api.interceptors.request.use((config) => {
  const clientToken = localStorage.getItem('clientToken');
  const adminToken = localStorage.getItem('token');

  if (config.url?.startsWith('/portal') && clientToken) {
    config.headers.Authorization = `Bearer ${clientToken}`;
  } else if (!config.url?.startsWith('/portal') && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }

  return config;
});

export default api;
