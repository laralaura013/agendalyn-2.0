// src/hooks/useAppShellMode.js
import { useEffect, useState } from "react";

/**
 * isMobile = tela <= 768px  OU  app instalado (PWA standalone / iOS standalone)
 */
export default function useAppShellMode() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const dm = window.matchMedia("(display-mode: standalone)");

    const compute = () => {
      const small = mq.matches;
      const standalone = dm.matches || window.navigator?.standalone === true; // iOS
      setIsMobile(small || standalone);
    };

    // cálculo inicial
    compute();

    // ouvir mudanças de tamanho e de display-mode
    if (mq.addEventListener) mq.addEventListener("change", compute);
    else mq.addListener?.(compute); // fallback Safari antigo

    if (dm.addEventListener) dm.addEventListener("change", compute);
    else dm.addListener?.(compute);

    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    window.addEventListener("visibilitychange", compute); // ao voltar ao app

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", compute);
      else mq.removeListener?.(compute);

      if (dm.removeEventListener) dm.removeEventListener("change", compute);
      else dm.removeListener?.(compute);

      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
      window.removeEventListener("visibilitychange", compute);
    };
  }, []);

  return { isMobile };
}
