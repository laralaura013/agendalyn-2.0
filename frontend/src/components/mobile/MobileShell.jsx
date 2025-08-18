import React from "react";
import { Outlet } from "react-router-dom";
import BottomTabs from "./BottomTabs";

export default function MobileShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Conteúdo da página */}
      <main className="px-3 pt-3 pb-[104px] max-w-md mx-auto">
        <Outlet />
      </main>

      {/* Barra inferior com botão central */}
      <BottomTabs area="admin" />
    </div>
  );
}
