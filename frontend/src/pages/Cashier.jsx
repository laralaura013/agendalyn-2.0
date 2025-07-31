import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AdminLayout from '../components/layouts/AdminLayout';

const Cashier = () => {
  const [cashierState, setCashierState] = useState({ isOpen: false, session: null });
  const [loading, setLoading] = useState(true);

  const fetchCashierStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/cashier/status');
      setCashierState(response.data);
    } catch (error) {
      console.error("Erro ao buscar status do caixa:", error);
      alert("Não foi possível carregar o status do caixa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCashierStatus();
  }, [fetchCashierStatus]);

  const handleOpenCashier = async () => {
    const openingBalance = prompt("Digite o valor de abertura do caixa (fundo de troco):", "0.00");
    if (openingBalance === null) return;

    try {
      await api.post('/cashier/open', { openingBalance: parseFloat(openingBalance) });
      fetchCashierStatus();
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Não foi possível abrir o caixa.";
      alert(errorMessage);
    }
  };

  const handleCloseCashier = async () => {
    if (window.confirm("Tem certeza que deseja fechar o caixa? Esta ação não pode ser desfeita.")) {
      try {
        await api.post('/cashier/close');
        fetchCashierStatus();
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Não foi possível fechar o caixa.";
        alert(errorMessage);
      }
    }
  };

  if (loading) return (
    <AdminLayout>
      <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
        <p className="text-gray-500">Carregando informações do caixa...</p>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Controle de Caixa</h1>

        {cashierState.isOpen ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
              <h2 className="text-xl font-semibold text-green-600">Caixa Aberto</h2>
              <button
                onClick={handleCloseCashier}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
              >
                Fechar Caixa
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-500">Saldo Inicial</p>
                <p className="text-2xl font-bold">
                  R$ {Number(cashierState.session.openingBalance).toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-500">Receitas (Comandas)</p>
                <p className="text-2xl font-bold text-green-500">
                  R$ {
                    cashierState.session.transactions
                      .filter(t => t.type === 'INCOME')
                      .reduce((sum, t) => sum + Number(t.amount), 0)
                      .toFixed(2)
                  }
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-10 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">O caixa está fechado</h2>
            <p className="text-gray-500 mb-6">Abra o caixa para começar a registrar as vendas do dia.</p>
            <button
              onClick={handleOpenCashier}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-lg"
            >
              Abrir Caixa
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Cashier;
