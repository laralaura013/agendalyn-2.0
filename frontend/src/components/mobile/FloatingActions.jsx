// frontend/src/components/mobile/FloatingActions.jsx
import React, { useMemo, useState } from "react";
import { Plus, X, Calendar as CalendarIcon, Link as LinkIcon, ClipboardList, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function FloatingActions({
  // handlers vindos do Schedule.jsx
  onCreateAppointment,        // abre modal de agendamento
  onOpenOrder,                // vai para comanda
  onOpenWaitlist,             // vai para lista de espera
  onShowBookingLink,          // copia link de agendamento
  bottomClass = "bottom-24",
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Fallbacks para funcionar mesmo sem os handlers
  const doCreate = async () => {
    if (onCreateAppointment) return onCreateAppointment();
    navigate("/dashboard/schedule?new=1");
  };
  const doOrder = () => {
    if (onOpenOrder) return onOpenOrder();
    navigate("/dashboard/orders");
  };
  const doWaitlist = () => {
    if (onOpenWaitlist) return onOpenWaitlist();
    navigate("/dashboard/waitlist");
  };
  const doLink = async () => {
    if (onShowBookingLink) return onShowBookingLink();
    try {
      const storedCompany =
        JSON.parse(localStorage.getItem("companyData")) ||
        JSON.parse(localStorage.getItem("user"))?.company ||
        {};
      const companyId = storedCompany?.id || "SEU_COMPANY_ID";
      const link = `${window.location.origin}/agendar/${companyId}`;
      await navigator.clipboard.writeText(link);
      toast.success("Link de agendamento copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const bottom = useMemo(() => bottomClass, [bottomClass]);

  return (
    <>
      {/* Desktop: FAB único azul (abre agendamento) */}
      <button
        onClick={doCreate}
        className={`hidden md:flex fixed ${bottom} right-6 z-50 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:scale-105 active:scale-95 transition`}
        aria-label="Novo agendamento"
        title="Novo agendamento"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Mobile: speed-dial com 4 opções */}
      <div className={`md:hidden fixed ${bottom} right-6 z-50 flex flex-col items-end gap-3`}>
        {open && (
          <div className="flex flex-col items-end gap-3">
            <ActionChip label="Agendar horário" icon={<CalendarIcon className="h-5 w-5" />} onClick={() => { setOpen(false); doCreate(); }} />
            <ActionChip label="Link de agendamento" icon={<LinkIcon className="h-5 w-5" />} onClick={() => { setOpen(false); doLink(); }} />
            <ActionChip label="Abrir comanda" icon={<ClipboardList className="h-5 w-5" />} onClick={() => { setOpen(false); doOrder(); }} />
            <ActionChip label="Lista de espera" icon={<List className="h-5 w-5" />} onClick={() => { setOpen(false); doWaitlist(); }} />
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-xl transition hover:scale-105 active:scale-95"
          aria-label={open ? "Fechar ações" : "Abrir ações"}
          title={open ? "Fechar ações" : "Abrir ações"}
        >
          {open ? <X className="h-7 w-7" /> : <Plus className="h-7 w-7" />}
        </button>
      </div>
    </>
  );
}

function ActionChip({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-2 shadow-md ring-1 ring-black/5 transition hover:translate-x-[-2px] active:translate-x-[-1px]"
    >
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 shadow-sm">
        {icon}
      </span>
    </button>
  );
}
