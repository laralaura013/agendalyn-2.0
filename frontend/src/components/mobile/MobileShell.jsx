import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Link2, FileText, List, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

import BottomTabs from "./BottomTabs";
import FloatingActions from "./FloatingActions";

/**
 * O "molde" principal para a visualização em celular.
 * Inclui a barra de navegação inferior e o botão de ações flutuantes.
 */
export default function MobileShell() {
  const location = useLocation();
  const navigate = useNavigate();

  // O botão de Ações Flutuantes só deve aparecer em certas telas, como a Agenda.
  const showFloatingActions = location.pathname.includes("/schedule");

  // Ações que o botão flutuante irá executar.
  // ATENÇÃO: A lógica para abrir modais (Agendar, Bloquear, etc.)
  // precisará ser movida para um estado global (Context) no futuro
  // para funcionar em outras páginas. Por enquanto, redirecionamos.
  const actions = [
    { id: "agendar", label: "Agendar horário", icon: <CalendarDays className="w-5 h-5" />, run: () => navigate("/dashboard/schedule") },
    {
      id: "link",
      label: "Link de agendamento",
      icon: <Link2 className="w-5 h-5" />,
      run: async () => {
        const url = `${window.location.origin}/agendar/`;
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copiado!");
        } catch {
          toast.error("Não consegui copiar o link.");
        }
      },
    },
    { id: "comanda", label: "Abrir comanda", icon: <FileText className="w-5 h-5" />, run: () => navigate("/dashboard/orders") },
    { id: "espera", label: "Lista de espera", icon: <List className="w-5 h-5" />, run: () => navigate("/dashboard/waitlist") },
    { id: "bloquear", label: "Bloquear horário", icon: <Lock className="w-5 h-5" />, run: () => navigate("/dashboard/schedule") },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-[104px]">
        <Outlet />
      </main>
      
      {/* Renderiza o botão de Ações Flutuantes se a condição for verdadeira */}
      {showFloatingActions && <FloatingActions actions={actions} />}
      
      <BottomTabs area="admin" />
    </div>
  );
}
