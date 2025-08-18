import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const fmtBRL = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Normaliza a resposta do backend para um shape único na UI.
 * Suporta:
 *  - LEGADO: { isOpen, session: { openingBalance, transactions:[{type, amount}, ...] } }
 *  - NOVO:   { isOpen, openedAt?, cashierId?, totalsToday: { income, expense, balance } }
 */
function normalizeStatus(data) {
  const isOpen = !!data?.isOpen;

  if (data?.session) {
    const opening = Number(data.session.openingBalance || 0);
    const income = (data.session.transactions || [])
      .filter((t) => t.type === 'INCOME')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const expense = (data.session.transactions || [])
      .filter((t) => t.type === 'EXPENSE')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const balance = opening + income - expense;

    return {
      isOpen,
      mode: 'legacy',
      openingBalance: opening,
      income,
      expense,
      balance,
      raw: data,
    };
  }

  const t = data?.totalsToday || { income: 0, expense: 0, balance: 0 };
  const income = Number(t.income || 0);
  const expense = Number(t.expense || 0);
  const balance = 'balance' in t ? Number(t.balance || 0) : income - expense;

  return {
    isOpen,
    mode: 'new',
    openingBalance: null,
    income,
    expense,
    balance,
    raw: data,
  };
}

const Cashier = () => {
  const [view, setView] = useState({
    isOpen: false,
    mode: 'legacy',
    openingBalance: null,
    income: 0,
    expense: 0,
    balance: 0,
    raw: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchCashierStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/cashier/status');
      setView(normalizeStatus(res.data || {}));
    } catch (error) {
      console.error('Erro ao buscar status do caixa:', error);
      alert(error?.response?.data?.message || 'Não foi possível carregar o status do caixa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCashierStatus();
  }, [fetchCashierStatus]);

  useEffect(() => {
    const handler = () => fetchCashierStatus();
    window.addEventListener('cashier:refresh', handler);
    return () => window.removeEventListener('cashier:refresh', handler);
  }, [fetchCashierStatus]);

  const handleOpenCashier = async () => {
    const initial = (view.openingBalance ?? 0);
    const openingBalanceStr = prompt(
      'Digite o valor de abertura do caixa (fundo de troco):',
      Number(initial).toFixed(2)
    );
    if (openingBalanceStr === null) return;

    const opening = parseFloat(String(openingBalanceStr).replace(',', '.'));
    if (Number.isNaN(opening)) {
      alert('Valor inválido.');
      return;
    }

    try {
      const payload = { openingAmount: opening };
      const res = await api.post('/cashier/open', payload);
      if (res?.data?.status) {
        setView(normalizeStatus(res.data.status));
      } else {
        await fetchCashierStatus();
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || 'Não foi possível abrir o caixa.';
      alert(errorMessage);
    }
  };

  const handleCloseCashier = async () => {
    if (!window.confirm('Tem certeza que deseja fechar o caixa? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      const res = await api.post('/cashier/close');
      if (res?.data?.status) {
        setView(normalizeStatus(res.data.status));
      } else {
        await fetchCashierStatus();
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || 'Não foi possível fechar o caixa.';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
        <p className="text-gray-500">Carregando informações do caixa...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Controle de Caixa</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchCashierStatus}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
            title="Atualizar"
          >
            Atualizar
          </button>
          {view.isOpen ? (
            <button
              onClick={handleCloseCashier}
              className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
            >
              Fechar Caixa
            </button>
          ) : (
            <button
              onClick={handleOpenCashier}
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
            >
              Abrir Caixa
            </button>
          )}
        </div>
      </div>

      {view.isOpen ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-green-600">Caixa Aberto</h2>
            <span className="text-xs text-gray-500">
              Modo:&nbsp;
              <strong>{view.mode === 'legacy' ? 'LEGADO' : 'NOVO'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            {view.openingBalance !== null && (
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-500">Saldo Inicial</p>
                <p className="text-2xl font-bold">{fmtBRL(view.openingBalance)}</p>
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Entradas (Recebimentos)</p>
              <p className="text-2xl font-bold text-emerald-600">{fmtBRL(view.income)}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Saídas (Pagamentos)</p>
              <p className="text-2xl font-bold text-red-600">{fmtBRL(view.expense)}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">
                Saldo {view.openingBalance !== null ? 'do Caixa' : 'do Dia'}
              </p>
              <p className="text-2xl font-bold">
                {fmtBRL(view.balance)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-10 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">O caixa está fechado</h2>
          <p className="text-gray-500 mb-6">
            Abra o caixa para começar a registrar as vendas e pagamentos do dia.
          </p>
          <button
            onClick={handleOpenCashier}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-lg"
          >
            Abrir Caixa
          </button>
        </div>
      )}
    </div>
  );
};

export default Cashier;
