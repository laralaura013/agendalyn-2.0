import React from 'react';

const ClientDashboardPage = () => {

    const handleLogout = () => {
        localStorage.removeItem('clientToken');
        localStorage.removeItem('clientData');
        window.location.href = '/'; // Redireciona para a página inicial
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">
                        Painel do Cliente (Página de Teste)
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50"
                    >
                        Sair
                    </button>
                </header>

                <main className="bg-white p-6 rounded-lg shadow-md">
                    <p>Se você está a ver esta mensagem, a rota e o componente estão a funcionar!</p>
                </main>
            </div>
        </div>
    );
};

export default ClientDashboardPage;