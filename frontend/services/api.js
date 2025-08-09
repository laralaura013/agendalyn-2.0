import axios from 'axios';

const API_URL = 'https://agendalyn-20-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para aplicar token dinamicamente com base na rota
api.interceptors.request.use(
  (config) => {
    const clientToken = localStorage.getItem('clientToken');
    const adminToken = localStorage.getItem('token');

    // Evita cache agressivo (ajuda depois de excluir/editar)
    config.headers['Cache-Control'] = 'no-cache';
    config.headers['Pragma'] = 'no-cache';

    if (config.url?.startsWith('/portal') && clientToken) {
      config.headers.Authorization = `Bearer ${clientToken}`;

      // Debug temporário – remova após testes
      // console.log('[CLIENT REQUEST]', config.url, config.headers.Authorization);
    } else if (!config.url?.startsWith('/portal') && adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;

      // Debug temporário – remova após testes
      // console.log('[ADMIN REQUEST]', config.url, config.headers.Authorization);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
