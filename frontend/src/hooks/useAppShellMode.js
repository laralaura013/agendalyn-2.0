// src/hooks/useAppShellMode.js
import { useEffect, useState } from "react";

/** Cálculo único do modo atual (respeita override salvo) */
function computeIsMobile() {
  // Overrides persistentes
  const override = (() => {
    try {
      return localStorage.getItem("forceShell");
    } catch {
      return null;
    }
  })();
  if (override === "mobile") return true;
  if (override === "desktop") return false;

  // Heurísticas reais
  const small =
    window.matchMedia?.("(max-width: 767.98px)")?.matches ||
    window.innerWidth < 768;

  const standalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    // iOS Safari standalone
    window.navigator?.standalone === true;

  return small || standalone;
}

export default function useAppShellMode() {
  // Lê overrides do querystring na primeira montagem
  const [isMobile, setIsMobile] = useState(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.has("mobile")) localStorage.setItem("forceShell", "mobile");
      if (sp.has("desktop")) localStorage.setItem("forceShell", "desktop");
      if (sp.has("clearShell")) localStorage.removeItem("forceShell");
    } catch {}
    return computeIsMobile();
  });

  useEffect(() => {
    const recalc = () => setIsMobile(computeIsMobile());

    // Recalcula em mudanças relevantes
    window.addEventListener("resize", recalc);
    window.addEventListener("orientationchange", recalc);

    // Mudança de display-mode (PWA)
    const mql = window.matchMedia?.("(display-mode: standalone)");
    mql?.addEventListener?.("change", recalc);

    // Em alguns casos, quando volta do background
    document.addEventListener("visibilitychange", recalc);

    // Recalcula uma vez após o paint (útil em iOS)
    const t = setTimeout(recalc, 0);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", recalc);
      window.removeEventListener("orientationchange", recalc);
      document.removeEventListener("visibilitychange", recalc);
      mql?.removeEventListener?.("change", recalc);
    };
  }, []);

  // Ajuda de diagnóstico no console (desligue se quiser)
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug(
      "[useAppShellMode]",
      { isMobile },
      { override: localStorage.getItem("forceShell") }
    );
  }

  return { isMobile };
}
