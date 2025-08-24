import React, { useState } from 'react';
import Modal from '../dashboard/Modal';
import TransactionForm from './TransactionForm';
import api from '../../services/api';
import toast from 'react-hot-toast';
import NeuButton from '../ui/NeuButton';
import NeuCard from '../ui/NeuCard';

// util simples p/ moeda -> número
const toNumber = (v) => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Componente de controle rápido do Caixa.
 * - Abre/fecha caixa (com modal de abertura)
 * - Lança Entrada/Saída (usa TransactionForm)
 * - Emite window.dispatchEvent(new Event('cashier:refresh')) após alterações
 *
 * Props opcionais de legado:
 *   - session, setSession (mantidos para compatibilidade com seu estado local)
 *
 * Prop extra:
 *   - variant: 'compact' | 'full'  (default: 'compact')
 */
const CashierControll = ({ session, setSession, variant = 'compact' }) => {
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [txType, setTxType] = useState('INCOME'); // 'INCOME' | 'EXPENSE'
  const [busy, setBusy] = useState(false);

  const safeRefresh = () => {
    try {
      window.dispatchEvent(new Event('cashier:refresh'));
    } catch (_) {}
  };

  // --------- ABRIR CAIXA ----------
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
      // Fallback: atualiza estado local (legado)
      console.warn('[CashierControll] Falha em /cashier/open, usando estado local.', e);
      setSession?.({ status: 'OPEN', openingBalance: opening, transactions: [] });
      setIsOpeningModalOpen(false);
      setOpeningBalance('');
      safeRefresh();
      toast('Caixa aberto (modo local).', { icon: '⚠️' });
    } finally {
      setBusy(false);
    }
  };

  // --------- FECHAR CAIXA ----------
  const handleCloseCashier = async () => {
    if (!window.confirm('Tem certeza que deseja fechar o caixa? Esta ação não pode ser desfeita.')) return;

    setBusy(true);
    try {
      await api.post('/cashier/close', { notes: '' });
      safeRefresh();
      toast.success('Caixa fechado!');
    } catch (e) {
      console.warn('[CashierControll] Falha em /cashier/close, usando estado local.', e);
      setSession?.({ status: 'CLOSED' });
      safeRefresh();
      toast('Caixa fechado (modo local).', { icon: '⚠️' });
    } finally {
      setBusy(false);
    }
  };

  // --------- NOVA TRANSAÇÃO (Entrada/Saída) ----------
  const handleSaveTransaction = async (data) => {
    const payload = {
      type: txType, // 'INCOME' | 'EXPENSE'
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
      await api.post('/cashier/transactions', payload);
      setIsTransactionModalOpen(false);
      safeRefresh();
      toast.success(`${txType === 'INCOME' ? 'Entrada' : 'Saída'} lançada!`);
    } catch (e) {
      console.warn('[CashierControll] Falha em /cashier/transactions, usando estado local se possível.', e);
      // Fallback de legado: empurra no array local se existir
      if (setSession && session?.status === 'OPEN') {
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
        toast('Lançamento salvo localmente.', { icon: '⚠️' });
      } else {
        toast.error(e?.response?.data?.message || 'Não foi possível salvar a transação.');
      }
    } finally {
      setBusy(false);
    }
  };

  // ------------- VARIANT: COMPACT -------------
  if (variant === 'compact') {
    const closed = session?.status === 'CLOSED';
    return (
      <>
        {closed ? (
          <div className="flex items-center gap-2">
            <NeuButton
              variant="primary"
              disabled={busy}
              onClick={() => setIsOpeningModalOpen(true)}
            >
              Abrir Caixa
            </NeuButton>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <NeuButton
              onClick={() => {
                setTxType('INCOME');
                setIsTransactionModalOpen(true);
              }}
            >
              Lançar Entrada
            </NeuButton>
            <NeuButton
              onClick={() => {
                setTxType('EXPENSE');
                setIsTransactionModalOpen(true);
              }}
            >
              Lançar Saída
            </NeuButton>
          </div>
        )}

        {/* Modal de abertura */}
        <Modal isOpen={isOpeningModalOpen} onClose={() => setIsOpeningModalOpen(false)}>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-[var(--text-color)] mb-3">Abrir Caixa</h3>
            <label className="block text-sm font-medium text-[var(--text-color)]">
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
            <div className="flex justify-end gap-2 mt-4">
              <NeuButton onClick={() => setIsOpeningModalOpen(false)}>Cancelar</NeuButton>
              <NeuButton
                variant="primary"
                disabled={busy}
                onClick={handleOpenCashier}
              >
                Confirmar Abertura
              </NeuButton>
            </div>
          </div>
        </Modal>

        {/* Modal de transação */}
        <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)}>
          <TransactionForm
            type={txType}
            onSave={handleSaveTransaction}
            onCancel={() => setIsTransactionModalOpen(false)}
          />
        </Modal>
      </>
    );
  }

  // ------------- VARIANT: FULL (visual clássico) -------------
  const closed = session?.status === 'CLOSED';

  if (closed) {
    return (
      <>
        <NeuCard className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-4 text-[var(--text-color)]">O caixa está fechado.</h2>
          <NeuButton
            variant="primary"
            disabled={busy}
            onClick={() => setIsOpeningModalOpen(true)}
          >
            Abrir Caixa
          </NeuButton>
        </NeuCard>

        <Modal isOpen={isOpeningModalOpen} onClose={() => setIsOpeningModalOpen(false)}>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-[var(--text-color)] mb-3">Abrir Caixa</h3>
            <label className="block text-sm font-medium text-[var(--text-color)]">
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
            <div className="flex justify-end gap-2 mt-4">
              <NeuButton onClick={() => setIsOpeningModalOpen(false)}>Cancelar</NeuButton>
              <NeuButton
                variant="primary"
                disabled={busy}
                onClick={handleOpenCashier}
              >
                Confirmar Abertura
              </NeuButton>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // Caixa ABERTO (full)
  return (
    <>
      <NeuCard className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[var(--text-color)]">Caixa Aberto</h2>
          <NeuButton
            variant="danger"
            disabled={busy}
            onClick={handleCloseCashier}
          >
            Fechar Caixa
          </NeuButton>
        </div>

        {/* KPIs simples de legado (se vier via props) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <NeuCard className="p-4">
            <h4 className="text-sm font-semibold text-[var(--text-color)] opacity-80">Saldo Inicial</h4>
            <p className="text-lg font-bold text-[var(--text-color)]">
              R$ {(Number(session?.openingBalance || 0)).toFixed(2)}
            </p>
          </NeuCard>
          <NeuCard className="p-4">
            <h4 className="text-sm font-semibold text-emerald-700">Entradas</h4>
            <p className="text-lg font-bold text-emerald-700">
              R$ {Number(
                (session?.transactions || [])
                  .filter((t) => t.type === 'INCOME')
                  .reduce((s, t) => s + Number(t.amount || 0), 0)
              ).toFixed(2)}
            </p>
          </NeuCard>
          <NeuCard className="p-4">
            <h4 className="text-sm font-semibold text-red-700">Saídas</h4>
            <p className="text-lg font-bold text-red-700">
              R$ {Number(
                (session?.transactions || [])
                  .filter((t) => t.type === 'EXPENSE')
                  .reduce((s, t) => s + Number(t.amount || 0), 0)
              ).toFixed(2)}
            </p>
          </NeuCard>
          <NeuCard className="p-4">
            <h4 className="text-sm font-semibold text-[var(--text-color)]">Saldo Atual</h4>
            <p className="text-lg font-bold text-[var(--text-color)]">
              R$ {Number(
                Number(session?.openingBalance || 0) +
                (session?.transactions || []).reduce(
                  (s, t) => s + (t.type === 'INCOME' ? Number(t.amount || 0) : -Number(t.amount || 0)),
                  0
                )
              ).toFixed(2)}
            </p>
          </NeuCard>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 justify-center sm:justify-start">
          <NeuButton
            variant="primary"
            disabled={busy}
            onClick={() => { setTxType('INCOME'); setIsTransactionModalOpen(true); }}
          >
            Lançar Entrada
          </NeuButton>
          <NeuButton
            disabled={busy}
            onClick={() => { setTxType('EXPENSE'); setIsTransactionModalOpen(true); }}
          >
            Lançar Saída
          </NeuButton>
        </div>
      </NeuCard>

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
