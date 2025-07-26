import axios from 'axios';

const API_URL = 'https://agendalyn-20-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('token');
  const clientToken = localStorage.getItem('clientToken');

  // Adiciona o token de cliente se for uma rota do portal
  if (config.url?.startsWith('/portal') && clientToken) {
    config.headers.Authorization = `Bearer ${clientToken}`;
  }

  // Caso contrário, usa o token de admin
  else if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }

  return config;
});

export default api;
