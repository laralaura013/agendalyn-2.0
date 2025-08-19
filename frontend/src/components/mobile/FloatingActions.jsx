import React, { useMemo, useState, useEffect } from "react";
import { Plus, CalendarDays, Link as LinkIcon, Receipt, List as ListIcon, X } from "lucide-react";

/**
 * FloatingActions (mobile + desktop)
 *
 * Props:
 * - bottomClass?: string
 * - onCreateAppointment?: () => void
 * - onOpenOrder?: () => void
 * - onOpenWaitlist?: () => void
 * - onShowBookingLink?: () => Promise<void> | void
 */
export default function FloatingActions({
  bottomClass = "bottom-24",
  onCreateAppointment,
  onOpenOrder,
  onOpenWaitlist,
  onShowBookingLink,
}) {
  const [open, setOpen] = useState(false);
  const isBrowser = typeof window !== "undefined";

  const runCreateAppointment = () => {
    if (onCreateAppointment) {
      // Preferimos a prop se ela existir
      onCreateAppointment();
    } else if (isBrowser) {
      // Fallback por evento global apenas se não tiver prop
      try {
        window.dispatchEvent(new Event("openEmptyAppointment"));
      } catch {
        /* no-op */
      }
    }
  };

  // Fecha com ESC quando o menu estiver aberto
  useEffect(() => {
    if (!open || !isBrowser) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isBrowser]);

  const actions = useMemo(
    () => [
      {
        id: "schedule",
        label: "Agendar horário",
        icon: <CalendarDays size={16} />,
        run: runCreateAppointment,
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
          // Fallback simples
          if (!isBrowser) return;
          const url = `${window.location.origin}/agendar/`;
          try {
            await navigator.clipboard.writeText(url);
            alert("Link copiado!");
          } catch {
            alert(url);
          }
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
    [onOpenOrder, onOpenWaitlist, onShowBookingLink, isBrowser]
  );

  return (
    <>
      {/* FAB principal (sempre visível) */}
      <button
        type="button"
        aria-label="Novo agendamento"
        title="Novo agendamento"
        onClick={runCreateAppointment}
        className={`fixed right-4 ${bottomClass} z-40 w-14 h-14 rounded-full shadow-xl bg-[#1976d2] text-white flex items-center justify-center`}
      >
        <Plus size={24} />
      </button>

      {/* Speed-dial (apenas mobile) */}
      <div
        className="fixed right-4 md:hidden z-40"
        style={{
          // respeita a safe-area do iOS
          bottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
      >
        {/* Backdrop invisível para fechar ao tocar fora */}
        {open && (
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 md:hidden z-30"
          />
        )}

        {/* Itens quando aberto */}
        <div
          id="fab-menu"
          role="menu"
          aria-label="Ações rápidas"
          className={`z-40 mb-2 flex flex-col items-end gap-2 transition-all duration-200 ${
            open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          {actions.map((a) => (
            <button
              key={a.id}
              role="menuitem"
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

        {/* Botão que abre/fecha o speed-dial */}
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="fab-menu"
          aria-label={open ? "Fechar ações" : "Ações rápidas"}
          title={open ? "Fechar ações" : "Ações rápidas"}
          onClick={() => setOpen((v) => !v)}
          className="w-12 h-12 rounded-full shadow-xl bg-gray-900 text-white flex items-center justify-center"
        >
          {open ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>
    </>
  );
}
