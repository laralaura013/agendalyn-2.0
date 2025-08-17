// src/components/mobile/MobileShell.jsx
import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import BottomTabs from "./BottomTabs";

export default function MobileShell() {
  const loc = useLocation();
  const navigate = useNavigate();

  const onFab = () => {
    // atalho do FAB: ir direto para a agenda (como no mock)
    navigate("/dashboard/schedule");
  };

  // título simples por rota
  const title =
    loc.pathname.startsWith("/dashboard/schedule") ? "Agendalyn" :
    loc.pathname.startsWith("/dashboard/cashier")  ? "Agendalyn" :
    loc.pathname.startsWith("/dashboard/orders")   ? "Agendalyn" :
    loc.pathname.startsWith("/dashboard/clients")  ? "Agendalyn" :
    "Agendalyn";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header roxo fixo */}
      <header
        className="sticky top-0 z-40 text-white"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="bg-purple-700">
          <div className="h-12 flex items-center justify-center px-4">
            <h1 className="text-base font-semibold">{title}</h1>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="px-3 pb-[104px] pt-3 max-w-md mx-auto">
        <Outlet />
      </main>

      {/* FAB central (agenda) */}
      <button
        onClick={onFab}
        aria-label="Novo / Agenda"
        className="fixed bottom-16 left-1/2 -translate-x-1/2 md:hidden
                   w-14 h-14 rounded-full shadow-lg bg-purple-600 text-white
                   flex items-center justify-center active:scale-95"
        style={{ boxShadow: "0 10px 25px rgba(91,33,182,0.35)" }}
      >
        {/* ícone calendário simples */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 3v4M8 3v4M3 11h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Bottom tabs */}
      <BottomTabs area="admin" />
    </div>
  );
}
