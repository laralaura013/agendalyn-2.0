import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { asArray } from '../../utils/asArray';
import NeuButton from '../ui/NeuButton';
import NeuCard from '../ui/NeuCard';

// transforma "1.234,56" -> 1234.56
const toNumber = (v) => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const TYPE_OPTIONS = [
  { value: 'INCOME', label: 'Entrada (Recebimento)' },
  { value: 'EXPENSE', label: 'Saída (Pagamento)' },
];

const TransactionForm = ({ type: typeProp = 'INCOME', onSave, onCancel }) => {
  const [type, setType] = useState(typeProp || 'INCOME');
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [methods, setMethods] = useState([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sourceType, setSourceType] = useState(''); // RECEIVABLE | PAYABLE (opcional)
  const [sourceId, setSourceId] = useState('');     // opcional
  const [busy, setBusy] = useState(false);

  // se o prop mudar no futuro
  useEffect(() => {
    if (typeProp) setType(typeProp);
  }, [typeProp]);

  // carrega métodos de pagamento (se houver endpoint)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api.get('/payment-methods');
        const items = Array.isArray(r?.data) ? r.data
          : Array.isArray(r?.data?.items) ? r.data.items : [];
        if (mounted) setMethods(items);
      } catch {
        setMethods([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const amount = useMemo(() => toNumber(amountText), [amountText]);

  const submit = (e) => {
    e.preventDefault();

    if (!type || !['INCOME', 'EXPENSE'].includes(type)) {
      toast.error('Selecione o tipo do lançamento.');
      return;
    }
    if (!(amount > 0)) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }
    if (!description || description.trim().length === 0) {
      toast.error('Descreva o lançamento.');
      return;
    }

    setBusy(true);
    try {
      onSave?.({
        type,
        amount,
        description: description.trim(),
        paymentMethodId: paymentMethodId || undefined,
        sourceType: sourceType || undefined,
        sourceId: sourceId ? String(sourceId) : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-0">
      <NeuCard className="p-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[var(--text-color)]">Lançamento no Caixa</h2>
          <div className="flex items-center gap-2">
            {typeProp ? (
              <span
                className={`px-2 py-1 text-xs font-bold rounded-full ${
                  type === 'INCOME'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
                title="Tipo definido pelo contexto"
              >
                {type === 'INCOME' ? 'Entrada' : 'Saída'}
              </span>
            ) : (
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm"
              >
                {asArray(TYPE_OPTIONS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Valor */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-[var(--text-color)]">Valor (R$)</label>
          <input
            type="text"
            inputMode="decimal"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Ex.: 25,50"
          />
          <div className="text-xs text-[var(--text-color)] opacity-70 mt-1">
            Dica: aceitamos “1.234,56” ou “1234.56”.
          </div>
        </div>

        {/* Descrição */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-[var(--text-color)]">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border rounded-md text-sm"
            placeholder={type === 'INCOME' ? 'Ex.: Venda balcão' : 'Ex.: Compra de insumos'}
          />
        </div>

        {/* Método de pagamento (opcional) */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-[var(--text-color)]">
            Método de pagamento (opcional)
          </label>
          <select
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">Selecione…</option>
            {asArray(methods).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Avançado */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="inline-flex items-center gap-2 text-sm text-[var(--text-color)]"
          >
            {advancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Opções avançadas
          </button>

          {advancedOpen && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-color)]">
                  Origem (opcional)
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Nenhuma</option>
                  <option value="RECEIVABLE">Recebível</option>
                  <option value="PAYABLE">Pagável</option>
                </select>
                <div className="text-xs text-[var(--text-color)] opacity-70 mt-1">
                  Use quando este lançamento estiver vinculado a um documento financeiro.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-color)]">
                  ID da origem (opcional)
                </label>
                <input
                  type="text"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="Ex.: 10293"
                />
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <NeuButton onClick={onCancel} className="inline-flex items-center gap-2">
            <X size={16} /> Cancelar
          </NeuButton>
          <NeuButton
            type="submit"
            variant="primary"
            disabled={busy}
            className="inline-flex items-center gap-2 disabled:opacity-60"
          >
            <Save size={16} /> Salvar lançamento
          </NeuButton>
        </div>
      </NeuCard>
    </form>
  );
};

export default TransactionForm;
