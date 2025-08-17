// patch-mobile-shell.js
import fs from "fs";
import path from "path";

const files = {
  "src/hooks/useAppShellMode.js": `import { useEffect, useState } from "react";

export default function useAppShellMode() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile ? "mobile" : "desktop";
}
`,

  "src/components/mobile/MobileShell.jsx": `import React from "react";
import BottomTabs from "./BottomTabs";
import FloatingActions from "./FloatingActions";

export default function MobileShell({ children }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BottomTabs />
      <FloatingActions />
    </div>
  );
}
`,

  "src/components/mobile/BottomTabs.jsx": `import React from "react";
import { Home, CalendarDays, ClipboardList, Bell, User } from "lucide-react";
import "./bottom-tabs.css";

const tabs = [
  { label: "Início", icon: <Home size={22} />, path: "/portal/dashboard" },
  { label: "Agenda", icon: <CalendarDays size={22} />, path: "/portal/agenda" },
  { label: "Comandas", icon: <ClipboardList size={22} />, path: "/portal/historico" },
  { label: "Notificações", icon: <Bell size={22} />, path: "/portal/notificacoes" },
  { label: "Perfil", icon: <User size={22} />, path: "/portal/perfil" },
];

export default function BottomTabs() {
  return (
    <nav className="bottom-tabs">
      {tabs.map((t, i) => (
        <a key={i} href={t.path} className="tab">
          {t.icon}
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  );
}
`,

  "src/components/mobile/bottom-tabs.css": `.bottom-tabs {
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  padding: 6px 0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  z-index: 50;
}

.bottom-tabs .tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  color: #6b7280;
  text-decoration: none;
  transition: color 0.2s ease-in-out;
}

.bottom-tabs .tab:hover {
  color: #9333ea;
}
`,

  "src/components/mobile/FloatingActions.jsx": `import React from "react";
import { Plus } from "lucide-react";

export default function FloatingActions() {
  const handleClick = () => {
    alert("Abrir ação rápida");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-4 bg-purple-600 text-white p-4 rounded-full shadow-lg"
    >
      <Plus size={24} />
    </button>
  );
}
`,
};

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

for (const [file, content] of Object.entries(files)) {
  ensureDir(file);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, content, "utf8");
    console.log("✅ Criado:", file);
  } else {
    console.log("⚠️ Já existe, não sobrescrevi:", file);
  }
}
