// src/hooks/useAppShellMode.js
import { useEffect, useState } from "react";

/**
 * isMobile = tela <= 768px  OU  app instalado (PWA standalone / iOS standalone)
 * Overrides de teste:
 *  - ?mobile=1 -> força mobile
 *  - ?desktop=1 -> força desktop
 *  - localStorage.forceMobile = "1"  (ou "0")
 *  - localStorage.forceDesktop = "1" (ou "0")
 */
export default function useAppShellMode() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const dm = window.matchMedia("(display-mode: standalone)");

    const readOverrides = () => {
      const qs = new URLSearchParams(window.location.search);
      const qMobile = qs.get("mobile");
      const qDesktop = qs.get("desktop");
      const lsMobile = localStorage.getItem("forceMobile");
      const lsDesktop = localStorage.getItem("forceDesktop");

      if (qMobile === "1" || lsMobile === "1") return true;
      if (qDesktop === "1" || lsDesktop === "1") return false;
      return null;
    };

    const compute = () => {
      const override = readOverrides();
      if (override !== null) {
        setIsMobile(override);
        return;
      }
      const small = mq.matches;
      const standalone = dm.matches || window.navigator?.standalone === true; // iOS
      setIsMobile(small || standalone);
    };

    // cálculo inicial
    compute();

    // ouvir mudanças
    const onChange = () => compute();

    mq.addEventListener?.("change", onChange);
    dm.addEventListener?.("change", onChange);
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    window.addEventListener("visibilitychange", onChange);

    return () => {
      mq.removeEventListener?.("change", onChange);
      dm.removeEventListener?.("change", onChange);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
      window.removeEventListener("visibilitychange", onChange);
    };
  }, []);

  return { isMobile };
}
