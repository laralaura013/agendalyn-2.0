// src/components/mobile/MobileShell.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import BottomTabs from "./BottomTabs";

/**
 * Shell do mobile: conteúdo + bottom tabs.
 * (O FAB NÃO fica aqui — cada página decide se mostra, ex.: Schedule.jsx)
 */
export default function MobileShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ajuste o padding conforme a altura real da sua bottom-nav */}
      <main className="pb-[96px]">
        <Outlet />
      </main>

      <BottomTabs area="admin" />
    </div>
  );
}
