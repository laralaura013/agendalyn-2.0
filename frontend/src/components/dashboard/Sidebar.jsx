import React from 'react';
import { NavLink, BrowserRouter } from 'react-router-dom'; // Importa o BrowserRouter
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Package,
  Users,
  UserCog,
  Scissors,
  Box,
  Folder,
  Bookmark,
  Truck,
  BarChart3,
  ArrowRightLeft,
  Wallet,
  Target,
  FileText,
  ShoppingCart,
  CreditCard, // Ícone para Assinatura
} from 'lucide-react';

// --- Estrutura de dados para os itens do menu ---
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
      { name: 'Relatórios', icon: <BarChart3 size={18} />, path: '/reports' },
      { name: 'Transações', icon: <ArrowRightLeft size={18} />, path: '/transactions' },
      { name: 'Caixa', icon: <Wallet size={18} />, path: '/cashier' },
    ],
  },
  {
    title: 'CONTROLE',
    items: [
      { name: 'Metas', icon: <Target size={18} />, path: '/goals' },
      { name: 'Anamneses', icon: <FileText size={18} />, path: '/anamnesis' },
      { name: 'Compras', icon: <ShoppingCart size={18} />, path: '/purchases' },
    ],
  },
  // --- NOVA SECÇÃO ADICIONADA ---
  {
    title: 'CONTA',
    items: [
        { name: 'Assinatura', icon: <CreditCard size={18} />, path: '/subscription' },
    ]
  }
];

// --- Componente para um único item do menu ---
const NavItem = ({ item }) => (
  <NavLink
    to={item.path}
    className={({ isActive }) =>
      `flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-200 ${
        isActive
          ? 'bg-gray-900 text-white' // Estilo do item ativo
          : 'text-gray-300 hover:bg-gray-700 hover:text-white' // Estilo do item inativo
      }`
    }
  >
    <span className="mr-3">{item.icon}</span>
    {item.name}
  </NavLink>
);

// --- Componente principal da Sidebar (para ser importado em outros arquivos) ---
const Sidebar = () => {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-gray-800 text-white">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center text-2xl font-bold border-b border-gray-700">
        Agendalyn
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.title} className="mb-6">
            {/* Título da Seção */}
            <h3 className="px-4 mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              {group.title}
            </h3>
            {/* Itens da Seção */}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

// --- Componente App para demonstração (CORREÇÃO) ---
// Este componente envolve a Sidebar com o BrowserRouter para corrigir o erro
// quando este arquivo é visualizado isoladamente.
const App = () => {
    return (
        <BrowserRouter>
            <div className="flex h-screen bg-gray-100">
                <Sidebar />
                <main className="flex-1 p-8">
                    <h1 className="text-2xl font-bold">Conteúdo Principal</h1>
                    <p>Selecione um item no menu lateral.</p>
                </main>
            </div>
        </BrowserRouter>
    );
};

export default App;
