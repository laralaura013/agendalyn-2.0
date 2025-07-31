import React, { useState } from 'react';
import Sidebar from '../dashboard/Sidebar';

const AdminLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="relative flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} />

      {/* Overlay para fechar o menu mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col z-10 relative">
        <main className="flex-1 p-4 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
