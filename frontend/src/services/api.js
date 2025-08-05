// src/services/api.js
import axios from 'axios';

/**
 * 💡 Como funciona
 * - Envia adminToken (localStorage.token) para todas as rotas protegidas.
 * - Envia clientToken (localStorage.clientToken) apenas para rotas que começam com /portal.
 * - NÃO envia Authorization para rotas públicas ("/public/...") ou quando header "X-Public" é definido.
 * - Timeout de 15s e headers padrão configurados.
 */

const api = axios.create({
  baseURL: 'https://agendalyn-20-production.up.railway.app/api',
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: false, // mantenha falso; habilite só se o back exigir cookies
});

/** Rotas públicas que não devem receber Authorization */
const PUBLIC_PATHS = [
  '/public/available-slots',
  '/public/booking-page',
  '/public/create-appointment',
];

/** Utilidades para identificar o path corretamente, mesmo com URL absoluta */
function getPathnameFromConfig(config) {
  try {
    // Se a URL for absoluta, usamos ela diretamente
    const maybeAbsolute = config.url || '';
    if (/^https?:\/\//i.test(maybeAbsolute)) {
      return new URL(maybeAbsolute).pathname;
    }
    // Caso contrário, combinamos com a baseURL
    const base = config.baseURL?.replace(/\/+$/, '') || '';
    const rel = String(maybeAbsolute).replace(/^\/+/, '');
    const full = `${base}/${rel}`;
    return new URL(full).pathname;
  } catch {
    // fallback: devolve a url “como está”
    return config.url || '';
  }
}

function isPortalRoute(pathname) {
  return pathname.startsWith('/portal');
}

function isPublicRoute(pathname) {
  return pathname.startsWith('/public') || PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

const isDev = typeof window !== 'undefined' && !!window?.__DEV__;

// ===== Request Interceptor =====
api.interceptors.request.use((config) => {
  const pathname = getPathnameFromConfig(config);

  // Se marcar explicitamente como público, não anexa Authorization
  if (config.headers && (config.headers['X-Public'] === '1' || config.headers['X-Public'] === 1)) {
    if (isDev) console.log('🔓 [API] Requisição pública (X-Public):', pathname);
    return config;
  }

  // Não envia Authorization para rotas públicas
  if (isPublicRoute(pathname)) {
    if (isDev) console.log('🔓 [API] Requisição pública (rota):', pathname);
    return config;
  }

  // Tokens
  const clientToken = localStorage.getItem('clientToken');
  const adminToken = localStorage.getItem('token');

  if (isPortalRoute(pathname)) {
    if (clientToken) {
      config.headers.Authorization = `Bearer ${clientToken}`;
      if (isDev) console.log('✅ [API] Enviando clientToken para', pathname);
    } else if (isDev) {
      console.warn('⚠️ [API] clientToken ausente para', pathname);
    }
  } else {
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      if (isDev) console.log('✅ [API] Enviando adminToken para', pathname);
    } else if (isDev) {
      console.warn('⚠️ [API] adminToken ausente para', pathname);
    }
  }

  return config;
}, (error) => Promise.reject(error));

// ===== Response Interceptor (opcional, só loga erros de forma amigável) =====
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config ? getPathnameFromConfig(error.config) : 'URL_DESCONHECIDA';

    if (status === 401) {
      // Token inválido/expirado
      console.warn(`🔒 [API] 401 em ${url} — verifique o login/token.`);
      // aqui você pode redirecionar para login se quiser
    } else if (status === 404) {
      console.warn(`🚫 [API] 404 em ${url} — rota inexistente.`);
    } else if (status >= 500) {
      console.error(`💥 [API] ${status} em ${url} — erro no servidor.`);
    }

    return Promise.reject(error);
  }
);

export default api;
