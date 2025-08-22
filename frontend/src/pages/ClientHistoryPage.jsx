import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { CalendarDays, User, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


import { asArray } from '../utils/asArray';
const statusMap = {
  CONFIRMED: 'Confirmado',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado'
};

const ClientHistoryPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('clientToken');
        const response = await api.get('/portal/history', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setAppointments(response.data);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return <p className="text-center mt-10 text-gray-500">Carregando histórico...</p>;
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-purple-700 text-center">Histórico de Agendamentos</h2>
      {appointments.length === 0 ? (
        <p className="text-center text-gray-500">Nenhum agendamento encontrado.</p>
      ) : (
        <ul className="space-y-4">
          {asArray(appointments).map((apt) => (
            <li
              key={apt.id}
              className="border rounded-xl p-4 shadow-sm bg-white flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-purple-700">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold">{apt.service?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                {apt.user?.name}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarDays className="w-4 h-4" />
                {format(new Date(apt.start), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
              <span
                className={`text-xs font-bold w-fit px-2 py-1 rounded ${
                  apt.status === 'FINISHED'
                    ? 'bg-green-100 text-green-800'
                    : apt.status === 'CANCELLED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {statusMap[apt.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientHistoryPage;
