// frontend/src/components/layouts/AdminLayout.jsx
import React, { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import Sidebar from '../dashboard/Sidebar';

/**
 * Mapeia pathname -> título exibido no header.
 * Você pode ajustar os rótulos conforme suas rotas reais.
 */
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
      { re: /^\/dashboard\/reports/, label: 'Relatórios' },
      { re: /^\/dashboard\/commissions/, label: 'Comissões' },
      { re: /^\/dashboard\/cashier/, label: 'Caixa' },
      { re: /^\/dashboard\/goals/, label: 'Metas' },
      { re: /^\/dashboard\/anamnesis/, label: 'Anamneses' },
      { re: /^\/dashboard\/packages/, label: 'Pacotes' },
      { re: /^\/dashboard\/settings/, label: 'Configurações' },
      { re: /^\/dashboard\/waitlist/, label: 'Lista de Espera' },
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/portal/login/cmdep95530000pspaolfy7dod');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Overlay para fechar a sidebar no mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (componente já existente) */}
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Conteúdo principal
          - Em telas md+ a Sidebar costuma ter largura w-64 => adicionamos ml-64
          - Em mobile (md-) a Sidebar é sobreposta, então ml-0 */}
      <div className="flex-1 flex flex-col ml-0 md:ml-64">
        {/* Header */}
        <header className="flex items-center justify-between bg-white border-b border-gray-200 h-16 px-4 sm:px-6">
          {/* Botão de menu mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-600 focus:outline-none md:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>

          {/* Título dinâmico */}
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
            {title}
          </h1>

          {/* Botão de logout */}
          <button
            onClick={handleLogout}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <LogOut size={20} className="mr-1" /> Sair
          </button>
        </header>

        {/* Área das rotas
            - Centralizada (max-w-7xl) e com padding lateral
            - overflow-y-auto para permitir scroll do conteúdo sem “quebrar” o header */}
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
