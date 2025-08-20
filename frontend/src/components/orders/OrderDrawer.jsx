// src/components/orders/OrderDrawer.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  PlusCircle,
  CreditCard,
  Banknote,
  Landmark,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDot,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const currency = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const rowDefaults = (remaining = 0, firstMethodId = '') => ({
  paymentMethodId: firstMethodId || '',
  amount: remaining > 0 ? Number(remaining.toFixed(2)) : 0,
  installments: 1,
  cardBrand: '',
  insertIntoCashier: true,
});

const methodIcon = (name = '') => {
  const k = (name || '').toLowerCase();
  if (k.includes('crédito')) return <CreditCard size={16} />;
  if (k.includes('debito') || k.includes('débito')) return <CreditCard size={16} />;
  if (k.includes('pix')) return <Smartphone size={16} />;
  if (k.includes('dinheiro')) return <Banknote size={16} />;
  if (k.includes('boleto')) return <Landmark size={16} />;
  return <CreditCard size={16} />;
};

// Converte valor/percent em valor absoluto
function asValue({ base, value, mode }) {
  const v = Number(value || 0);
  if (mode === '%') return Math.max(0, Math.round(base * v) / 100);
  return Math.max(0, v);
}

export default function OrderDrawer({ order, open, onClose, refreshOrders }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);

  // seleção de linha
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Desconto/Gorjeta com R$ | %
  const [discountValue, setDiscountValue] = useState(0);
  const [discountMode, setDiscountMode] = useState('R$'); // 'R$' | '%'
  const [tipValue, setTipValue] = useState(0);
  const [tipMode, setTipMode] = useState('R$'); // 'R$' | '%'

  const total = useMemo(() => Number(order?.total || 0), [order]);

  const discountAbs = useMemo(
    () => Number(asValue({ base: total, value: discountValue, mode: discountMode }).toFixed(2)),
    [total, discountValue, discountMode]
  );
  const tipAbs = useMemo(
    () => Number(asValue({ base: total, value: tipValue, mode: tipMode }).toFixed(2)),
    [total, tipValue, tipMode]
  );

  const adjustedTotal = useMemo(
    () => Number((total - discountAbs + tipAbs).toFixed(2)),
    [total, discountAbs, tipAbs]
  );

  const sumPayments = useMemo(
    () => payments.reduce((acc, p) => acc + Number(p.amount || 0), 0),
    [payments]
  );

  const remaining = useMemo(
    () => Number((adjustedTotal - sumPayments).toFixed(2)),
    [adjustedTotal, sumPayments]
  );

  const canFinalize =
    order?.status === 'OPEN' &&
    adjustedTotal >= 0 &&
    Math.round(sumPayments * 100) === Math.round(adjustedTotal * 100);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const pmRes = await api.get('/payment-methods');
        setPaymentMethods(pmRes.data || []);

        // pagamentos existentes
        const current = (order?.payments || []).map((p) => ({
          paymentMethodId: p.paymentMethodId,
          amount: Number(p.amount),
          installments: p.installments || 1,
          cardBrand: p.cardBrand || '',
          insertIntoCashier: p.insertIntoCashier !== false,
        }));

        if (!current.length) {
          const firstMethodId = pmRes.data?.[0]?.id || '';
          setPayments([rowDefaults(total, firstMethodId)]);
          setSelectedIdx(0);
        } else {
          setPayments(current);
          setSelectedIdx(0);
        }

        // reset visuais
        setDiscountValue(0);
        setDiscountMode('R$');
        setTipValue(0);
        setTipMode('R$');
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar formas de pagamento.');
      }
    })();
  }, [open, order, total]);

  const disabled = order?.status !== 'OPEN';

  const updateRow = (idx, patch) => {
    setPayments((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const firstMethodId = paymentMethods?.[0]?.id || '';
    setPayments((prev) => {
      const next = [...prev, rowDefaults(remaining > 0 ? remaining : 0, firstMethodId)];
      // seleciona a nova linha
      setSelectedIdx(next.length - 1);
      return next;
    });
  };

  const removeRow = (idx) => {
    setPayments((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // reajusta seleção
      if (next.length === 0) setSelectedIdx(0);
      else if (idx <= selectedIdx) setSelectedIdx(Math.max(0, selectedIdx - 1));
      return next;
    });
  };

  // Ajusta apenas a linha selecionada somando a diferença (posso ser positivo ou negativo)
  const zeroDifferenceOnSelected = () => {
    if (payments.length === 0) {
      // cria uma linha com o restante
      const firstMethodId = paymentMethods?.[0]?.id || '';
      setPayments([rowDefaults(remaining, firstMethodId)]);
      setSelectedIdx(0);
      return;
    }
    const diff = Number((adjustedTotal - sumPayments).toFixed(2)); // restante
    if (diff === 0) {
      toast('Nada a ajustar: total já bate.', { icon: '👌' });
      return;
    }
    setPayments((prev) =>
      prev.map((p, i) =>
        i === selectedIdx ? { ...p, amount: Number((Number(p.amount || 0) + diff).toFixed(2)) } : p
      )
    );
  };

  // Distribui restante igualmente entre linhas (cria uma se não houver)
  const distributeEqually = () => {
    const rest = Number((adjustedTotal - sumPayments).toFixed(2));
    if (rest === 0) {
      toast('Nada a distribuir: total já bate.', { icon: '👌' });
      return;
    }
    if (payments.length === 0) {
      const firstMethodId = paymentMethods?.[0]?.id || '';
      setPayments([rowDefaults(rest, firstMethodId)]);
      setSelectedIdx(0);
      return;
    }
    const n = payments.length;
    const share = Math.floor((rest * 100) / n) / 100;
    const remainder = Number((rest - share * (n - 1)).toFixed(2));
    setPayments((prev) =>
      prev.map((p, i) => ({
        ...p,
        amount: Number((Number(p.amount || 0) + (i === n - 1 ? remainder : share)).toFixed(2)),
      }))
    );
  };

  const savePayments = async () => {
    try {
      setLoading(true);
      if (!payments.length) {
        toast.error('Adicione ao menos uma forma de pagamento.');
        return;
      }
      if (Math.round(sumPayments * 100) !== Math.round(adjustedTotal * 100)) {
        toast.error('A soma dos pagamentos deve ser igual ao total a pagar.');
        return;
      }
      const payload = {
        payments: payments.map((p) => ({
          paymentMethodId: p.paymentMethodId,
          amount: Number(Number(p.amount || 0).toFixed(2)),
          installments: Math.max(1, parseInt(p.installments || 1, 10)),
          cardBrand: p.cardBrand || undefined,
          insertIntoCashier: !!p.insertIntoCashier,
        })),
      };
      await api.put(`/orders/${order.id}/payments`, payload);
      toast.success('Pagamentos salvos!');
      await refreshOrders?.();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Erro ao salvar pagamentos.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setLoading(true);
      await savePayments();
      if (Math.round(sumPayments * 100) !== Math.round(adjustedTotal * 100)) return;
      await api.put(`/orders/${order.id}/finish`);
      toast.success('Comanda finalizada!');
      await refreshOrders?.();
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Erro ao finalizar comanda.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">Comanda #{order?.id?.slice(0, 8)}</h2>
            <p className="text-xs text-gray-500">
              Cliente: <strong>{order?.client?.name || 'N/A'}</strong> • Colaborador:{' '}
              <strong>{order?.user?.name || 'N/A'}</strong>
            </p>
          </div>
          <button onClick={onClose} className="rounded p-2 hover:bg-gray-100" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        {/* Action bar fixa */}
        <div className="sticky top-[64px] z-40 bg-white border-b p-3 flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border hover:bg-gray-50">
            Fechar
          </button>
          {order?.status === 'OPEN' && (
            <>
              <button
                disabled={loading}
                onClick={savePayments}
                className="px-3 py-1.5 rounded-md border hover:bg-gray-50 disabled:opacity-60"
              >
                Salvar Pagamentos
              </button>
              <button
                disabled={!canFinalize || loading}
                onClick={handleFinalize}
                className="px-3 py-1.5 rounded-md bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60"
              >
                Finalizar Comanda
              </button>
            </>
          )}
        </div>

        {/* Body */}
        <div className="h-[calc(100%-4rem)] overflow-y-auto p-4 space-y-6">
          {/* Itens */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Itens</h3>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="px-3 py-2">Descrição</th>
                    <th className="px-3 py-2 text-right">Qtd</th>
                    <th className="px-3 py-2 text-right">Preço</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(order?.items || []).map((it) => {
                    const desc = it.service?.name || it.product?.name || 'Item';
                    const subtotal = Number(it.price) * it.quantity;
                    return (
                      <tr key={it.id} className="border-t">
                        <td className="px-3 py-2">{desc}</td>
                        <td className="px-3 py-2 text-right">{it.quantity}</td>
                        <td className="px-3 py-2 text-right">{currency(it.price)}</td>
                        <td className="px-3 py-2 text-right">{currency(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-semibold" colSpan={3}>
                      Total
                    </td>
                    <td className="px-3 py-2 font-semibold text-right">{currency(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Pagamentos */}
          <section>
            <div className="flex items-center justify-between mb-2 gap-2">
              <h3 className="text-sm font-semibold text-gray-700">Formas de Pagamento</h3>
              {order?.status === 'OPEN' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
                  >
                    <PlusCircle size={16} /> Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={distributeEqually}
                    className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
                    title="Distribuir o restante igualmente entre as formas"
                  >
                    Distribuir restante igualmente
                  </button>
                  <button
                    type="button"
                    onClick={zeroDifferenceOnSelected}
                    className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
                    title="Aplicar toda a diferença na linha selecionada"
                  >
                    Zerar diferença (linha selecionada)
                  </button>
                </div>
              )}
            </div>

            {!payments.length && (
              <div className="rounded-md border p-3 text-sm text-gray-600">
                Nenhuma forma de pagamento adicionada.
              </div>
            )}

            <div className="space-y-3">
              {payments.map((p, idx) => {
                const method = paymentMethods.find((m) => m.id === p.paymentMethodId);
                const methodName = method?.name || '—';
                const showCardBrand =
                  (methodName || '').toLowerCase().includes('crédito') ||
                  (methodName || '').toLowerCase().includes('cartão');

                const selected = idx === selectedIdx;

                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 ${
                      selected ? 'ring-2 ring-purple-500/30' : ''
                    }`}
                  >
                    {/* Seletor */}
                    <div className="sm:col-span-12 -mt-1 -mb-1">
                      <button
                        type="button"
                        onClick={() => setSelectedIdx(idx)}
                        className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
                        title="Selecionar esta forma para ações rápidas"
                      >
                        {selected ? <CircleDot size={14} /> : <Circle size={14} />}
                        {selected ? 'Linha selecionada' : 'Selecionar linha'}
                      </button>
                    </div>

                    {/* Método */}
                    <div className="sm:col-span-5">
                      <label className="text-xs font-medium">Forma</label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{methodIcon(methodName)}</span>
                        <select
                          disabled={disabled}
                          value={p.paymentMethodId}
                          onChange={(e) => updateRow(idx, { paymentMethodId: e.target.value })}
                          className="w-full px-3 py-2 text-sm border rounded-md"
                        >
                          {paymentMethods.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Valor */}
                    <div className="sm:col-span-3">
                      <label className="text-xs font-medium">Valor</label>
                      <div className="flex gap-2">
                        <input
                          disabled={disabled}
                          type="number"
                          min="0"
                          step="0.01"
                          value={p.amount}
                          onChange={(e) => updateRow(idx, { amount: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm border rounded-md"
                        />
                        {!disabled && remaining !== 0 && (
                          <button
                            type="button"
                            title="Ajustar pelo restante"
                            onClick={() => {
                              // acrescenta exatamente o restante nesta linha
                              const diff = Number((adjustedTotal - sumPayments).toFixed(2));
                              updateRow(idx, { amount: Number((Number(p.amount || 0) + diff).toFixed(2)) });
                            }}
                            className="shrink-0 px-3 py-2 text-xs border rounded-md hover:bg-gray-50"
                          >
                            resto
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Parcelas */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium">Parcelas</label>
                      <input
                        disabled={disabled}
                        type="number"
                        min="1"
                        value={p.installments}
                        onChange={(e) =>
                          updateRow(idx, {
                            installments: Math.max(1, parseInt(e.target.value || 1, 10)),
                          })
                        }
                        className="w-full px-3 py-2 text-sm border rounded-md"
                      />
                    </div>

                    {/* Bandeira (se cartão) */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium">Bandeira</label>
                      <input
                        disabled={disabled || !showCardBrand}
                        placeholder={showCardBrand ? 'VISA, Master...' : '—'}
                        value={p.cardBrand}
                        onChange={(e) => updateRow(idx, { cardBrand: e.target.value })}
                        className="w-full px-3 py-2 text-sm border rounded-md disabled:bg-gray-100"
                      />
                    </div>

                    {/* Caixa toggle + remover */}
                    <div className="sm:col-span-12 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          disabled={disabled}
                          type="checkbox"
                          checked={!!p.insertIntoCashier}
                          onChange={(e) => updateRow(idx, { insertIntoCashier: e.target.checked })}
                        />
                        Inserir no Caixa (receber agora a parcela 1)
                      </label>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="text-red-600 text-sm hover:underline"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aviso da soma */}
            <div className="mt-2 text-xs">
              {Math.round(sumPayments * 100) !== Math.round(adjustedTotal * 100) ? (
                <p className="flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                  <AlertTriangle size={14} />
                  A soma dos pagamentos ({currency(sumPayments)}) deve ser igual ao total a pagar (
                  {currency(adjustedTotal)}).
                </p>
              ) : (
                <p className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  <CheckCircle2 size={14} /> Pagamentos batendo com o total a pagar.
                </p>
              )}
            </div>
          </section>

          {/* Resumo + Desconto/Gorjeta (R$ | %) */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Resumo</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {/* Desconto */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Desconto</label>
                  <div className="text-[11px] border rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDiscountMode('R$')}
                      className={`px-2 py-0.5 ${discountMode === 'R$' ? 'bg-gray-900 text-white' : 'bg-white'}`}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountMode('%')}
                      className={`px-2 py-0.5 border-l ${discountMode === '%' ? 'bg-gray-900 text-white' : 'bg-white'}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={disabled}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value || 0)))}
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-md"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  {discountMode === '%'
                    ? `= ${currency(discountAbs)} (${discountValue || 0}% de ${currency(total)})`
                    : `= ${currency(discountAbs)}`}
                </p>
              </div>

              {/* Gorjeta */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Gorjeta</label>
                  <div className="text-[11px] border rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setTipMode('R$')}
                      className={`px-2 py-0.5 ${tipMode === 'R$' ? 'bg-gray-900 text-white' : 'bg-white'}`}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipMode('%')}
                      className={`px-2 py-0.5 border-l ${tipMode === '%' ? 'bg-gray-900 text-white' : 'bg-white'}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={disabled}
                  value={tipValue}
                  onChange={(e) => setTipValue(Math.max(0, Number(e.target.value || 0)))}
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-md"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  {tipMode === '%'
                    ? `= ${currency(tipAbs)} (${tipValue || 0}% de ${currency(total)})`
                    : `= ${currency(tipAbs)}`}
                </p>
              </div>
            </div>

            <div className="rounded-xl border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{currency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Desconto ({discountMode})</span>
                <span>- {currency(discountAbs)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gorjeta ({tipMode})</span>
                <span>{currency(tipAbs)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total a pagar</span>
                <span>{currency(adjustedTotal)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between">
                <span>Pago (somatório)</span>
                <span>{currency(sumPayments)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Restante</span>
                <span>{currency(Math.max(0, remaining))}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              * Desconto e gorjeta são controles visuais. Ajuste as formas de pagamento para a soma bater com o
              <strong> Total a pagar</strong>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-3 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-50">
            Fechar
          </button>
          {order?.status === 'OPEN' && (
            <>
              <button
                disabled={loading}
                onClick={savePayments}
                className="px-4 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-60"
              >
                Salvar Pagamentos
              </button>
              <button
                disabled={!canFinalize || loading}
                onClick={handleFinalize}
                className="px-4 py-2 rounded-md bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60"
              >
                Finalizar Comanda
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
