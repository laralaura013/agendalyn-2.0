// src/cashier/CashierControll.jsx
import React, { useState } from 'react';
import Modal from '../dashboard/Modal';
import TransactionForm from './TransactionForm';
import api from '../services/api';
import toast from 'react-hot-toast';

// util simples p/ moeda -> número (aceita "1.234,56" ou "1234.56")
const toNumber = (v) => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Componente de controle rápido do Caixa.
 * - Abre/fecha caixa (modal de abertura simples)
 * - Lança Entrada/Saída (TransactionForm)
 * - Emite window.dispatchEvent(new Event('cashier:refresh')) após alterações
 *
 * Props opcionais (legado):
 *   - session, setSession
 */
const CashierControll = ({ session, setSession }) => {
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [txType, setTxType] = useState('INCOME'); // 'INCOME' | 'EXPENSE'
  const [busy, setBusy] = useState(false);

  const safeRefresh = () => {
    try {
      window.dispatchEvent(new Event('cashier:refresh'));
    } catch {}
  };

  /* ===================== ABRIR ===================== */
  const handleOpenCashier = async () => {
    const opening = toNumber(openingBalance);
    if (opening < 0) {
      toast.error('Valor de abertura inválido.');
      return;
    }

    setBusy(true);
    try {
      await api.post('/cashier/open', { openingAmount: opening });
      setIsOpeningModalOpen(false);
      setOpeningBalance('');
      safeRefresh();
      toast.success('Caixa aberto!');
    } catch (e) {
      console.warn('[CashierControll] Falha em /cashier/open, usando estado local.', e);
      // Fallback (legado)
      if (setSession) {
        setSession({ status: 'OPEN', openingBalance: opening, transactions: [] });
      }
      setIsOpeningModalOpen(false);
      setOpeningBalance('');
      safeRefresh();
      toast('Caixa aberto (modo local).', { icon: '⚠️' });
    } finally {
      setBusy(false);
    }
  };

  /* ===================== FECHAR ===================== */
  const handleCloseCashier = async () => {
    if (!window.confirm('Tem certeza que deseja fechar o caixa? Esta ação não pode ser desfeita.')) return;

    setBusy(true);
    try {
      await api.post('/cashier/close', { notes: '' });
      safeRefresh();
      toast.success('Caixa fechado!');
    } catch (e) {
      console.warn('[CashierControll] Falha em /cashier/close, usando estado local.', e);
      if (setSession) setSession({ status: 'CLOSED' });
      safeRefresh();
      toast('Caixa fechado (modo local).', { icon: '⚠️' });
    } finally {
      setBusy(false);
    }
  };

  /* ===================== TRANSAÇÃO ===================== */
  const handleSaveTransaction = async (data) => {
    // data vem do TransactionForm (amount, description, paymentMethodId, sourceType/sourceId opcionais)
    const payload = {
      type: txType,
      amount: toNumber(data.amount),
      description: data.description || '',
      paymentMethodId: data.paymentMethodId || undefined,
      sourceType: data.sourceType || undefined, // 'RECEIVABLE' | 'PAYABLE' (opcional)
      sourceId: data.sourceId || undefined,     // opcional
    };

    if (!(payload.amount > 0)) {
      toast.error('Informe um valor válido.');
      return;
    }

    setBusy(true);
    try {
      const r = await api.post('/cashier/transactions', payload);
      if (r?.status === 201) {
        toast.success(`${txType === 'INCOME' ? 'Entrada' : 'Saída'} lançada!`);
      } else {
        toast.success('Lançamento realizado.');
      }
      setIsTransactionModalOpen(false);
      safeRefresh();
    } catch (e) {
      const msg = e?.response?.data?.message || '';
      // Ambiente "novo" pode retornar 501 para lançamento manual
      if (e?.response?.status === 501) {
        toast.error(
          'Lançamento manual indisponível neste modelo de caixa. Registre via Recebíveis/Pagáveis.'
        );
      } else {
        toast.error(msg || 'Não foi possível salvar a transação.');
      }

      // Fallback de legado: se há um session aberto no estado local, persistimos ali
      if (setSession && session?.status === 'OPEN' && payload.amount > 0) {
        const prev = Array.isArray(session.transactions) ? session.transactions : [];
        setSession({
          ...session,
          transactions: [
            ...prev,
            { type: txType, amount: payload.amount, createdAt: new Date().toISOString() },
          ],
        });
        setIsTransactionModalOpen(false);
        safeRefresh();
        toast('Lançamento salvo localmente (fallback).', { icon: '⚠️' });
      }
    } finally {
      setBusy(false);
    }
  };

  /* ===================== RENDER ===================== */
  const closed = session?.status === 'CLOSED';

  if (closed) {
    return (
      <>
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4">O caixa está fechado.</h2>
          <button
            disabled={busy}
            onClick={() => setIsOpeningModalOpen(true)}
            className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 disabled:opacity-60"
          >
            Abrir Caixa
          </button>
        </div>

        <Modal isOpen={isOpeningModalOpen} onClose={() => setIsOpeningModalOpen(false)}>
          <div className="p-4">
            <h3 className="text-xl font-bold mb-4">Abrir Caixa</h3>
            <label className="block text-sm font-medium text-gray-700">
              Valor de Abertura (Troco)
            </label>
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full p-2 border rounded mt-2"
              placeholder="Ex: 50,00"
              min="0"
              step="0.01"
            />
            <button
              disabled={busy}
              onClick={handleOpenCashier}
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
            >
              Confirmar Abertura
            </button>
          </div>
        </Modal>
      </>
    );
  }

  // Caixa ABERTO
  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Caixa Aberto</h2>
          <button
            disabled={busy}
            onClick={handleCloseCashier}
            className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-60"
          >
            Fechar Caixa
          </button>
        </div>

        {/* KPIs simples de legado (se vier via props) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-gray-100 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-600">Saldo Inicial</h4>
            <p className="text-lg font-bold">
              R$ {Number(session?.openingBalance || 0).toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-green-100 rounded-lg">
            <h4 className="text-sm font-semibold text-green-800">Entradas</h4>
            <p className="text-lg font-bold text-green-800">
              R${' '}
              {Number(
                (session?.transactions || [])
                  .filter((t) => t.type === 'INCOME')
                  .reduce((s, t) => s + Number(t.amount || 0), 0)
              ).toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-red-100 rounded-lg">
            <h4 className="text-sm font-semibold text-red-800">Saídas</h4>
            <p className="text-lg font-bold text-red-800">
              R${' '}
              {Number(
                (session?.transactions || [])
                  .filter((t) => t.type === 'EXPENSE')
                  .reduce((s, t) => s + Number(t.amount || 0), 0)
              ).toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-blue-100 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800">Saldo Atual</h4>
            <p className="text-lg font-bold text-blue-800">
              R${' '}
              {Number(
                Number(session?.openingBalance || 0) +
                  (session?.transactions || []).reduce(
                    (s, t) =>
                      s +
                      (t.type === 'INCOME'
                        ? Number(t.amount || 0)
                        : -Number(t.amount || 0)),
                    0
                  )
              ).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 justify-center sm:justify-start">
          <button
            disabled={busy}
            onClick={() => {
              setTxType('INCOME');
              setIsTransactionModalOpen(true);
            }}
            className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60"
          >
            Lançar Entrada
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setTxType('EXPENSE');
              setIsTransactionModalOpen(true);
            }}
            className="px-5 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-60"
          >
            Lançar Saída
          </button>
        </div>
      </div>

      <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)}>
        <TransactionForm
          type={txType}
          onSave={handleSaveTransaction}
          onCancel={() => setIsTransactionModalOpen(false)}
        />
      </Modal>
    </>
  );
};

export default CashierControll;
