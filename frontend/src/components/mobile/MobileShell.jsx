import React from "react";
import { Outlet } from "react-router-dom";
import BottomTabs from "./BottomTabs";

/** Shell apenas para MOBILE — no desktop não é usado */
export default function MobileShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-3 pt-3 pb-[104px] max-w-md mx-auto">
        <Outlet />
      </main>
      <BottomTabs area="admin" />
    </div>
  );
}
