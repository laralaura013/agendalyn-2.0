// src/services/api.js
import axios from 'axios';

/**
 * 💡 Regras
 * - Injeta contexto da empresa SEMPRE (headers + fallback ?companyId=...) inclusive em /public.
 * - Envia adminToken (localStorage.token) para rotas protegidas (não /public, não /portal).
 * - Envia clientToken (localStorage.clientToken) para rotas que começam com /portal.
 * - NÃO envia Authorization para rotas públicas ("/public/...") ou quando header "X-Public" = 1.
 * - Timeout de 15s e headers padrão.
 * - baseURL pode vir de VITE_API_URL / REACT_APP_API_URL / NEXT_PUBLIC_API_URL / fallback.
 */

const ENV_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) ||
  '';

const FALLBACK_BASE = 'https://agendalyn-20-production.up.railway.app/api';
const baseURL = (ENV_BASE || '').trim() || FALLBACK_BASE;

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': 'pt-BR,pt;q=0.9',
  },
  withCredentials: false,
});

/** Rotas públicas (sem Authorization) */
const PUBLIC_PATHS = [
  '/public/available-slots',
  '/public/booking-page',
  '/public/create-appointment',
];

/** Resolve pathname de forma robusta, mesmo com URL absoluta */
function getPathnameFromConfig(config) {
  try {
    const maybeAbsolute = config.url || '';
    if (/^https?:\/\//i.test(maybeAbsolute)) {
      return new URL(maybeAbsolute).pathname.replace(/\/{2,}/g, '/');
    }
    const base = (config.baseURL || '').replace(/\/+$/, '');
    const rel = String(maybeAbsolute).replace(/^\/+/, '');
    const full = `${base}/${rel}`;
    return new URL(full).pathname.replace(/\/{2,}/g, '/');
  } catch {
    return (config.url || '').replace(/\/{2,}/g, '/');
  }
}

function isPortalRoute(pathname) {
  return pathname.startsWith('/portal') || pathname.includes('/portal/');
}

function isPublicRoute(pathname) {
  if (pathname.startsWith('/public') || pathname.includes('/public/')) return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

const isDev =
  (typeof window !== 'undefined' && !!window.__DEV__) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) ||
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development');

/** Lê possíveis chaves de empresa do localStorage */
function readCompanyId() {
  if (typeof localStorage === 'undefined') return '';
  return (
    localStorage.getItem('companyId') ||
    localStorage.getItem('selectedCompanyId') ||
    localStorage.getItem('tenantId') ||
    localStorage.getItem('workspaceId') ||
    ''
  );
}

/** Garante objeto params */
function ensureParamsObject(config) {
  if (!config.params || typeof config.params !== 'object') {
    config.params = {};
  }
  return config;
}

/** Injeta contexto da empresa (headers + fallback query) */
function injectCompanyContext(config, pathname) {
  // Permite desativar manualmente
  if (config.headers && (config.headers['X-No-Company'] === '1' || config.headers['X-No-Company'] === 1)) {
    return config;
  }

  const companyId = readCompanyId();
  if (!companyId) {
    if (isDev) console.warn('⚠️ [API] Nenhum companyId no localStorage — as listas podem vir vazias.', pathname);
    return config;
  }

  // Headers comuns (alguns backends variam o nome)
  config.headers['X-Company-Id'] = companyId;
  config.headers['x-company-id'] = companyId;
  config.headers['X-Tenant-Id'] = companyId;
  config.headers['X-Workspace-Id'] = companyId;

  // Fallback: adiciona na query se não houver
  ensureParamsObject(config);
  if (!('companyId' in config.params)) {
    config.params.companyId = companyId;
  }

  if (isDev) console.log('🏷️ [API] Contexto empresa ->', companyId, '•', pathname);
  return config;
}

// ===== Request Interceptor =====
api.interceptors.request.use(
  (config) => {
    const pathname = getPathnameFromConfig(config);

    // Sempre injeta contexto da empresa (inclusive /public)
    injectCompanyContext(config, pathname);

    // Se for requisição explicitamente pública, não anexa Authorization
    if (config.headers && (config.headers['X-Public'] === '1' || config.headers['X-Public'] === 1)) {
      if (isDev) console.log('🔓 [API] Requisição pública (X-Public):', pathname);
      return config;
    }

    // Não envia Authorization em rotas públicas
    if (isPublicRoute(pathname)) {
      if (isDev) console.log('🔓 [API] Requisição pública (rota):', pathname);
      return config;
    }

    // Tokens
    const clientToken = typeof localStorage !== 'undefined' ? localStorage.getItem('clientToken') : null;
    const adminToken = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

    if (isPortalRoute(pathname)) {
      if (clientToken) {
        config.headers.Authorization = `Bearer ${clientToken}`;
        if (isDev) console.log('✅ [API] clientToken →', pathname);
      } else if (isDev) {
        console.warn('⚠️ [API] clientToken ausente →', pathname);
      }
    } else {
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
        if (isDev) console.log('✅ [API] adminToken →', pathname);
      } else if (isDev) {
        console.warn('⚠️ [API] adminToken ausente →', pathname);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Response Interceptor =====
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config ? getPathnameFromConfig(error.config) : 'URL_DESCONHECIDA';
    const msg = error?.response?.data?.message || error?.message;

    if (status === 401) {
      console.warn(`🔒 [API] 401 em ${url} — token inválido/expirado.`);
    } else if (status === 403) {
      console.warn(`⛔ [API] 403 em ${url} — sem permissão.`);
    } else if (status === 404) {
      console.warn(`🚫 [API] 404 em ${url} — rota inexistente.`);
    } else if (status >= 500) {
      console.error(`💥 [API] ${status} em ${url} — erro no servidor.`);
    } else if (isDev) {
      console.warn(`⚠️ [API] erro em ${url}:`, msg);
    }

    return Promise.reject(error);
  }
);

if (isDev) {
  console.log('🌐 [API] baseURL =', baseURL);
}

export default api;
