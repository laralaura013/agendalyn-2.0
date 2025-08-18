// src/components/dashboard/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  UserCog,
  Settings,
  Package,
  Tag,
  ShoppingCart,
  Boxes,
  DollarSign,
  Wallet,
  CreditCard,
  Landmark,
  Truck,
  FileBarChart,
  BarChart3,
  Target,
  ClipboardCheck,
  ListChecks,
} from "lucide-react";

/**
 * Sidebar responsivo:
 * - Mobile: drawer deslizante controlado por isMobileMenuOpen
 * - Desktop (md+): fixo à esquerda com w-64
 *
 * Props esperadas (vindas do AdminLayout):
 *  - isMobileMenuOpen: boolean
 *  - setIsMobileMenuOpen: fn
 */
export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
  const navigate = useNavigate();

  const closeIfMobile = () => {
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
     ${isActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50"}`;

  const Section = ({ title, children }) => (
    <div className="mt-4">
      <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="px-2 space-y-1">{children}</div>
    </div>
  );

  return (
    <>
      {/* Contêiner do drawer (mobile) / barra fixa (desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r shadow-sm transform transition-transform
                    md:translate-x-0 md:static md:inset-auto
                    ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Menu lateral"
      >
        {/* Cabeçalho do brand */}
        <div className="h-16 flex items-center px-4 border-b">
          <button
            onClick={() => {
              navigate("/dashboard");
              closeIfMobile();
            }}
            className="flex items-center gap-2"
            aria-label="Ir para Dashboard"
          >
            <div className="h-8 w-8 rounded-lg bg-purple-700" />
            <span className="text-base font-bold text-gray-900">Agendalyn</span>
          </button>
        </div>

        {/* Navegação */}
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto py-3">
          {/* PRINCIPAL */}
          <Section title="Principal">
            <NavLink to="/dashboard" className={linkClass} onClick={closeIfMobile}>
              <LayoutDashboard size={18} /> Dashboard
            </NavLink>

            <NavLink to="/dashboard/schedule" className={linkClass} onClick={closeIfMobile}>
              <Calendar size={18} /> Agenda
            </NavLink>

            <NavLink to="/dashboard/orders" className={linkClass} onClick={closeIfMobile}>
              <ClipboardList size={18} /> Comandas
            </NavLink>

            <NavLink to="/dashboard/clients" className={linkClass} onClick={closeIfMobile}>
              <Users size={18} /> Clientes
            </NavLink>

            <NavLink to="/dashboard/cashier" className={linkClass} onClick={closeIfMobile}>
              <DollarSign size={18} /> Caixa
            </NavLink>
          </Section>

          {/* CADASTROS */}
          <Section title="Cadastros">
            <NavLink to="/dashboard/staff" className={linkClass} onClick={closeIfMobile}>
              <UserCog size={18} /> Colaboradores
            </NavLink>

            <NavLink to="/dashboard/services" className={linkClass} onClick={closeIfMobile}>
              <ClipboardCheck size={18} /> Serviços
            </NavLink>

            <NavLink to="/dashboard/products" className={linkClass} onClick={closeIfMobile}>
              <ShoppingCart size={18} /> Produtos
            </NavLink>

            <NavLink to="/dashboard/categories" className={linkClass} onClick={closeIfMobile}>
              <Tag size={18} /> Categorias
            </NavLink>

            <NavLink to="/dashboard/brands" className={linkClass} onClick={closeIfMobile}>
              <Boxes size={18} /> Marcas
            </NavLink>

            <NavLink to="/dashboard/packages" className={linkClass} onClick={closeIfMobile}>
              <Package size={18} /> Pacotes
            </NavLink>

            <NavLink to="/dashboard/anamnesis" className={linkClass} onClick={closeIfMobile}>
              <ListChecks size={18} /> Anamneses
            </NavLink>

            <NavLink to="/dashboard/waitlist" className={linkClass} onClick={closeIfMobile}>
              <Users size={18} /> Lista de Espera
            </NavLink>
          </Section>

          {/* FINANCEIRO */}
          <Section title="Financeiro">
            <NavLink to="/dashboard/payables" className={linkClass} onClick={closeIfMobile}>
              <Wallet size={18} /> Contas a Pagar
            </NavLink>

            <NavLink to="/dashboard/receivables" className={linkClass} onClick={closeIfMobile}>
              <CreditCard size={18} /> Contas a Receber
            </NavLink>

            <NavLink to="/dashboard/finance-categories" className={linkClass} onClick={closeIfMobile}>
              <Landmark size={18} /> Categorias Financeiras
            </NavLink>

            <NavLink to="/dashboard/suppliers" className={linkClass} onClick={closeIfMobile}>
              <Truck size={18} /> Fornecedores
            </NavLink>

            <NavLink to="/dashboard/payment-methods" className={linkClass} onClick={closeIfMobile}>
              <CreditCard size={18} /> Formas de Pagamento
            </NavLink>
          </Section>

          {/* RELATÓRIOS / METAS */}
          <Section title="Relatórios">
            <NavLink to="/dashboard/reports" className={linkClass} onClick={closeIfMobile}>
              <FileBarChart size={18} /> Relatórios
            </NavLink>

            <NavLink to="/dashboard/reports/birthdays" className={linkClass} onClick={closeIfMobile}>
              <BarChart3 size={18} /> Aniversariantes
            </NavLink>

            <NavLink to="/dashboard/reports/cashflow" className={linkClass} onClick={closeIfMobile}>
              <BarChart3 size={18} /> Fluxo de Caixa
            </NavLink>

            <NavLink to="/dashboard/goals" className={linkClass} onClick={closeIfMobile}>
              <Target size={18} /> Metas
            </NavLink>
          </Section>

          {/* CONFIGURAÇÕES */}
          <Section title="Configurações">
            <NavLink to="/dashboard/settings" className={linkClass} onClick={closeIfMobile}>
              <Settings size={18} /> Configurações
            </NavLink>

            <NavLink to="/dashboard/cancellation-reasons" className={linkClass} onClick={closeIfMobile}>
              <ClipboardList size={18} /> Motivos de Cancelamento
            </NavLink>

            <NavLink to="/dashboard/client-origins" className={linkClass} onClick={closeIfMobile}>
              <Users size={18} /> Origens de Cliente
            </NavLink>
          </Section>
        </nav>
      </aside>

      {/* Zona clicável para fechar o drawer no mobile (o overlay já é criado no AdminLayout) */}
      {/* Mantemos somente o aside aqui. O overlay está no AdminLayout para evitar duplicidade. */}
    </>
  );
}
