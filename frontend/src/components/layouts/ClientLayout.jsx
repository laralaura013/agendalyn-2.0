// ✅ ARQUIVO: src/components/layouts/ClientLayout.jsx
import React, { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import useAppShellMode from "../../hooks/useAppShellMode";
import MobileShell from "../mobile/MobileShell";
import ClientBottomNav from "./ClientBottomNav";

const ClientLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useAppShellMode();

  useEffect(() => {
    const token = localStorage.getItem("clientToken");
    const client = localStorage.getItem("clientData");
    if (!token || !client) {
      navigate("/portal/login/cmdep95530000pspaolfy7dod");
    }
  }, [navigate]);

  // Rotas que não devem mostrar navegação
  const hideNavRoutes = ["/portal/login", "/portal/register"];
  const shouldHideNav = hideNavRoutes.some((path) =>
    location.pathname.includes(path)
  );

  // Se for mobile/app → usar MobileShell
  if (isMobile) {
    return (
      <MobileShell>
        <div className="max-w-md mx-auto w-full px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <Outlet />
        </div>
      </MobileShell>
    );
  }

  // Se for desktop → layout normal
  return (
    <div
      className="min-h-screen bg-white pt-[env(safe-area-inset-top)] px-4"
      style={{ paddingBottom: shouldHideNav ? "1rem" : "90px" }}
    >
      <div className="max-w-md mx-auto">
        <Outlet />
      </div>
      {!shouldHideNav && <ClientBottomNav />}
    </div>
  );
};

export default ClientLayout;
