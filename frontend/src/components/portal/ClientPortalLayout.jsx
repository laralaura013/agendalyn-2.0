import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

const ClientPortalLayout = () => {
    const clientData = JSON.parse(localStorage.getItem('clientData'));

    const handleLogout = () => {
        localStorage.removeItem('clientToken');
        localStorage.removeItem('clientData');
        window.location.href = '/';
    };

    const linkClass = "px-4 py-2 rounded-md text-sm font-medium transition-colors";
    const activeLinkClass = "bg-purple-100 text-purple-800";
    const inactiveLinkClass = "text-gray-600 hover:bg-gray-100";

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Olá, {clientData?.name}!</h1>
                        <p className="text-gray-500">Bem-vindo(a) ao seu portal.</p>
                    </div>
                    <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50">
                        Sair
                    </button>
                </header>

                <nav className="flex items-center gap-4 mb-6 border-b pb-4">
                    <NavLink to="/portal/dashboard" className={({isActive}) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Meus Agendamentos</NavLink>
                    <NavLink to="/portal/packages" className={({isActive}) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Meus Pacotes</NavLink>
                </nav>

                <main>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default ClientPortalLayout;