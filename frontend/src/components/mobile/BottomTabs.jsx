import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { DollarSign, ClipboardList, Calendar, Users, Menu } from "lucide-react";
import useAppShellMode from "../../hooks/useAppShellMode";
import "./bottom-tabs.css";

/**
 * Barra inferior (apenas MOBILE).
 * No desktop não renderiza nada — evita “bolinha roxa” perdida.
 */
export default function BottomTabs({ area = "admin" }) {
  const { isMobile } = useAppShellMode();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!isMobile) return null;

  const isAgenda = pathname.startsWith("/dashboard/schedule");

  return (
    <nav className="btabs" role="navigation" aria-label="Navegação">
      <NavLink to="/dashboard/cash" className="btabs-item">
        <DollarSign className="w-5 h-5" />
        <span>Caixa</span>
      </NavLink>

      <NavLink to="/dashboard/orders" className="btabs-item">
        <ClipboardList className="w-5 h-5" />
        <span>Comandas</span>
      </NavLink>

      {/* Botão central */}
      <button
        className={`btabs-center ${isAgenda ? "active" : ""}`}
        onClick={() => navigate("/dashboard/schedule")}
        aria-label="Ir para Agenda"
      >
        <Calendar className="w-6 h-6" />
      </button>

      <NavLink to="/dashboard/clients" className="btabs-item">
        <Users className="w-5 h-5" />
        <span>Clientes</span>
      </NavLink>

      <NavLink to="/dashboard/menu" className="btabs-item">
        <Menu className="w-5 h-5" />
        <span>Menu</span>
      </NavLink>
    </nav>
  );
}
