import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import BottomTabs from "./BottomTabs";
import FloatingActions from "./FloatingActions";

/**
 * Moldura principal (mobile): conteúdo + abas inferiores.
 * O FAB (botão flutuante) aparece apenas na Agenda (/dashboard/schedule),
 * e some automaticamente quando um modal da Agenda estiver aberto.
 */
export default function MobileShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const isOnSchedule = location.pathname.startsWith("/dashboard/schedule");
  const [fabVisible, setFabVisible] = useState(true);

  // Escuta eventos disparados pela página Schedule para esconder/mostrar o FAB
  useEffect(() => {
    const onToggle = (ev) => {
      // detail: boolean -> true = FAB visível | false = FAB escondido
      if (typeof ev.detail === "boolean") setFabVisible(ev.detail);
    };
    window.addEventListener("fab:toggle", onToggle);
    return () => window.removeEventListener("fab:toggle", onToggle);
  }, []);

  // Abre modal de agendamento vazio na Agenda.
  // Se não estivermos na Agenda, navega pra lá e dispara o evento logo em seguida.
  const openEmptyAppointment = useCallback(() => {
    const fire = () => {
      try {
        window?.dispatchEvent?.(new Event("openEmptyAppointment"));
      } catch {}
    };
    if (!isOnSchedule) {
      navigate("/dashboard/schedule");
      setTimeout(fire, 0);
    } else {
      fire();
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

      {/* FAB somente na Agenda (e apenas 1 instância: remova do Schedule.jsx) */}
      {isOnSchedule && fabVisible && (
        <FloatingActions
          // deixa o FAB acima das abas (64px) + respiro de 16px, encostado à direita
          bottomClass="bottom-[calc(64px+16px)] right-4"
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
