/* sw.js — Agendalyn 2.0 (offline básico + update automático) */
const CACHE_NAME = "agendalyn-v1";
const OFFLINE_FALLBACK_PAGE = "/";

/** Instala e pré-cacheia o mínimo necessário */
self.addEventListener("install", (event) => {
  // Ativa a nova versão sem esperar fechar as abas antigas
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "/",                   // SPA fallback
        "/index.html",
        "/manifest.webmanifest",
        "/favicon.ico",
      ])
    )
  );
});

/** Limpa caches antigos e assume o controle das abas abertas */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
      await self.clients.claim();
    })()
  );
});

/**
 * Estratégia de fetch:
 * - Navegação (document): network-first → se falhar, usa cache (offline SPA)
 * - Demais GET same-origin: stale-while-revalidate (rápido + atualiza em background)
 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // apenas GET
  if (req.method !== "GET") return;

  // Navegações (HTML)
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(OFFLINE_FALLBACK_PAGE);
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Assets same-origin → SWR
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);

        const networkPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => cached);

        return cached || networkPromise;
      })()
    );
  }
});

/** Recebe comando para ativar imediatamente a nova versão (skip waiting) */
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
