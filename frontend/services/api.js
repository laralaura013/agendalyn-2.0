import axios from 'axios';

const API_URL = 'https://agendalyn-20-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('token');
  const clientToken = localStorage.getItem('clientToken');

  const isClientRoute = config.url?.startsWith('/portal');
  const isAdminRoute = !isClientRoute && config.url?.startsWith('/');

  if (isClientRoute && clientToken) {
    config.headers.Authorization = `Bearer ${clientToken}`;
  } else if (isAdminRoute && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
