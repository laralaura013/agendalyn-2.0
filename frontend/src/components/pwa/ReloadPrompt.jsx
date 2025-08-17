import React, { useEffect, useRef, useState } from "react";

/**
 * ReloadPrompt — gerenciador de atualização do PWA/Service Worker
 *
 * Eventos/Fluxo esperados:
 *  - Seu main.jsx registra o SW e dispara window.dispatchEvent(new Event("sw.updated"))
 *    quando um novo SW entra no estado "installed" com controller já ativo.
 *  - Este componente escuta esse evento, exibe banner e,
 *    ao clicar em "Atualizar agora", manda "SKIP_WAITING" para o SW e aguarda "controllerchange".
 */
export default function ReloadPrompt() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState("");
  const reloadingRef = useRef(false);

  // 1) Detecta offline/online
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // 2) Ouve o evento customizado disparado no main.jsx quando há update
  useEffect(() => {
    const onSWUpdated = () => setHasUpdate(true);
    window.addEventListener("sw.updated", onSWUpdated);
    return () => window.removeEventListener("sw.updated", onSWUpdated);
  }, []);

  // 3) Ao mandar SKIP_WAITING, o browser dispara "controllerchange" quando o novo SW assumir
  useEffect(() => {
    const onControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      // pequena folga pra permitir flush de caches
      setTimeout(() => window.location.reload(), 150);
    };
    navigator.serviceWorker?.addEventListener?.("controllerchange", onControllerChange);
    return () => navigator.serviceWorker?.removeEventListener?.("controllerchange", onControllerChange);
  }, []);

  const handleUpdateNow = async () => {
    setIsUpdating(true);
    setError("");

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      // tenta usar o waiting; se não tiver, força um update()
      const waiting = reg?.waiting;
      if (waiting) {
        waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        await reg?.update();
        // Após update(), se virar waiting, dispara a mensagem
        const reg2 = await navigator.serviceWorker.getRegistration();
        reg2?.waiting?.postMessage?.({ type: "SKIP_WAITING" });
      }
      // Agora aguardamos o "controllerchange" para recarregar (efeito acima cuida)
    } catch (e) {
      console.error("[ReloadPrompt] Falha ao aplicar update:", e);
      setError("Não foi possível aplicar a atualização agora. Tente recarregar a página manualmente.");
      setIsUpdating(false);
    }
  };

  const handleLater = () => {
    setHasUpdate(false);
    setError("");
    setIsUpdating(false);
  };

  // UI — dois banners: offline + atualização disponível
  return (
    <>
      {/* Banner OFFLINE */}
      {isOffline && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-[60] max-w-[92%] sm:max-w-md">
          <div className="rounded-xl bg-amber-500 text-white shadow-lg px-4 py-3 flex items-start gap-3">
            <span className="mt-0.5">⚠️</span>
            <div className="text-sm">
              <div className="font-semibold">Sem conexão</div>
              <div className="opacity-90">
                Você está offline. Algumas funções podem não funcionar.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner UPDATE DISPONÍVEL */}
      {hasUpdate && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-[70] max-w-[92%] sm:max-w-lg">
          <div className="rounded-xl bg-gray-900 text-white shadow-2xl px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-start gap-3">
              <div className="text-xl">⬆️</div>
              <div className="flex-1 text-sm">
                <div className="font-semibold">Atualização disponível</div>
                <div className="opacity-90">
                  Uma nova versão do Agendalyn foi baixada. Você quer atualizar agora?
                </div>

                {error && (
                  <div className="mt-2 rounded-md bg-red-600/20 border border-red-600/40 px-3 py-2 text-red-100">
                    {error}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleUpdateNow}
                    disabled={isUpdating}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isUpdating ? "Atualizando…" : "Atualizar agora"}
                  </button>
                  <button
                    onClick={handleLater}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                  >
                    Depois
                  </button>
                </div>

                <div className="mt-2 text-[12px] opacity-70">
                  Dica: você pode continuar usando e atualizar mais tarde pelo menu.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
