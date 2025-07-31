import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const DashboardLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                    {/* O <Outlet /> é o que renderiza o conteúdo da página específica (Dashboard, Agenda, etc.) */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
