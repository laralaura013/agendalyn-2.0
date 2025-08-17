import React, { useMemo, useState } from "react";
import { Plus, CalendarDays, Link, Receipt, List } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * FAB + Speed-dial com ações por área e rota.
 * - Admin: focado em Agenda/Comandas
 * - Cliente: pode abrir atalho para novo agendamento etc.
 */
export default function FloatingActions({ area = "admin" }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // define ações por contexto
  const actions = useMemo(() => {
    if (area === "admin") {
      return [
        { id: "schedule", label: "Agendar horário", icon: <CalendarDays size={16} />, run: () => navigate("/dashboard/schedule") },
        { id: "share-link", label: "Link de agendamento", icon: <Link size={16} />, run: async () => {
            const url = `${window.location.origin}/agendar/cmdep95530000pspaolfy7dod`;
            try { await navigator.clipboard.writeText(url); alert("Link copiado!"); } catch { alert(url); }
          } },
        { id: "open-order", label: "Abrir comanda", icon: <Receipt size={16} />, run: () => navigate("/dashboard/orders") },
        { id: "waitlist", label: "Lista de espera", icon: <List size={16} />, run: () => navigate("/dashboard/waitlist") },
      ];
    }
    // área cliente
    return [
      { id: "new-booking", label: "Novo agendamento", icon: <CalendarDays size={16} />, run: () => navigate("/portal/agenda") },
      { id: "packages", label: "Meus pacotes", icon: <List size={16} />, run: () => navigate("/portal/pacotes") },
    ];
  }, [area, navigate]);

  // Ocultar FAB em algumas telas específicas (ex.: já está na schedule do admin)
  const hideOn = ["/dashboard/settings"];
  const hidden = hideOn.some((h) => pathname.startsWith(h));

  if (hidden) return null;

  return (
    <div className="fixed right-4 bottom-24 z-50">
      {/* itens quando aberto */}
      <div className={`flex flex-col items-end gap-2 transition-all duration-200 ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={() => { setOpen(false); a.run?.(); }}
            className="px-3 py-2 bg-white rounded-full shadow-lg border border-gray-200 text-sm flex items-center gap-2"
          >
            <span>{a.label}</span>{a.icon}
          </button>
        ))}
      </div>

      {/* botão principal */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-14 h-14 rounded-full shadow-xl bg-indigo-600 text-white flex items-center justify-center"
        aria-label="Ações rápidas"
      >
        {open ? "✕" : <Plus size={24} />}
      </button>
    </div>
  );
}
