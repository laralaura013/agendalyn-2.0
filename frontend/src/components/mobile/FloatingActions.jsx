import React, { useMemo, useState } from "react";
import { Plus, X, CalendarDays, Link2, FileText, List, Lock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * FAB (SpeedDial) com overlay.
 *
 * Props opcionais:
 * - actions: [{ id, label, icon, run }]
 * - area: "admin" | "client"  (usado só se actions não vier)
 * - hideOn: ["/caminho", ...]  (rotas onde o FAB deve sumir)
 */
export default function FloatingActions({
  actions: customActions,
  area = "admin",
  hideOn = ["/dashboard/settings"],
}) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Ações padrão por área (usadas apenas se não for passado `actions`)
  const defaultActions = useMemo(() => {
    if (area === "admin") {
      return [
        {
          id: "schedule",
          label: "Agendar horário",
          icon: <CalendarDays className="w-5 h-5" />,
          run: () => navigate("/dashboard/schedule"),
        },
        {
          id: "share-link",
          label: "Link de agendamento",
          icon: <Link2 className="w-5 h-5" />,
          run: async () => {
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
          icon: <FileText className="w-5 h-5" />,
          run: () => navigate("/dashboard/orders"),
        },
        {
          id: "waitlist",
          label: "Lista de espera",
          icon: <List className="w-5 h-5" />,
          run: () => navigate("/dashboard/waitlist"),
        },
      ];
    }
    return [
      {
        id: "new-booking",
        label: "Novo agendamento",
        icon: <CalendarDays className="w-5 h-5" />,
        run: () => navigate("/portal/agenda"),
      },
    ];
  }, [area, navigate]);

  const actions = customActions || defaultActions;
  const hidden = hideOn.some((h) => pathname.startsWith(h));
  if (hidden) return null;

  return (
    <>
      {/* overlay para fechar ao tocar fora */}
      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(false)}
          aria-label="Fechar ações rápidas"
        />
      )}

      <div className="fixed right-4 bottom-24 z-50 flex flex-col items-end gap-3">
        {/* lista de ações */}
        {open &&
          actions.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setOpen(false);
                a.run?.();
              }}
              className="px-3 py-2 bg-white rounded-full shadow-lg border border-gray-200 text-sm flex items-center gap-2"
            >
              <span>{a.label}</span>
              <span className="w-10 h-10 rounded-full flex items-center justify-center border bg-white">
                {a.icon}
              </span>
            </button>
          ))}

        {/* botão principal */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-14 h-14 rounded-full shadow-xl bg-[#0d6efd] text-white flex items-center justify-center"
          aria-label="Ações rápidas"
          title={open ? "Fechar ações" : "Ações rápidas"}
        >
          {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
}
