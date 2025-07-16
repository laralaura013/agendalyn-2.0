import React, { useState } from 'react';
import CashierControl from '../components/cashier/CashierControl';

const Cashier = () => {
  const [session, setSession] = useState({ status: 'CLOSED' });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Controle de Caixa</h1>
      <CashierControl session={session} setSession={setSession} />
      
      {session.status === 'OPEN' && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold">Transações do Turno</h2>
          <div className="bg-white p-4 rounded-lg shadow mt-4">
            {/* Aqui entraria a listagem de transações */}
            <p className="text-gray-500">Nenhuma transação registrada.</p>
          </div>
        </div>
      )}
    </div>
  );
};
export default Cashier;
