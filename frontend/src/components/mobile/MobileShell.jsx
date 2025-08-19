import React, { useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import BottomTabs from "./BottomTabs";
import FloatingActions from "./FloatingActions";

/**
 * Moldura principal (mobile): conteúdo + abas inferiores.
 * O FAB (botão flutuante) aparece apenas na Agenda (/dashboard/schedule).
 */
export default function MobileShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const isOnSchedule = location.pathname.startsWith("/dashboard/schedule");
  const showFloatingActions = isOnSchedule; // só mostra o FAB na Agenda

  // Abre modal de agendamento vazio na Agenda.
  // Se não estivermos na Agenda, navega pra lá e dispara o evento logo em seguida.
  const openEmptyAppointment = useCallback(() => {
    if (!isOnSchedule) {
      navigate("/dashboard/schedule");
      setTimeout(() => {
        try {
          window?.dispatchEvent?.(new Event("openEmptyAppointment"));
        } catch {}
      }, 0);
    } else {
      try {
        window?.dispatchEvent?.(new Event("openEmptyAppointment"));
      } catch {}
    }
  }, [isOnSchedule, navigate]);

  const openOrder = useCallback(() => navigate("/dashboard/orders"), [navigate]);
  const openWaitlist = useCallback(() => navigate("/dashboard/waitlist"), [navigate]);

  const copyBookingLink = useCallback(async () => {
    try {
      const storedCompany =
        JSON.parse(localStorage.getItem("companyData")) ||
        JSON.parse(localStorage.getItem("user"))?.company ||
        {};
      const companyId = storedCompany?.id || "SEU_COMPANY_ID";
      const link = `${window.location.origin}/agendar/${companyId}`;
      await navigator.clipboard?.writeText(link);
      toast.success("Link de agendamento copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-[104px]">
        <Outlet />
      </main>

      {/* FAB só no mobile (este shell já é mobile) e somente na Agenda */}
      {showFloatingActions && (
        <FloatingActions
          // deixa o FAB acima das abas inferiores (64px) com 16px de respiro
          bottomClass="bottom-[calc(64px+16px)]"
          onCreateAppointment={openEmptyAppointment}
          onOpenOrder={openOrder}
          onOpenWaitlist={openWaitlist}
          onShowBookingLink={copyBookingLink}
        />
      )}

      <BottomTabs area="admin" />
    </div>
  );
}