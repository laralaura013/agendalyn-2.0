import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import Sidebar from '../dashboard/Sidebar';
import MobileShell from '../mobile/MobileShell';

/** Detecta viewport móvel (<= 767px) */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener?.('change', onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.('change', onChange);
      mq.removeListener?.(onChange);
    };
  }, []);
  return isMobile;
}

/** Título dinâmico por rota */
function usePageTitle() {
  const { pathname } = useLocation();
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
    { re: /^\/dashboard\/cashier/, label: 'Caixa' },
    { re: /^\/dashboard\/goals/, label: 'Metas' },
    { re: /^\/dashboard\/anamnesis/, label: 'Anamneses' },
    { re: /^\/dashboard\/packages/, label: 'Pacotes' },
    { re: /^\/dashboard\/waitlist/, label: 'Lista de Espera' },
    { re: /^\/dashboard\/reports\/birthdays/, label: 'Aniversariantes' },
    { re: /^\/dashboard\/reports/, label: 'Relatórios' },
    { re: /^\/dashboard\/payables/, label: 'Contas a Pagar' },
    { re: /^\/dashboard\/receivables/, label: 'Contas a Receber' },
    { re: /^\/dashboard\/finance-categories/, label: 'Categorias Financeiras' },
    { re: /^\/dashboard\/suppliers/, label: 'Fornecedores' },
    { re: /^\/dashboard\/payment-methods/, label: 'Formas de Pagamento' },
    { re: /^\/dashboard\/cancellation-reasons/, label: 'Motivos de Cancelamento' },
    { re: /^\/dashboard\/client-origins/, label: 'Origens de Cliente' },
    { re: /^\/dashboard\/settings/, label: 'Configurações' },
    { re: /^\/settings$/, label: 'Configurações' },
  ];
  const found = table.find(t => t.re.test(pathname));
  return found ? found.label : 'Dashboard';
}

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const title = usePageTitle();
  const isMobile = useIsMobile();

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

  // MOBILE → MobileShell (sem header/“tarja”)
  if (isMobile) return <MobileShell />;

  // DESKTOP (FULL WIDTH)
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Overlay para fechar a sidebar no mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar fixa */}
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col ml-0 md:ml-64">
        {/* Header (desktop) */}
        <header className="flex items-center justify-between bg-white border-b border-gray-200 h-16 px-4 sm:px-6 lg:px-8">
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

        {/* Área das rotas — sem wrappers de max-width */}
        <main className="flex-1 min-w-0 overflow-y-auto py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
