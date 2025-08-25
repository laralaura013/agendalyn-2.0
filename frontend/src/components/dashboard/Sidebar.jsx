import React, { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Calendar, ClipboardList, Users, UserCog, Settings,
  Package, Tag, ShoppingCart, Boxes, DollarSign, Wallet, CreditCard,
  Landmark, Truck, FileBarChart, BarChart3, Target, ListChecks
} from "lucide-react";
import "../../styles/neumorphism.css"; // ⬅️ importa o CSS do efeito

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
  const navigate = useNavigate();

  // controla recolhido/expandido no desktop
  const [collapsed, setCollapsed] = useState(false);

  const closeIfMobile = () => setIsMobileMenuOpen?.(false);

  const baseItem =
    "neumorphic-interactive flex items-center gap-4 px-3 py-3 rounded-xl transition text-[var(--text-color)]";

  const linkClass = ({ isActive }) =>
    [
      baseItem,
      isActive ? "active neumorphic-inset" : "hover:shadow-neu-hover",
      collapsed ? "justify-center" : ""
    ].join(" ");

  const Title = ({ children }) => (
    <div
      className={[
        "text-[10px] uppercase font-semibold tracking-wider mb-2 pl-3",
        collapsed ? "opacity-0 invisible w-0" : "opacity-100 visible"
      ].join(" ")}
    >
      {children}
    </div>
  );

  const Item = ({ to, icon: Icon, label, end }) => (
    <NavLink to={to} end={end} className={linkClass} onClick={closeIfMobile}>
      <Icon size={20} className="shrink-0" />
      <span
        className={[
          "nav-text transition-all",
          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
        ].join(" ")}
      >
        {label}
      </span>
    </NavLink>
  );

  return (
    <>
      {/* Overlay mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        aria-label="Menu lateral"
        className={[
          "sidebar-neu neumorphic text-[var(--text-color)]",
          "fixed inset-y-0 left-0 z-30 flex flex-col h-full",
          "transform transition-transform duration-300 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:translate-x-0 md:flex-shrink-0",
          collapsed ? "w-[90px]" : "w-64"
        ].join(" ")}
      >
        {/* Cabeçalho / logo */}
        <div className="flex items-center justify-between p-3 mb-2">
          <button
            onClick={() => { navigate("/dashboard"); closeIfMobile(); }}
            className={[
              "flex items-center gap-3 focus:outline-none",
              collapsed ? "justify-center w-full" : ""
            ].join(" ")}
            aria-label="Ir para Dashboard"
          >
            <div className="neumorphic-inset p-3 rounded-full">
              <Calendar className="w-5 h-5" />
            </div>
            {!collapsed && (
              <span className="logo-text text-lg font-bold">Agendalyn</span>
            )}
          </button>

          {/* Botão recolher/expandir (desktop) */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="neumorphic neumorphic-interactive absolute top-4 -right-3 translate-x-1/2 p-2 rounded-full hidden md:inline-flex"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <span className="inline-block">›</span>
            ) : (
              <span className="inline-block">‹</span>
            )}
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <Title>Principal</Title>
          <ul className="space-y-2">
            <li><Item to="/dashboard" icon={LayoutDashboard} label="Dashboard" end /></li>
            <li><Item to="/dashboard/schedule" icon={Calendar} label="Agenda" /></li>
            <li><Item to="/dashboard/orders" icon={ClipboardList} label="Comandas" /></li>
            <li><Item to="/dashboard/clients" icon={Users} label="Clientes" /></li>
            <li><Item to="/dashboard/cashier" icon={DollarSign} label="Caixa" /></li>
          </ul>

          <Title className="mt-6">Cadastros</Title>
          <ul className="space-y-2">
            <li><Item to="/dashboard/staff" icon={UserCog} label="Colaboradores" /></li>
            <li><Item to="/dashboard/services" icon={ListChecks} label="Serviços" /></li>
            <li><Item to="/dashboard/products" icon={ShoppingCart} label="Produtos" /></li>
            <li><Item to="/dashboard/categories" icon={Tag} label="Categorias" /></li>
            <li><Item to="/dashboard/brands" icon={Boxes} label="Marcas" /></li>
            <li><Item to="/dashboard/packages" icon={Package} label="Pacotes" /></li>
            <li><Item to="/dashboard/anamnesis" icon={ListChecks} label="Anamneses" /></li>
            <li><Item to="/dashboard/waitlist" icon={Users} label="Lista de Espera" /></li>
          </ul>

          <Title className="mt-6">Financeiro</Title>
          <ul className="space-y-2">
            <li><Item to="/dashboard/payables" icon={Wallet} label="Contas a Pagar" /></li>
            <li><Item to="/dashboard/receivables" icon={CreditCard} label="Contas a Receber" /></li>
            <li><Item to="/dashboard/finance-categories" icon={Landmark} label="Categorias Financeiras" /></li>
            <li><Item to="/dashboard/suppliers" icon={Truck} label="Fornecedores" /></li>
            <li><Item to="/dashboard/payment-methods" icon={CreditCard} label="Formas de Pagamento" /></li>
          </ul>

          <Title className="mt-6">Relatórios</Title>
          <ul className="space-y-2">
            {/* NOVO: Performance */}
            <li><Item to="/dashboard/performance" icon={BarChart3} label="Performance" /></li>

            <li><Item to="/dashboard/reports" icon={FileBarChart} label="Relatórios" /></li>
            <li><Item to="/dashboard/reports/birthdays" icon={BarChart3} label="Aniversariantes" /></li>
            <li><Item to="/dashboard/reports/cashflow" icon={BarChart3} label="Fluxo de Caixa" /></li>
            <li><Item to="/dashboard/goals" icon={Target} label="Metas" /></li>
          </ul>

          <Title className="mt-6">Configurações</Title>
          <ul className="space-y-2">
            <li><Item to="/dashboard/settings" icon={Settings} label="Configurações" /></li>
          </ul>
        </nav>
      </aside>
    </>
  );
}
