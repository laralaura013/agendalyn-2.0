// src/hooks/useAppShellMode.js
import { useEffect, useMemo, useState } from "react";

/**
 * Decide quando usar o shell mobile (PWA) vs desktop.
 * Regras:
 *  - "mobile" se: override=mobile OU (width <768) OU display-mode=standalone
 *  - "desktop" se: override=desktop
 *  - "auto" se: sem override -> decide por heurística
 *
 * Overrides via URL:
 *   ?mobile=1       -> força mobile e persiste
 *   ?desktop=1      -> força desktop e persiste
 *   ?clearShell=1   -> remove override
 */
export default function useAppShellMode() {
  const [isMobile, setIsMobile] = useState(false);

  // Lê override persistido
  const override = useMemo(() => {
    try {
      return localStorage.getItem("appShellMode") || "auto";
    } catch {
      return "auto";
    }
  }, []);

  // Aplica overrides vindos da URL (uma vez, no mount)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const hasMobile = sp.has("mobile");
    const hasDesktop = sp.has("desktop");
    const hasClear = sp.has("clearShell");

    if (hasClear) {
      try { localStorage.removeItem("appShellMode"); } catch {}
    } else if (hasMobile) {
      try { localStorage.setItem("appShellMode", "mobile"); } catch {}
    } else if (hasDesktop) {
      try { localStorage.setItem("appShellMode", "desktop"); } catch {}
    }

    if (hasMobile || hasDesktop || hasClear) {
      // Limpa a query da barra de endereço
      const clean = window.location.origin + window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", clean);
    }
    // não depende de override aqui; só roda uma vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Função que calcula o estado atual
  const compute = () => {
    // 1) override persistido manda
    let pref = "auto";
    try { pref = localStorage.getItem("appShellMode") || "auto"; } catch {}
    if (pref === "mobile") return true;
    if (pref === "desktop") return false;

    // 2) heurística
    const small =
      window.matchMedia?.("(max-width: 767px)")?.matches ||
      window.innerWidth < 768;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // iOS Safari
      window.navigator?.standalone === true;

    return small || standalone;
  };

  // Avalia no mount e assina eventos relevantes
  useEffect(() => {
    const update = () => {
      const next = compute();
      setIsMobile((prev) => (prev !== next ? next : prev));
    };

    update();

    // resize + orientação
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });

    // quando o PWA é instalado/abre em standalone
    const dm = window.matchMedia?.("(display-mode: standalone)");
    dm?.addEventListener?.("change", update);
    window.addEventListener?.("appinstalled", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      dm?.removeEventListener?.("change", update);
      window.removeEventListener?.("appinstalled", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helpers (opcional usar em algum menu/DevTools)
  const forceMobile = () => {
    try { localStorage.setItem("appShellMode", "mobile"); } catch {}
    setIsMobile(true);
  };
  const forceDesktop = () => {
    try { localStorage.setItem("appShellMode", "desktop"); } catch {}
    setIsMobile(false);
  };
  const clearOverride = () => {
    try { localStorage.removeItem("appShellMode"); } catch {}
    setIsMobile(compute());
  };

  // Debug rápido (comente se não quiser logs)
  // console.log("[useAppShellMode] isMobile:", isMobile, "override:", override);

  return { isMobile, forceMobile, forceDesktop, clearOverride };
}
