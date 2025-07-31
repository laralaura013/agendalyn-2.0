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
        {/* ❌ Removido header duplicado */}

        <main className="flex-1 p-4 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
