// src/services/api.js
import axios from 'axios';

// Usa VITE_API_URL se existir (Vite/Netlify) senão cai no Railway
const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'https://agendalyn-20-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// garante objeto headers
function ensureHeaders(config) {
  if (!config.headers) config.headers = {};
  return config.headers;
}

// Interceptor: aplica token certo e evita headers indevidos em /public
api.interceptors.request.use(
  (config) => {
    const headers = ensureHeaders(config);

    // anti-cache (útil após criar/editar/excluir)
    headers['Cache-Control'] = 'no-cache';
    headers['Pragma'] = 'no-cache';

    // normaliza o path (pra diferenciar /public e /portal)
    const urlPath = (() => {
      if (!config.url) return '';
      if (config.url.startsWith('http')) {
        try { return new URL(config.url).pathname || ''; } catch { return config.url; }
      }
      return config.url;
    })();

    const isPublic = urlPath.startsWith('/public');
    const isPortal = urlPath.startsWith('/portal');

    // nunca envie X-Public
    delete headers['X-Public'];
    delete headers['x-public'];

    // tokens
    const clientToken = localStorage.getItem('clientToken');
    const adminToken  = localStorage.getItem('token');

    if (isPublic) {
      // rotas públicas não devem levar Authorization
      delete headers.Authorization;
    } else if (isPortal && clientToken) {
      headers.Authorization = `Bearer ${clientToken}`;
    } else if (!isPortal && adminToken) {
      headers.Authorization = `Bearer ${adminToken}`;
    } else {
      delete headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Opcional: tratar 401/403
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // if (err?.response?.status === 401) {
    //   localStorage.removeItem('token');
    //   localStorage.removeItem('clientToken');
    // }
    return Promise.reject(err);
  }
);

export default api;
