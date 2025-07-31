import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, CalendarDays, ClipboardList, Package, Users, UserCog,
  Scissors, Box, Folder, Bookmark, Truck, BarChart3, ArrowRightLeft,
  Wallet, Target, FileText, ShoppingCart, CreditCard, Settings, X
} from 'lucide-react';

const menuGroups = [
  {
    title: 'PRINCIPAL',
    items: [
      { name: 'Painel', icon: <LayoutDashboard size={18} />, path: '/dashboard' },
      { name: 'Agenda', icon: <CalendarDays size={18} />, path: '/schedule' },
      { name: 'Comandas', icon: <ClipboardList size={18} />, path: '/orders' },
      { name: 'Pacotes', icon: <Package size={18} />, path: '/packages' },
    ],
  },
  {
    title: 'CADASTROS',
    items: [
      { name: 'Clientes', icon: <Users size={18} />, path: '/clients' },
      { name: 'Colaboradores', icon: <UserCog size={18} />, path: '/staff' },
      { name: 'Serviços', icon: <Scissors size={18} />, path: '/services' },
      { name: 'Produtos', icon: <Box size={18} />, path: '/products' },
      { name: 'Categorias', icon: <Folder size={18} />, path: '/categories' },
      { name: 'Marcas', icon: <Bookmark size={18} />, path: '/brands' },
      { name: 'Fornecedores', icon: <Truck size={18} />, path: '/suppliers' },
    ],
  },
  {
    title: 'FINANCEIRO',
    items: [
      { name: 'Relatórios', icon: <BarChart3 size={18} />, path: '/reports', allowedRoles: ['OWNER'] },
      { name: 'Comissões', icon: <ArrowRightLeft size={18} />, path: '/commissions', allowedRoles: ['OWNER'] },
      { name: 'Caixa', icon: <Wallet size={18} />, path: '/cashier' },
    ],
  },
  {
    title: 'CONTROLE',
    items: [
      { name: 'Metas', icon: <Target size={18} />, path: '/goals', allowedRoles: ['OWNER'] },
      { name: 'Anamneses', icon: <FileText size={18} />, path: '/anamnesis' },
      { name: 'Compras', icon: <ShoppingCart size={18} />, path: '/purchases' },
    ],
  },
  {
    title: 'CONTA',
    items: [
      { name: 'Assinatura', icon: <CreditCard size={18} />, path: '/subscription', allowedRoles: ['OWNER'] },
    ]
  },
  {
    title: 'CONFIGURAÇÕES',
    items: [
      { name: 'Empresa', icon: <Settings size={18} />, path: '/settings', allowedRoles: ['OWNER'] },
    ]
  }
];

const NavItem = ({ item }) => (
  <NavLink
    to={item.path}
    className={({ isActive }) =>
      `flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-200 ${
        isActive
          ? 'bg-gray-900 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`
    }
  >
    <span className="mr-3">{item.icon}</span>
    {item.name}
  </NavLink>
);

const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { user } = useAuth();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static`}
    >
      {/* Header da sidebar */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
        <span className="text-xl font-bold">Agendalyn</span>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <h3 className="px-4 mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isAllowed = !item.allowedRoles || item.allowedRoles.includes(user?.role);
                return isAllowed ? <NavItem key={item.name} item={item} /> : null;
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
