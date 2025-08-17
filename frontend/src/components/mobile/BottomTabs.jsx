import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CalendarDays, Receipt, Users, Layers, Home, Bell, User } from "lucide-react";
import "./bottom-tabs.css";

/** Tabs para admin (/dashboard) e cliente (/portal) */
const adminTabs = [
  { to: "/dashboard/cashier",  icon: <Receipt size={20} />,       label: "Caixa" },
  { to: "/dashboard/orders",   icon: <Layers size={20} />,        label: "Comandas" },
  { to: "/dashboard/schedule", icon: <CalendarDays size={21} />,  label: "Agenda", center: true },
  { to: "/dashboard/clients",  icon: <Users size={20} />,         label: "Clientes" },
  { to: "/dashboard/settings", icon: <User size={20} />,          label: "Menu" },
];

const clientTabs = [
  { to: "/portal/agenda",        icon: <Home size={20} />,         label: "Agenda" },
  { to: "/portal/pacotes",       icon: <Layers size={20} />,       label: "Pacotes" },
  { to: "/portal/historico",     icon: <CalendarDays size={21} />, label: "Histórico", center: true },
  { to: "/portal/notificacoes",  icon: <Bell size={20} />,         label: "Avisos" },
  { to: "/portal/perfil",        icon: <User size={20} />,         label: "Perfil" },
];

export default function BottomTabs({ area = "admin" }) {
  const { pathname } = useLocation();
  const tabs = area === "admin" ? adminTabs : clientTabs;

  return (
    <nav className="mobile-tabs">
      <div className="tabs-bg" />
      <div className="tabs-row">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `tab-link ${isActive ? "active" : ""} ${t.center ? "center" : ""}`
            }
            aria-label={t.label}
          >
            {t.icon}
            {!t.center && <span className="tab-label">{t.label}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
