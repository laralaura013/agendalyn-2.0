import React, { useState } from 'react';
import Sidebar from '../dashboard/Sidebar'; // ✅ certifique-se que o caminho está correto

const AdminLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex bg-gray-100 min-h-screen relative">
      {/* Overlay para fechar o menu no mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar fixa */}
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* TESTE: Exibir marcador no local da Sidebar */}
      <div className="absolute top-4 left-64 z-50 bg-white text-red-600 font-bold px-2 py-1 shadow-md rounded">
        Sidebar deve estar aqui
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
