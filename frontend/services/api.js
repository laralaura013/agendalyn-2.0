// src/services/api.js
import axios from "axios";

/**
 * Base URL:
 * - Usa VITE_API_URL quando existir (Vite/Netlify)
 * - Fallback para Railway em produção
 */
const API_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  "https://agendalyn-20-production.up.railway.app/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000, // 20s
  withCredentials: false, // ajuste se usar cookies
  headers: {
    Accept: "application/json",
  },
});

/** Util: garante objeto headers */
function ensureHeaders(config) {
  if (!config.headers) config.headers = {};
  return config.headers;
}

/** Util: extrai pathname para decidir se é /public ou /portal */
function getPathname(url) {
  if (!url) return "";
  if (url.startsWith("http")) {
    try {
      return new URL(url).pathname || "";
    } catch {
      return url;
    }
  }
  return url;
}

/** ===== Request Interceptor ===== */
api.interceptors.request.use(
  (config) => {
    const headers = ensureHeaders(config);

    // Anti-cache (evita retorno stale após criar/editar/excluir)
    headers["Cache-Control"] = "no-cache";
    headers["Pragma"] = "no-cache";
    headers["X-Requested-With"] = "XMLHttpRequest";

    const path = getPathname(config.url);
    const isPublic = path.startsWith("/public");
    const isPortal = path.startsWith("/portal");

    // Nunca envie cabeçalho "X-Public"
    delete headers["X-Public"];
    delete headers["x-public"];

    // Tokens (admin e cliente)
    const adminToken = localStorage.getItem("token");
    const clientToken = localStorage.getItem("clientToken");

    if (isPublic) {
      // rotas públicas não levam Authorization
      delete headers.Authorization;
    } else if (isPortal && clientToken) {
      headers.Authorization = `Bearer ${clientToken}`;
    } else if (!isPortal && adminToken) {
      headers.Authorization = `Bearer ${adminToken}`;
    } else {
      delete headers.Authorization;
    }

    // Content-Type: deixe o browser setar quando for FormData
    const isFormData =
      config.data &&
      (typeof FormData !== "undefined") &&
      config.data instanceof FormData;

    if (isFormData) {
      // Remova para o browser setar boundary automático
      delete headers["Content-Type"];
    } else if (config.method && config.method.toUpperCase() !== "GET") {
      // Default para JSON em métodos não-GET
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    // Marca interna para retry
    config.__retryCount = config.__retryCount || 0;

    return config;
  },
  (error) => Promise.reject(error)
);

/** ===== Retry helper (simples: 1 tentativa) ===== */
function shouldRetry(error) {
  const status = error?.response?.status;
  const code = error?.code;
  // Repetir em:
  // - 429 (rate limit)
  // - 503 (service unavailable)
  // - timeout/ECONNABORTED
  return (
    status === 429 ||
    status === 503 ||
    code === "ECONNABORTED" ||
    error?.message?.toLowerCase().includes("timeout")
  );
}
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** ===== Response Interceptor ===== */
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error?.config;

    // Retry: 1 tentativa com backoff simples (500ms)
    if (config && !config.__doNotRetry && config.__retryCount < 1 && shouldRetry(error)) {
      config.__retryCount += 1;
      await wait(500);
      return api(config);
    }

    // Tratamento opcional de 401/403: limpar tokens
    // if (error?.response?.status === 401 || error?.response?.status === 403) {
    //   localStorage.removeItem("token");
    //   localStorage.removeItem("clientToken");
    //   // Redirecionar se quiser:
    //   // window.location.href = "/login";
    // }

    return Promise.reject(error);
  }
);

/** ===== Helpers para gerenciar tokens no app ===== */
export function setAdminToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}
export function setClientToken(token) {
  if (token) localStorage.setItem("clientToken", token);
  else localStorage.removeItem("clientToken");
}
export function clearAllTokens() {
  localStorage.removeItem("token");
  localStorage.removeItem("clientToken");
}

export default api;
