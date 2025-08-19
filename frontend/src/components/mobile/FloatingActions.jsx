import React, { useMemo, useState } from "react";
import {
  Plus,
  X,
  Calendar as CalendarIcon,
  Link as LinkIcon,
  ClipboardList,
  List,
} from "lucide-react";

/**
 * FloatingActions
 * - Desktop (md+): FAB único que chama onCreateAppointment()
 * - Mobile (<md): speed-dial com 4 ações (agendar, link, comanda, lista de espera)
 *
 * Props:
 *  - onCreateAppointment: () => void
 *  - onOpenOrder: () => void
 *  - onOpenWaitlist: () => void
 *  - onShowBookingLink: () => void
 *  - bottomClass?: string   (ex.: "bottom-24" para evitar colisão com bottom-nav)
 */
export default function FloatingActions({
  onCreateAppointment,
  onOpenOrder,
  onOpenWaitlist,
  onShowBookingLink,
  bottomClass = "bottom-24",
}) {
  const [open, setOpen] = useState(false);

  // distância do fundo (não colidir com a bottom nav)
  const bottom = useMemo(() => bottomClass, [bottomClass]);

  return (
    <>
      {/* DESKTOP: FAB direto para agendar */}
      <button
        onClick={onCreateAppointment}
        className={`hidden md:flex fixed ${bottom} right-6 z-50 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:scale-105 active:scale-95 transition`}
        aria-label="Novo agendamento"
        title="Novo agendamento"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* MOBILE: Speed-dial com 4 ações */}
      <div className={`md:hidden fixed ${bottom} right-6 z-50 flex flex-col items-end gap-3`}>
        {open && (
          <div className="flex flex-col items-end gap-3">
            <ActionChip
              label="Agendar horário"
              icon={<CalendarIcon className="h-5 w-5" />}
              onClick={() => {
                setOpen(false);
                onCreateAppointment?.();
              }}
            />
            <ActionChip
              label="Link de agendamento"
              icon={<LinkIcon className="h-5 w-5" />}
              onClick={() => {
                setOpen(false);
                onShowBookingLink?.();
              }}
            />
            <ActionChip
              label="Abrir comanda"
              icon={<ClipboardList className="h-5 w-5" />}
              onClick={() => {
                setOpen(false);
                onOpenOrder?.();
              }}
            />
            <ActionChip
              label="Lista de espera"
              icon={<List className="h-5 w-5" />}
              onClick={() => {
                setOpen(false);
                onOpenWaitlist?.();
              }}
            />
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
