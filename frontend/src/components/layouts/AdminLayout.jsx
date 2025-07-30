import React, { useState } from 'react';
import Sidebar from '../dashboard/Sidebar'; // ✅ Caminho corrigido

const AdminLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Overlay para fechar menu no mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col">
        {/* Header com botão de menu no mobile */}
        <header className="md:hidden p-4 bg-white shadow flex items-center justify-between">
          <button
            className="text-gray-700 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}
              viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="font-semibold text-gray-700 text-lg">Painel</div>
        </header>

        {/* Conteúdo renderizado */}
        <main className="flex-1 p-4 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
