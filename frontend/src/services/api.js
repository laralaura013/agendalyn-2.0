import axios from 'axios';

// A URL base agora virá da variável de ambiente que configuramos na Netlify.
// Em ambiente local, ele usará a URL do localhost como fallback.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
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