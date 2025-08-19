import React, { useMemo, useState } from "react";
import { Plus, CalendarDays, Link as LinkIcon, Receipt, List as ListIcon, X } from "lucide-react";

/**
 * FloatingActions — FAB exclusivo do MOBILE.
 *
 * Props:
 * - hidden?: boolean                // se true, não renderiza (ex.: modal aberto)
 * - bottomOffsetPx?: number         // afastamento da borda inferior (ex.: 96 para ficar acima da bottom-nav)
 * - onCreateAppointment?: () => void
 * - onOpenOrder?: () => void
 * - onOpenWaitlist?: () => void
 * - onShowBookingLink?: () => Promise<void> | void
 */
export default function FloatingActions({
  hidden = false,
  bottomOffsetPx = 96,
  onCreateAppointment,
  onOpenOrder,
  onOpenWaitlist,
  onShowBookingLink,
}) {
  const [open, setOpen] = useState(false);

  if (hidden) return null; // não renderiza nada

  const runCreate = () => {
    onCreateAppointment?.();
    // fallback evento global (se alguém escuta no Schedule)
    try {
      window?.dispatchEvent?.(new Event("openEmptyAppointment"));
    } catch {}
    setOpen(false);
  };

  const actions = useMemo(
    () => [
      { id: "schedule", label: "Agendar horário", icon: <CalendarDays size={16} />, run: runCreate },
      {
        id: "share-link",
        label: "Link de agendamento",
        icon: <LinkIcon size={16} />,
        run: async () => {
          if (onShowBookingLink) {
            await onShowBookingLink();
          } else {
            const url = `${window.location.origin}/agendar/`;
            try {
              await navigator.clipboard.writeText(url);
              alert("Link copiado!");
            } catch {
              alert(url);
            }
          }
          setOpen(false);
        },
      },
      {
        id: "open-order",
        label: "Abrir comanda",
        icon: <Receipt size={16} />,
        run: () => {
          onOpenOrder?.();
          setOpen(false);
        },
      },
      {
        id: "waitlist",
        label: "Lista de espera",
        icon: <ListIcon size={16} />,
        run: () => {
          onOpenWaitlist?.();
          setOpen(false);
        },
      },
    ],
    [onOpenOrder, onOpenWaitlist, onShowBookingLink]
  );

  // Somente no mobile (esconde em md e acima)
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[60] md:hidden"
      style={{ bottom: `calc(${bottomOffsetPx}px + env(safe-area-inset-bottom))` }}
    >
      {/* Items do speed-dial */}
      <div
        className={`mb-2 flex flex-col items-center gap-2 transition-all duration-200 pointer-events-none ${
          open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        aria-hidden={!open}
      >
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={a.run}
            className="pointer-events-auto px-3 py-2 bg-white rounded-full shadow-lg border border-gray-200 text-sm flex items-center gap-2"
          >
            <span>{a.label}</span>
            {a.icon}
          </button>
        ))}
      </div>

      {/* Botão que abre/fecha o speed-dial */}
      <button
        type="button"
        aria-label={open ? "Fechar ações" : "Ações rápidas"}
        title={open ? "Fechar ações" : "Ações rápidas"}
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full shadow-xl bg-gray-900 text-white flex items-center justify-center"
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </button>
    </div>
  );
}
