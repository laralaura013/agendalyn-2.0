import React from 'react';
import { Menu, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ toggleMobileMenu }) => {
    const { user, logout } = useAuth();

    return (
        <header className="flex justify-between items-center p-4 bg-white border-b shadow-sm">
            {/* Ícone para o menu móvel */}
            <button onClick={toggleMobileMenu} className="text-gray-600 md:hidden">
                <Menu size={24} />
            </button>

            {/* Espaço em branco para empurrar o menu do utilizador para a direita */}
            <div className="flex-1"></div>

            {/* Menu do Utilizador */}
            <div className="relative">
                <div className="flex items-center space-x-3 cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-sm">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.role === 'OWNER' ? 'Administrador' : 'Colaborador'}</p>
                    </div>
                    <ChevronDown size={18} className="text-gray-500" />

                    {/* Menu Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                        <div className="py-1">
                            <button
                                onClick={logout}
                                className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <LogOut size={16} className="mr-2" />
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
