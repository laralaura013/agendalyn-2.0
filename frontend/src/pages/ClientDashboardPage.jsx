import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ClientDashboardPage = () => {
    const [clientData, setClientData] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Pega nos dados do cliente guardados no login
        const storedClientData = JSON.parse(localStorage.getItem('clientData'));
        setClientData(storedClientData);

        const fetchAppointments = async () => {
            try {
                // Adiciona o token do cliente ao cabeçalho para este pedido específico
                const clientToken = localStorage.getItem('clientToken');
                const response = await api.get('/portal/my-appointments', {
                    headers: { Authorization: `Bearer ${clientToken}` }
                });
                setAppointments(response.data);
            } catch (error) {
                toast.error("Não foi possível carregar os seus agendamentos.");
            } finally {
                setLoading(false);
            }
        };

        if (storedClientData) {
            fetchAppointments();
        } else {
            setLoading(false);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('clientToken');
        localStorage.removeItem('clientData');
        window.location.href = '/'; // Redireciona para a página inicial
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Olá, {clientData?.name}!</h1>
                        <p className="text-gray-500">Bem-vindo(a) ao seu portal.</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50"
                    >
                        Sair
                    </button>
                </header>

                <main className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Seus Próximos Agendamentos</h2>
                    {loading ? (
                        <p>A carregar agendamentos...</p>
                    ) : appointments.length > 0 ? (
                        <ul className="space-y-4">
                            {appointments.map(apt => (
                                <li key={apt.id} className="p-4 border rounded-md flex flex-col sm:flex-row justify-between sm:items-center">
                                    <div>
                                        <p className="font-semibold text-purple-800">{apt.service.name}</p>
                                        <p className="text-sm text-gray-600">Com {apt.user.name}</p>
                                    </div>
                                    <div className="text-left sm:text-right mt-2 sm:mt-0">
                                        <p className="font-medium">{format(new Date(apt.start), "EEEE, dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                                        <p className="text-sm text-gray-600">às {format(new Date(apt.start), "HH:mm", { locale: ptBR })}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">Você ainda não tem agendamentos futuros.</p>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ClientDashboardPage;