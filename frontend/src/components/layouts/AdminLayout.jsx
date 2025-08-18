import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import Sidebar from '../dashboard/Sidebar';

/** Título dinâmico por rota */
function usePageTitle() {
  const { pathname } = useLocation();

  const title = useMemo(() => {
    const table = [
      // Core
      { re: /^\/dashboard$/, label: 'Dashboard' },
      { re: /^\/dashboard\/schedule/, label: 'Agenda' },
      { re: /^\/dashboard\/orders/, label: 'Comandas' },
      { re: /^\/dashboard\/clients(\/|$)/, label: 'Clientes' },
      { re: /^\/dashboard\/cashier/, label: 'Caixa' },

      // Cadastros
      { re: /^\/dashboard\/staff/, label: 'Colaboradores' },
      { re: /^\/dashboard\/services/, label: 'Serviços' },
      { re: /^\/dashboard\/products/, label: 'Produtos' },
      { re: /^\/dashboard\/categories/, label: 'Categorias' },
      { re: /^\/dashboard\/brands/, label: 'Marcas' },

      // Outras áreas
      { re: /^\/dashboard\/packages/, label: 'Pacotes' },
      { re: /^\/dashboard\/anamnesis/, label: 'Anamneses' },
      { re: /^\/dashboard\/waitlist/, label: 'Lista de Espera' },
      { re: /^\/dashboard\/reports\/birthdays/, label: 'Aniversariantes' },
      { re: /^\/dashboard\/reports/, label: 'Relatórios' },

      // Financeiro
      { re: /^\/dashboard\/payables/, label: 'Contas a Pagar' },
      { re: /^\/dashboard\/receivables/, label: 'Contas a Receber' },
      { re: /^\/dashboard\/finance-categories/, label: 'Categorias Financeiras' },
      { re: /^\/dashboard\/suppliers/, label: 'Fornecedores' },
      { re: /^\/dashboard\/payment-methods/, label: 'Formas de Pagamento' },

      // Settings
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
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Overlay para fechar a sidebar no mobile */}
      {isMobileMenuOpen && (
        <button
          aria-label="Fechar menu"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar fixa (desktop) / deslizante (mobile) */}
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header único e fixo */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <button
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            className="md:hidden text-gray-600"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>

          <h1 className="truncate text-base sm:text-lg font-semibold text-gray-800">
            {title}
          </h1>

          <button
            onClick={handleLogout}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <LogOut size={18} className="mr-1" />
            Sair
          </button>
        </header>

        {/* Área das páginas: um único scroll vertical */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Outlet />
        </main>
      </div>
    </div>
  );
}
