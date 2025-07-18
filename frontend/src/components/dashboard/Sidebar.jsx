import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // 1. Importa o useAuth
import {
  LayoutDashboard, CalendarDays, ClipboardList, Package, Users, UserCog,
  Scissors, Box, Folder, Bookmark, Truck, BarChart3, ArrowRightLeft,
  Wallet, Target, FileText, ShoppingCart, CreditCard,
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
      // 2. Adiciona a regra de permissão
      { name: 'Relatórios', icon: <BarChart3 size={18} />, path: '/reports', allowedRoles: ['OWNER'] },
      { name: 'Transações', icon: <ArrowRightLeft size={18} />, path: '/transactions' },
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
  }
];

const NavItem = ({ item }) => (
  <NavLink to={item.path} /* ...código do NavLink como estava antes... */ >
    {/* ... conteúdo do NavItem ... */}
  </NavLink>
);

const Sidebar = () => {
  const { user } = useAuth(); // 3. Obtém o usuário logado

  return (
    <aside className="hidden md:flex flex-col w-64 bg-gray-800 text-white">
      <div className="h-16 flex items-center justify-center text-2xl font-bold border-b border-gray-700">
        Agendalyn
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <h3 className="px-4 mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                // 4. Lógica de renderização condicional
                const isAllowed = !item.allowedRoles || item.allowedRoles.includes(user?.role);
                if (isAllowed) {
                  return <NavItem key={item.name} item={item} />;
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;