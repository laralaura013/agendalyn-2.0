import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // A URL do seu backend
});

// Interceptor para adicionar o token JWT no cabeçalho de cada requisição
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;