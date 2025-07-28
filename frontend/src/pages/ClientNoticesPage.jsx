import React from 'react';
import ClientLayout from '../components/layouts/ClientLayout';

const mockNotices = [
  { id: 1, title: 'Agendamento confirmado!', message: 'Seu horário foi confirmado para 28/07 às 14h.' },
  { id: 2, title: 'Promoção de pacote', message: 'Compre 5 sessões e ganhe +1 grátis até 31/07!' },
];

const ClientNoticesPage = () => {
  return (
    <ClientLayout>
      <h1 className="text-2xl font-bold mb-4 text-purple-700">Avisos</h1>
      {mockNotices.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhuma notificação encontrada.</p>
      ) : (
        <ul className="space-y-4">
          {mockNotices.map((notice) => (
            <li key={notice.id} className="p-4 bg-white rounded-lg shadow">
              <h3 className="text-lg font-semibold">{notice.title}</h3>
              <p className="text-sm text-gray-600">{notice.message}</p>
            </li>
          ))}
        </ul>
      )}
    </ClientLayout>
  );
};

export default ClientNoticesPage;
