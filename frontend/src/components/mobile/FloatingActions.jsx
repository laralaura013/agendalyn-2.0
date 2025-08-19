import React, { useMemo, useState } from "react";
import { Plus, CalendarDays, Link as LinkIcon, Receipt, List as ListIcon, X } from "lucide-react";

/**
 * FloatingActions (mobile + desktop)
 *
 * Props:
 * - hidden?: boolean                      // força esconder tudo (ex.: quando modal aberto)
 * - onCreateAppointment?: () => void
 * - onOpenOrder?: () => void
 * - onOpenWaitlist?: () => void
 * - onShowBookingLink?: () => Promise<void> | void
 *
 * Comportamento:
 * - MOBILE (md:hidden): um speed-dial no canto inferior direito (acima da bottom-nav).
 * - DESKTOP (hidden md:inline-flex): um FAB azul no canto inferior direito.
 * - "Agendar horário" dispara a prop e também o evento global "openEmptyAppointment".
 */
export default function FloatingActions({
  hidden = false,
  onCreateAppointment,
  onOpenOrder,
  onOpenWaitlist,
  onShowBookingLink,
}) {
  const [open, setOpen] = useState(false);

  const runCreateAppointment = () => {
    onCreateAppointment?.();
    try {
      window?.dispatchEvent?.(new Event("openEmptyAppointment"));
    } catch { /* no-op */ }
  };

  const actions = useMemo(
    () => [
      {
        id: "schedule",
        label: "Agendar horário",
        icon: <CalendarDays size={16} />,
        run: () => runCreateAppointment(),
      },
      {
        id: "share-link",
        label: "Link de agendamento",
        icon: <LinkIcon size={16} />,
        run: async () => {
          if (onShowBookingLink) {
            await onShowBookingLink();
            return;
          }
          const url = `${window.location.origin}/agendar/`;
          try { await navigator.clipboard.writeText(url); alert("Link copiado!"); }
          catch { alert(url); }
        },
      },
      {
        id: "open-order",
        label: "Abrir comanda",
        icon: <Receipt size={16} />,
        run: () => onOpenOrder?.(),
      },
      {
        id: "waitlist",
        label: "Lista de espera",
        icon: <ListIcon size={16} />,
        run: () => onOpenWaitlist?.(),
      },
    ],
    [onOpenOrder, onOpenWaitlist, onShowBookingLink]
  );

  const z = "z-[9999]"; // por cima da bottom-nav e do calendário

  if (hidden) return null;

  return (
    <>
      {/* ===== MOBILE: speed-dial (somente em telas < md) ===== */}
      <div className={`fixed right-4 bottom-24 md:hidden ${z}`}>
        {/* Itens quando aberto */}
        <div
          className={`mb-2 flex flex-col items-end gap-2 transition-all duration-200 ${
            open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          {actions.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setOpen(false);
                a.run?.();
              }}
              className="px-3 py-2 bg-white rounded-full shadow-lg border border-gray-200 text-sm flex items-center gap-2"
            >
              <span>{a.label}</span>
              {a.icon}
            </button>
          ))}
        </div>

        {/* Toggle do speed-dial */}
        <button
          type="button"
          aria-label={open ? "Fechar ações" : "Ações rápidas"}
          title={open ? "Fechar ações" : "Ações rápidas"}
          onClick={() => setOpen((v) => !v)}
          className="w-12 h-12 rounded-full shadow-xl bg-gray-900 text-white flex items-center justify-center"
        >
          {open ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {/* ===== DESKTOP: FAB azul (somente em telas >= md) ===== */}
      <button
        type="button"
        aria-label="Novo agendamento"
        title="Novo agendamento"
        onClick={runCreateAppointment}
        className={`hidden md:inline-flex fixed right-6 bottom-6 ${z} w-14 h-14 rounded-full shadow-xl bg-[#1976d2] text-white items-center justify-center`}
      >
        <Plus size={24} />
      </button>
    </>
  );
}
