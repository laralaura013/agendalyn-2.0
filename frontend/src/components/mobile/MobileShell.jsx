// MobileShell.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import BottomTabs from "./BottomTabs";

/**
 * Moldura principal (mobile): conteúdo + abas inferiores.
 * O FAB agora é responsabilidade das páginas (ex.: Schedule).
 */
export default function MobileShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-[104px]">
        <Outlet />
      </main>
      <BottomTabs area="admin" />
    </div>
  );
}
