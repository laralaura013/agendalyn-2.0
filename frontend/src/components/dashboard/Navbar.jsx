import React from 'react';
import { useAuth } from '../../contexts/AuthContext'; // 1. Importa o useAuth
import { Menu, LogOut } from 'lucide-react'; // 2. Importa o ícone de LogOut

const Navbar = ({ onMenuClick }) => {
  const { logout } = useAuth(); // 3. Pega a função de logout do contexto

  return (
    <header className="sticky top-0 bg-white shadow-md z-20">
      <div className="flex items-center justify-between h-16 px-4 md:px-8">
        {/* Botão do Menu Hambúrguer */}
        <button
          onClick={onMenuClick}
          className="md:hidden text-gray-600 hover:text-purple-700"
          aria-label="Abrir menu"
        >
          <Menu size={28} />
        </button>
        
        {/* Espaço para crescer */}
        <div className="flex-1"></div>

        {/* 4. Adiciona o botão de Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
          aria-label="Sair"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
