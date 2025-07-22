import axios from 'axios';

// A URL do seu backend está agora "hardcoded" (fixa) aqui
// Isto ignora qualquer problema com as variáveis de ambiente da Netlify
const API_URL = 'https://agendalyn-20-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  // Lógica para adicionar o token de administrador, se existir
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;