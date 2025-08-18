import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Calendar, ClipboardList, Users, UserCog, Settings,
  Package, Tag, ShoppingCart, Boxes, DollarSign, Wallet, CreditCard,
  Landmark, Truck, FileBarChart, BarChart3, Target, ListChecks
} from "lucide-react";

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
  const navigate = useNavigate();
  const closeIfMobile = () => setIsMobileMenuOpen?.(false);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
      isActive
        ? "bg-slate-800 text-white"
        : "text-slate-200 hover:bg-slate-800/60"
    }`;

  const Section = ({ title, children }) => (
    <div className="mt-4">
      <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </div>
      <div className="px-2 space-y-1">{children}</div>
    </div>
  );

  return (
    <>
      {/* Overlay para fechar o menu no mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={[
          // Mobile: Fixo, desliza para dentro/fora
          "fixed inset-y-0 left-0 z-30 w-64",
          "bg-slate-900 text-slate-100 border-r border-slate-800",
          "transform transition-transform duration-300 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: Relativo, sempre visível e parte do fluxo
          "md:relative md:translate-x-0 md:flex-shrink-0"
        ].join(" ")}
        aria-label="Menu lateral"
      >
        <div className="h-16 flex items-center px-4 border-b border-slate-800">
          <button
            onClick={() => { navigate("/dashboard"); closeIfMobile(); }}
            className="flex items-center gap-2"
            aria-label="Ir para Dashboard"
          >
            <div className="h-8 w-8 rounded-lg bg-purple-600" />
            <span className="text-base font-bold text-white">Agendalyn</span>
          </button>
        </div>

        <nav className="h-[calc(100vh-4rem)] overflow-y-auto py-3">
            <Section title="Principal">
                <NavLink to="/dashboard" className={linkClass} onClick={closeIfMobile} end><LayoutDashboard size={18} /> Dashboard</NavLink>
                <NavLink to="/dashboard/schedule" className={linkClass} onClick={closeIfMobile}><Calendar size={18} /> Agenda</NavLink>
                <NavLink to="/dashboard/orders" className={linkClass} onClick={closeIfMobile}><ClipboardList size={18} /> Comandas</NavLink>
                <NavLink to="/dashboard/clients" className={linkClass} onClick={closeIfMobile}><Users size={18} /> Clientes</NavLink>
                <NavLink to="/dashboard/cashier" className={linkClass} onClick={closeIfMobile}><DollarSign size={18} /> Caixa</NavLink>
            </Section>
            <Section title="Cadastros">
                <NavLink to="/dashboard/staff" className={linkClass} onClick={closeIfMobile}><UserCog size={18} /> Colaboradores</NavLink>
                <NavLink to="/dashboard/services" className={linkClass} onClick={closeIfMobile}><ListChecks size={18} /> Serviços</NavLink>
                <NavLink to="/dashboard/products" className={linkClass} onClick={closeIfMobile}><ShoppingCart size={18} /> Produtos</NavLink>
                <NavLink to="/dashboard/categories" className={linkClass} onClick={closeIfMobile}><Tag size={18} /> Categorias</NavLink>
                <NavLink to="/dashboard/brands" className={linkClass} onClick={closeIfMobile}><Boxes size={18} /> Marcas</NavLink>
                <NavLink to="/dashboard/packages" className={linkClass} onClick={closeIfMobile}><Package size={18} /> Pacotes</NavLink>
                <NavLink to="/dashboard/anamnesis" className={linkClass} onClick={closeIfMobile}><ListChecks size={18} /> Anamneses</NavLink>
                <NavLink to="/dashboard/waitlist" className={linkClass} onClick={closeIfMobile}><Users size={18} /> Lista de Espera</NavLink>
            </Section>
            <Section title="Financeiro">
                <NavLink to="/dashboard/payables" className={linkClass} onClick={closeIfMobile}><Wallet size={18} /> Contas a Pagar</NavLink>
                <NavLink to="/dashboard/receivables" className={linkClass} onClick={closeIfMobile}><CreditCard size={18} /> Contas a Receber</NavLink>
                <NavLink to="/dashboard/finance-categories" className={linkClass} onClick={closeIfMobile}><Landmark size={18} /> Categorias Financeiras</NavLink>
                <NavLink to="/dashboard/suppliers" className={linkClass} onClick={closeIfMobile}><Truck size={18} /> Fornecedores</NavLink>
                <NavLink to="/dashboard/payment-methods" className={linkClass} onClick={closeIfMobile}><CreditCard size={18} /> Formas de Pagamento</NavLink>
            </Section>
            <Section title="Relatórios">
                <NavLink to="/dashboard/reports" className={linkClass} onClick={closeIfMobile}><FileBarChart size={18} /> Relatórios</NavLink>
                <NavLink to="/dashboard/reports/birthdays" className={linkClass} onClick={closeIfMobile}><BarChart3 size={18} /> Aniversariantes</NavLink>
                <NavLink to="/dashboard/reports/cashflow" className={linkClass} onClick={closeIfMobile}><BarChart3 size={18} /> Fluxo de Caixa</NavLink>
                <NavLink to="/dashboard/goals" className={linkClass} onClick={closeIfMobile}><Target size={18} /> Metas</NavLink>
            </Section>
            <Section title="Configurações">
                <NavLink to="/dashboard/settings" className={linkClass} onClick={closeIfMobile}><Settings size={18} /> Configurações</NavLink>
            </Section>
        </nav>
      </aside>
    </>
  );
}
