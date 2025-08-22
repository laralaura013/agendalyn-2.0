import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Plus, CalendarDays, Link as LinkIcon, Receipt, List as ListIcon, X } from "lucide-react";


import { asArray } from '../../utils/asArray';
/**
 * FloatingActions (MOBILE)
 *
 * Props:
 * - hidden?: boolean                  -> se true, não renderiza nada (usado quando modal estiver aberto)
 * - bottomClass?: string              -> classe para ajustar a distância do fundo (default: bottom-[88px])
 * - onCreateAppointment?: () => void
 * - onOpenOrder?: () => void
 * - onOpenWaitlist?: () => void
 * - onShowBookingLink?: () => Promise<void> | void
 */
export default function FloatingActions({
  hidden = false,
  bottomClass = "bottom-[88px]",
  onCreateAppointment,
  onOpenOrder,
  onOpenWaitlist,
  onShowBookingLink,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Fecha o speed-dial clicando fora
  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [open]);

  const runCreateAppointment = useCallback(() => {
    onCreateAppointment?.();
    try {
      // evento global extra (caso o Schedule esteja escutando)
      window?.dispatchEvent?.(new Event("openEmptyAppointment"));
    } catch {}
  }, [onCreateAppointment]);

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
    [onOpenOrder, onOpenWaitlist, onShowBookingLink, runCreateAppointment]
  );

  // A condição de retorno agora vem DEPOIS de todos os Hooks
  if (hidden) return null;

  return (
    <div
      ref={wrapRef}
      className={`fixed right-4 ${bottomClass} z-40 md:hidden`} // SOMENTE MOBILE, canto direito
    >
      {/* Itens quando aberto */}
      <div
        className={`mb-2 flex flex-col items-end gap-2 transition-all duration-200 ${
          open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        {asArray(actions).map((a) => (
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
        className="w-14 h-14 rounded-full shadow-xl bg-gray-900 text-white flex items-center justify-center"
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </button>
    </div>
  );
}