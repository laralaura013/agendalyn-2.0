import axios from 'axios';

const api = axios.create({
  // --- TESTE DE DEPURAÇÃO ---
  // Forçamos o endereço do backend diretamente aqui, ignorando a variável da Netlify.
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