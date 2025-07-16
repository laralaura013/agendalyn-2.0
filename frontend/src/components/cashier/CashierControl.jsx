import React, { useState } from 'react';
import Modal from '../dashboard/Modal';
import TransactionForm from './TransactionForm';

const CashierControl = ({ session, setSession }) => {
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');

  const handleOpenCashier = () => {
    // Lógica para chamar a API e abrir o caixa
    console.log('Abrindo caixa com:', openingBalance);
    setSession({ status: 'OPEN', openingBalance: parseFloat(openingBalance), transactions: [] });
    setIsOpeningModalOpen(false);
    setOpeningBalance('');
  };

  const handleCloseCashier = () => {
    // Lógica para chamar a API e fechar o caixa
    console.log('Fechando caixa...');
    if(window.confirm("Tem certeza que deseja fechar o caixa? Esta ação não pode ser desfeita.")) {
        setSession({ status: 'CLOSED' });
    }
  };

  const handleSaveTransaction = (data) => {
    console.log("Nova transação:", data);
    // Lógica para salvar a transação na API
    setIsTransactionModalOpen(false);
  };

  if (session.status === 'CLOSED') {
    return (
      <>
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4">O caixa está fechado.</h2>
          <button onClick={() => setIsOpeningModalOpen(true)} className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105">
            Abrir Caixa
          </button>
        </div>
        <Modal isOpen={isOpeningModalOpen} onClose={() => setIsOpeningModalOpen(false)}>
          <div className="p-4">
            <h3 className="text-xl font-bold mb-4">Abrir Caixa</h3>
            <label className="block text-sm font-medium text-gray-700">Valor de Abertura (Troco)</label>
            <input 
              type="number" 
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full p-2 border rounded mt-2"
              placeholder="Ex: 50.00"
            />
            <button onClick={handleOpenCashier} className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Confirmar Abertura
            </button>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Caixa Aberto</h2>
            <button onClick={handleCloseCashier} className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">
                Fechar Caixa
            </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-gray-100 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-600">Saldo Inicial</h4>
                <p className="text-lg font-bold">R$ {session.openingBalance?.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-green-100 rounded-lg">
                <h4 className="text-sm font-semibold text-green-800">Entradas</h4>
                <p className="text-lg font-bold text-green-800">R$ 0.00</p>
            </div>
            <div className="p-4 bg-red-100 rounded-lg">
                <h4 className="text-sm font-semibold text-red-800">Saídas</h4>
                <p className="text-lg font-bold text-red-800">R$ 0.00</p>
            </div>
            <div className="p-4 bg-blue-100 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800">Saldo Atual</h4>
                <p className="text-lg font-bold text-blue-800">R$ {session.openingBalance?.toFixed(2)}</p>
            </div>
        </div>
        <div className="mt-6 text-center">
            <button onClick={() => setIsTransactionModalOpen(true)} className="px-5 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800">
                Lançar Entrada/Saída
            </button>
        </div>
      </div>
      <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)}>
        <TransactionForm onSave={handleSaveTransaction} onCancel={() => setIsTransactionModalOpen(false)} />
      </Modal>
    </>
  );
};

export default CashierControl;