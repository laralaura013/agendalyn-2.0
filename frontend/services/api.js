// src/services/api.js
import axios from 'axios';

const API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'https://agendalyn-20-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// helper: garante objeto headers
function ensureHeaders(config) {
  if (!config.headers) config.headers = {};
  return config.headers;
}

// Interceptor para aplicar token dinamicamente com base na rota
api.interceptors.request.use(
  (config) => {
    const headers = ensureHeaders(config);

    // anti-cache (útil após criar/editar/excluir)
    headers['Cache-Control'] = 'no-cache';
    headers['Pragma'] = 'no-cache';

    // normaliza pathname da URL
    const urlPath = (() => {
      if (!config.url) return '';
      if (config.url.startsWith('http')) {
        try {
          return new URL(config.url).pathname || '';
        } catch {
          return config.url;
        }
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
    const adminToken = localStorage.getItem('token');

    if (isPublic) {
      // endpoints públicos não devem levar Authorization
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

// (Opcional) Interceptor de resposta para 401/403
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // exemplo:
    // if (err?.response?.status === 401) {
    //   localStorage.removeItem('token');
    //   localStorage.removeItem('clientToken');
    // }
    return Promise.reject(err);
  }
);

export default api;
