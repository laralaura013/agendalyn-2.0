import { useEffect, useState } from "react";

/**
 * Retorna true quando:
 * - tela pequena (width < 768), ou
 * - app instalado (PWA standalone / iOS standalone)
 */
export default function useAppShellMode() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const small = window.innerWidth < 768;
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator?.standalone === true;
      setIsMobile(small || standalone);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return { isMobile };
}
