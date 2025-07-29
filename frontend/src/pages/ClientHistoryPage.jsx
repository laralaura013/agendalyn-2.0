import React, { useEffect, useState } from 'react';
import { getMyAppointments } from '../services/clientService';
import { isBefore, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const ClientHistoryPage = () => {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMyAppointments();
        const past = data.filter(appt => isBefore(new Date(appt.start), new Date()));
        setAppointments(past);
      } catch {
        toast.error('Erro ao carregar histórico.');
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-purple-700">Histórico</h1>
      {appointments.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhum agendamento anterior encontrado.</p>
      ) : (
        <ul className="space-y-4">
          {appointments.map((appt) => (
            <li key={appt.id} className="p-4 border rounded-lg bg-white shadow">
              <p className="font-medium">{appt.service?.name}</p>
              <p className="text-sm text-gray-500">{appt.user?.name}</p>
              <p className="text-sm text-gray-700 mt-1">
                {format(parseISO(appt.start), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientHistoryPage;
