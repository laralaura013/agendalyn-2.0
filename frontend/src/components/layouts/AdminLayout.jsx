import React, { useMemo, useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import Sidebar from '../dashboard/Sidebar';

/** Título dinâmico por rota */
function usePageTitle() {
  const { pathname } = useLocation();

  const title = useMemo(() => {
    const table = [
      { re: /^\/dashboard$/, label: 'Dashboard' },
      { re: /^\/dashboard\/schedule/, label: 'Agenda' },
      { re: /^\/dashboard\/orders/, label: 'Comandas' },
      { re: /^\/dashboard\/clients(\/|$)/, label: 'Clientes' },
      { re: /^\/dashboard\/staff/, label: 'Colaboradores' },
      { re: /^\/dashboard\/services/, label: 'Serviços' },
      { re: /^\/dashboard\/products/, label: 'Produtos' },
      { re: /^\/dashboard\/categories/, label: 'Categorias' },
      { re: /^\/dashboard\/brands/, label: 'Marcas' },
      { re: /^\/dashboard\/reports\/birthdays/, label: 'Aniversariantes' },
      { re: /^\/dashboard\/reports/, label: 'Relatórios' },
      { re: /^\/dashboard\/commissions/, label: 'Comissões' },
      { re: /^\/dashboard\/cashier/, label: 'Caixa' },
      { re: /^\/dashboard\/goals/, label: 'Metas' },
      { re: /^\/dashboard\/anamnesis/, label: 'Anamneses' },
      { re: /^\/dashboard\/packages/, label: 'Pacotes' },
      { re: /^\/dashboard\/waitlist/, label: 'Lista de Espera' },

      // 🆕 Financeiro/Configurações Sprint 1
      { re: /^\/dashboard\/payables/, label: 'Contas a Pagar' },
      { re: /^\/dashboard\/receivables/, label: 'Contas a Receber' },
      { re: /^\/dashboard\/finance-categories/, label: 'Categorias Financeiras' },
      { re: /^\/dashboard\/suppliers/, label: 'Fornecedores' },
      { re: /^\/dashboard\/payment-methods/, label: 'Formas de Pagamento' },
      { re: /^\/dashboard\/cancellation-reasons/, label: 'Motivos de Cancelamento' },
      { re: /^\/dashboard\/client-origins/, label: 'Origens de Cliente' },

      { re: /^\/dashboard\/settings/, label: 'Configurações' },
    ];
    const found = table.find((t) => t.re.test(pathname));
    return found ? found.label : 'Dashboard';
  }, [pathname]);

  return title;
}

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const title = usePageTitle();

  useEffect(() => {
    document.title = `${title} · Agendalyn`;
  }, [title]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/portal/login/cmdep95530000pspaolfy7dod');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col ml-0 md:ml-64">
        <header className="flex items-center justify-between bg-white border-b border-gray-200 h-16 px-4 sm:px-6">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-600 focus:outline-none md:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>

          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
            {title}
          </h1>

          <button
            onClick={handleLogout}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <LogOut size={20} className="mr-1" /> Sair
          </button>
        </header>

        <main className="flex-1 overflow-y-auto py-6">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
