import React from 'react';
import { Menu } from 'lucide-react';

const Navbar = ({ onMenuClick }) => {
  return (
    <header className="sticky top-0 bg-white shadow-md z-20">
      <div className="flex items-center justify-between h-16 px-4 md:px-8">
        {/* Botão do Menu Hambúrguer (só aparece em telas pequenas) */}
        <button
          onClick={onMenuClick}
          className="md:hidden text-gray-600 hover:text-purple-700"
          aria-label="Abrir menu"
        >
          <Menu size={28} />
        </button>
        
        {/* Espaço reservado para o título da página ou outras informações no futuro */}
        <div className="flex-1"></div>

        {/* Aqui podemos adicionar o nome do utilizador ou um botão de logout no futuro */}
      </div>
    </header>
  );
};

export default Navbar;