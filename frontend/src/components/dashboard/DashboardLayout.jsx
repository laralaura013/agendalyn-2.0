import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx'; // 1. Importa o novo componente

const DashboardLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar /> {/* 2. Usa o componente aqui */}
      
      <main className="flex-1 p-8 overflow-y-auto">
        {/* O conteúdo da página (ex: Dashboard, Clientes) será renderizado aqui */}
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;