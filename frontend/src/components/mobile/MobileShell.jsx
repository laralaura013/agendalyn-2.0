// src/components/mobile/MobileShell.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import BottomTabs from "./BottomTabs";

/**
 * Shell mobile:
 * - Um único scroll vertical no <main> (body fica overflow:hidden no index.css)
 * - Espaço inferior para a barra de abas
 */
export default function MobileShell() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="flex-1 overflow-y-auto px-3 pt-3 pb-[104px] max-w-md mx-auto w-full">
        <Outlet />
      </main>
      <BottomTabs area="admin" />
    </div>
  );
}
