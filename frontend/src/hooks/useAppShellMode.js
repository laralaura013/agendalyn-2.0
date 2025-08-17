// src/hooks/useAppShellMode.js
import { useEffect, useState } from "react";

export default function useAppShellMode() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const apply = () => {
      // overrides por querystring: ?shell=mobile | ?shell=desktop
      const qs = new URLSearchParams(window.location.search);
      const shell = qs.get("shell");
      if (shell === "mobile") localStorage.setItem("forceMobileShell", "1");
      if (shell === "desktop") localStorage.setItem("forceMobileShell", "0");

      const forced = localStorage.getItem("forceMobileShell");
      const forceMobile = forced === "1";
      const forceDesktop = forced === "0";

      const small = window.innerWidth < 768;
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator?.standalone === true;

      const mobile = forceDesktop ? false : (forceMobile ? true : (small || standalone));
      setIsMobile(mobile);
      document.documentElement.dataset.shell = mobile ? "mobile" : "desktop"; // útil p/ debug/CSS
      console.log("[useAppShellMode]", { small, standalone, forceMobile, forceDesktop, mobile });
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    document.addEventListener("visibilitychange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);

  return { isMobile };
}
