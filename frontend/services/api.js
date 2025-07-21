import axios from 'axios';

const api = axios.create({
  // URL forçada para depuração
  baseURL: 'https://agendalyn-20-production.up.railway.app/api', 
});

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;