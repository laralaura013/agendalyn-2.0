import React, { useMemo, useState } from "react";
import { Plus, CalendarDays, Link as LinkIcon, Receipt, List as ListIcon, X } from "lucide-react";

/**
 * FloatingActions (mobile + desktop)
 *
 * Props:
 * - bottomClass?: string   // distância do FAB azul da borda inferior (default: bottom-24)
 * - hidden?: boolean       // quando true, não renderiza nenhum FAB (ex.: modal/drawer aberto)
 * - onCreateAppointment?: () => void
 * - onOpenOrder?: () => void
 * - onOpenWaitlist?: () => void
 * - onShowBookingLink?: () => Promise<void> | void
 */
export default function FloatingActions({
  bottomClass = "bottom-24",
  hidden = false,
  onCreateAppointment,
  onOpenOrder,
  onOpenWaitlist,
  onShowBookingLink,
}) {
  const [open, setOpen] = useState(false);

  if (hidden) return null; // some tudo quando houver modal/drawer aberto

  const runCreateAppointment = () => {
    // chama o handler da página (se existir)
    onCreateAppointment?.();
    // e também dispara um evento global para máxima compatibilidade
    try {
      window?.dispatchEvent?.(new Event("openEmptyAppointment"));
    } catch {
      /* no-op */
    }
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
          // fallback simples
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
    [onOpenOrder, onOpenWaitlist, onShowBookingLink]
  );

  return (
    <>
      {/* FAB principal (AZUL) – canto inferior direito (desktop + mobile) */}
      <button
        type="button"
        aria-label="Novo agendamento"
        title="Novo agendamento"
        onClick={runCreateAppointment}
        className={`fixed right-4 ${bottomClass} z-40 w-14 h-14 rounded-full shadow-xl bg-[#1976d2] text-white flex items-center justify-center md:right-6`}
      >
        <Plus size={24} />
      </button>

      {/* Speed-dial (apenas mobile) */}
      <div className="fixed right-4 bottom-6 z-40 md:hidden">
        {/* Lista de ações quando aberto */}
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

        {/* Botão que abre/fecha o speed-dial (PRETO) */}
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
    </>
  );
}
