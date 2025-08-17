import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomTabs from "./BottomTabs";
import FloatingActions from "./FloatingActions";

/**
 * Layout “app” para mobile/PWA.
 * - Renderiza Outlet (rotas aninhadas)
 * - Mostra BottomTabs conforme área (/dashboard vs /portal)
 * - Mostra FAB/contexto conforme rota atual
 */
export default function MobileShell({ children }) {
  const location = useLocation();
  const path = location.pathname || "";

  // Descobre “área” atual (admin x cliente) para tabs/ações
  const area = path.startsWith("/dashboard") ? "admin" : "client";

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="h-12 px-4 flex items-center justify-between bg-white border-b border-gray-200">
        <div className="text-sm font-semibold">
          {area === "admin" ? "Agendalyn • Admin" : "Agendalyn • Cliente"}
        </div>
        <div />
      </header>

      <main className="flex-1 overflow-y-auto pb-[88px]">
        {/* Se foi usado diretamente como wrapper de página */}
        {children}
        {/* Se foi usado como element de <Route> (App.jsx) */}
        <Outlet />
      </main>

      <FloatingActions area={area} />
      <BottomTabs area={area} />
    </div>
  );
}
