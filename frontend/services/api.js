import axios from 'axios';

const API_URL = 'https://agendalyn-20-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para aplicar token dinamicamente com base na rota
api.interceptors.request.use((config) => {
  const clientToken = localStorage.getItem('clientToken');
  const adminToken = localStorage.getItem('token');

  if (config.url?.startsWith('/portal') && clientToken) {
    config.headers.Authorization = `Bearer ${clientToken}`;

    // Debug temporário – remova após testes
    console.log('[CLIENT REQUEST]');
    console.log('URL:', config.url);
    console.log('Authorization:', config.headers.Authorization);

  } else if (!config.url?.startsWith('/portal') && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;

    // Debug temporário – remova após testes
    console.log('[ADMIN REQUEST]');
    console.log('URL:', config.url);
    console.log('Authorization:', config.headers.Authorization);
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
