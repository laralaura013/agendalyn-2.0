import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
      { re: /^\/dashboard\/cashier/, label: 'Caixa' },
      { re: /^\/dashboard\/staff/, label: 'Colaboradores' },
      { re: /^\/dashboard\/services/, label: 'Serviços' },
      { re: /^\/dashboard\/products/, label: 'Produtos' },
      { re: /^\/dashboard\/categories/, label: 'Categorias' },
      { re: /^\/dashboard\/brands/, label: 'Marcas' },
      { re: /^\/dashboard\/packages/, label: 'Pacotes' },
      { re: /^\/dashboard\/anamnesis/, label: 'Anamneses' },
      { re: /^\/dashboard\/waitlist/, label: 'Lista de Espera' },
      { re: /^\/dashboard\/reports(\/|$)/, label: 'Relatórios' },
      { re: /^\/dashboard\/reports\/birthdays/, label: 'Aniversariantes' },
      { re: /^\/dashboard\/reports\/cashflow/, label: 'Fluxo de Caixa' },
      { re: /^\/dashboard\/payables/, label: 'Contas a Pagar' },
      { re: /^\/dashboard\/receivables/, label: 'Contas a Receber' },
      { re: /^\/dashboard\/finance-categories/, label: 'Categorias Financeiras' },
      { re: /^\/dashboard\/suppliers/, label: 'Fornecedores' },
      { re: /^\/dashboard\/payment-methods/, label: 'Formas de Pagamento' },
      { re: /^\/dashboard\/goals/, label: 'Metas' },
      { re: /^\/dashboard\/settings/, label: 'Configurações' },
      { re: /^\/settings$/, label: 'Configurações' },
    ];
    const found = table.find((t) => t.re.test(pathname));
    return found ? found.label : 'Dashboard';
  }, [pathname]);
  return title;
}

export default function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const title = usePageTitle();

  useEffect(() => {
    document.title = `${title} · Agendalyn`;
  }, [title]);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('clientToken');
    } catch {}
    navigate('/portal/login/cmdep95530000pspaolfy7dod');
  }, [navigate]);

  return (
    <div className="relative min-h-screen flex bg-gray-50">
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      
      {/* Conteúdo principal que ocupa o espaço restante */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="flex-shrink-0 flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-gray-500 md:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>
          
          {/* Título da página (visível apenas em telas maiores) */}
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </header>

        {/* Conteúdo da Página com scroll próprio */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
           <Outlet />
        </main>
      </div>
    </div>
  );
}
