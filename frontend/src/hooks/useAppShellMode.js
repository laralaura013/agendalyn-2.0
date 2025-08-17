// src/hooks/useAppShellMode.js
import { useEffect, useState } from "react";

const OVERRIDE_KEY = "appShellOverride"; // "mobile" | "desktop"

export default function useAppShellMode() {
  const [isMobile, setIsMobile] = useState(false);
  const [source, setSource] = useState("init");

  useEffect(() => {
    // 1) overrides via querystring
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("clearShell") === "1") {
        localStorage.removeItem(OVERRIDE_KEY);
        console.log("[shell] override limpo");
      } else if (q.has("mobile")) {
        localStorage.setItem(OVERRIDE_KEY, "mobile");
        console.log("[shell] override -> mobile");
      } else if (q.has("desktop")) {
        localStorage.setItem(OVERRIDE_KEY, "desktop");
        console.log("[shell] override -> desktop");
      }
    } catch {}

    const evalMode = () => {
      // 2) override salvo
      const override = localStorage.getItem(OVERRIDE_KEY);
      if (override === "mobile") {
        setIsMobile(true);
        setSource("override-mobile");
        return;
      }
      if (override === "desktop") {
        setIsMobile(false);
        setSource("override-desktop");
        return;
      }

      // 3) heurísticas automáticas
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator?.standalone === true;

      const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
      const narrow = window.innerWidth < 768;

      const ua = (navigator.userAgent || navigator.vendor || "").toLowerCase();
      const uaMobile = /android|iphone|ipod|ipad|mobile/i.test(ua);

      const mobileGuess =
        standalone || (coarse && (narrow || uaMobile)) || (uaMobile && narrow);

      setIsMobile(mobileGuess);
      setSource(
        standalone
          ? "standalone"
          : coarse && narrow
          ? "coarse+narrow"
          : uaMobile && narrow
          ? "ua+narrow"
          : "auto-desktop"
      );
    };

    evalMode();
    const onResize = () => evalMode();
    const onDMChange = () => evalMode();

    window.addEventListener("resize", onResize);
    const mql = window.matchMedia?.("(display-mode: standalone)");
    mql?.addEventListener?.("change", onDMChange);

    return () => {
      window.removeEventListener("resize", onResize);
      mql?.removeEventListener?.("change", onDMChange);
    };
  }, []);

  // se quiser debugar, abra o console e veja: [shell] override...
  return { isMobile, source };
}
