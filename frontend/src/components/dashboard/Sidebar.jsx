// frontend/src/components/dashboard/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, CalendarDays, ClipboardList, Package, Users, UserCog,
  Scissors, Box, Folder, Bookmark, Truck, BarChart3, ArrowRightLeft,
  Wallet, Target, FileText, CreditCard, Settings, X
} from 'lucide-react';

const menuGroups = [
  {
    title: 'PRINCIPAL',
    items: [
      { name: 'Painel', icon: <LayoutDashboard size={18} />, path: '/dashboard' },
      { name: 'Agenda', icon: <CalendarDays size={18} />, path: '/dashboard/schedule' },
      { name: 'Comandas', icon: <ClipboardList size={18} />, path: '/dashboard/orders' },
      { name: 'Pacotes', icon: <Package size={18} />, path: '/dashboard/packages' },
      // { name: 'Lista de Espera', icon: <CalendarDays size={18} />, path: '/dashboard/waitlist' },
    ],
  },
  {
    title: 'CADASTROS',
    items: [
      { name: 'Clientes', icon: <Users size={18} />, path: '/dashboard/clients' },
      { name: 'Colaboradores', icon: <UserCog size={18} />, path: '/dashboard/staff' },
      { name: 'Serviços', icon: <Scissors size={18} />, path: '/dashboard/services' },
      { name: 'Produtos', icon: <Box size={18} />, path: '/dashboard/products' },
      { name: 'Categorias', icon: <Folder size={18} />, path: '/dashboard/categories' },
      { name: 'Marcas', icon: <Bookmark size={18} />, path: '/dashboard/brands' },

      // Cadastros financeiros (OWNER)
      { name: 'Fornecedores', icon: <Truck size={18} />, path: '/dashboard/suppliers', allowedRoles: ['OWNER'] },
      { name: 'Formas de Pagamento', icon: <CreditCard size={18} />, path: '/dashboard/payment-methods', allowedRoles: ['OWNER'] },
      { name: 'Categorias Financeiras', icon: <BarChart3 size={18} />, path: '/dashboard/finance-categories', allowedRoles: ['OWNER'] },
    ],
  },
  {
    title: 'FINANCEIRO',
    items: [
      // Operação liberada para STAFF também (delete segue OWNER no backend)
      { name: 'Pagar', icon: <Wallet size={18} />, path: '/dashboard/payables' },
      { name: 'Receber', icon: <Wallet size={18} />, path: '/dashboard/receivables' },

      // 🔁 agora aponta direto para o relatório de Fluxo de Caixa
      { name: 'Relatórios', icon: <BarChart3 size={18} />, path: '/dashboard/reports/cashflow', allowedRoles: ['OWNER'] },
      { name: 'Comissões', icon: <ArrowRightLeft size={18} />, path: '/dashboard/commissions', allowedRoles: ['OWNER'] },
      { name: 'Caixa', icon: <Wallet size={18} />, path: '/dashboard/cashier' },
    ],
  },
  {
    title: 'CONTROLE',
    items: [
      { name: 'Metas', icon: <Target size={18} />, path: '/dashboard/goals', allowedRoles: ['OWNER'] },
      { name: 'Anamneses', icon: <FileText size={18} />, path: '/dashboard/anamnesis' },
      // { name: 'Compras', icon: <ShoppingCart size={18} />, path: '/dashboard/purchases' }, // adicionar quando a rota existir
    ],
  },
  {
    title: 'CONTA',
    items: [
      { name: 'Assinatura', icon: <CreditCard size={18} />, path: '/dashboard/subscription', allowedRoles: ['OWNER'] },
    ]
  },
  {
    title: 'CONFIGURAÇÕES',
    items: [
      { name: 'Motivos de Cancelamento', icon: <Settings size={18} />, path: '/dashboard/cancellation-reasons', allowedRoles: ['OWNER'] },
      { name: 'Origens de Cliente', icon: <Settings size={18} />, path: '/dashboard/client-origins', allowedRoles: ['OWNER'] },
      { name: 'Empresa', icon: <Settings size={18} />, path: '/dashboard/settings', allowedRoles: ['OWNER'] },
    ]
  }
];

const NavItem = ({ item, onNavigate }) => (
  <NavLink
    to={item.path}
    end={item.path === '/dashboard'}
    onClick={onNavigate}
    className={({ isActive }) =>
      [
        'relative flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-200',
        isActive
          ? 'bg-gray-900 text-white border-l-4 border-indigo-400'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      ].join(' ')
    }
  >
    <span className="mr-3">{item.icon}</span>
    {item.name}
  </NavLink>
);

const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { user } = useAuth();

  const handleNavigate = () => {
    // fecha o menu no mobile após clicar em um item
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      aria-label="Menu lateral"
    >
      {/* Header da sidebar */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700 shrink-0">
        <span className="text-xl font-bold">Agendalyn</span>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden text-gray-400 hover:text-white"
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Menu scrollável */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <h3 className="px-4 mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isAllowed = !item.allowedRoles || item.allowedRoles.includes(user?.role);
                return isAllowed ? (
                  <NavItem key={item.name} item={item} onNavigate={handleNavigate} />
                ) : null;
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
