import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CalendarDays, LogOut, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ClientDashboardPage = () => {
  const navigate = useNavigate();
  const [clientData, setClientData] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    const clientInfo = JSON.parse(localStorage.getItem('clientData'));
    if (!token || !clientInfo) {
      navigate('/portal/login/');
      return;
    }
    setClientData(clientInfo);
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('clientToken');
      const response = await api.get('/portal/appointments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(response.data);
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientData');
    navigate('/portal/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-purple-700">Olá, {clientData?.name}</h1>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-500 hover:underline">
            <LogOut size={16} /> Sair
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-purple-600" /> Meus Agendamentos
          </h2>

          {appointments.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum agendamento encontrado.</p>
          ) : (
            <ul className="space-y-4">
              {appointments.map((appt) => (
                <li key={appt.id} className="p-4 border rounded-lg">
                  <p className="font-medium">{appt.serviceName}</p>
                  <p className="text-sm text-gray-500">{appt.staffName}</p>
                  <p className="text-sm text-gray-700 mt-1 flex items-center gap-1">
                    <Clock size={14} />
                    {format(parseISO(appt.dateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardPage;
