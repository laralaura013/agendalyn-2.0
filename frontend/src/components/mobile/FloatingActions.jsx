import React, { useEffect, useMemo, useState } from "react";
import { Plus, CalendarDays, Link as LinkIcon, Receipt, List as ListIcon, X } from "lucide-react";

/**
 * FloatingActions (apenas MOBILE)
 *
 * Props:
 * - hidden?: boolean                   // esconde tudo (ex.: quando um modal está aberto)
 * - onCreateAppointment?: () => void
 * - onOpenOrder?: () => void
 * - onOpenWaitlist?: () => void
 * - onShowBookingLink?: () => Promise<void> | void
 * - bottomOffsetPx?: number            // distância da bottom-nav. default 88
 *
 * Observações:
 * - NÃO existe mais o botão azul. Só o botão preto “+” (speed-dial) e só no mobile (md:hidden).
 * - Respeita safe-area em aparelhos com notch.
 */
export default function FloatingActions({
  hidden = false,
  onCreateAppointment,
  onOpenOrder,
  onOpenWaitlist,
  onShowBookingLink,
  bottomOffsetPx = 88,
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  const runCreateAppointment = () => {
    onCreateAppointment?.();
    try {
      // fallback: dispara um evento global para quem estiver escutando
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

  // estilo para manter acima da bottom-nav e respeitar safe-area
  const bottomStyle = {
    bottom: `calc(${bottomOffsetPx}px + env(safe-area-inset-bottom, 0px))`,
  };

  return (
    // SOMENTE no mobile
    <div
      className={`fixed right-4 z-50 md:hidden transition-opacity ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={bottomStyle}
    >
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

      {/* Botão que abre/fecha o speed-dial */}
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
  );
}
