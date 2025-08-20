// src/components/orders/OrderDrawer.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { X, PlusCircle, CreditCard, Banknote, Landmark, Smartphone, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
  const k = name.toLowerCase();
  if (k.includes('crédito')) return <CreditCard size={16} />;
  if (k.includes('debito') || k.includes('débito')) return <CreditCard size={16} />;
  if (k.includes('pix')) return <Smartphone size={16} />;
  if (k.includes('dinheiro')) return <Banknote size={16} />;
  if (k.includes('boleto')) return <Landmark size={16} />;
  return <CreditCard size={16} />;
};

export default function OrderDrawer({
  order,
  open,
  onClose,
  refreshOrders,
}) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);

  const total = useMemo(() => Number(order?.total || 0), [order]);
  const sumPayments = useMemo(
    () => payments.reduce((acc, p) => acc + Number(p.amount || 0), 0),
    [payments]
  );
  const remaining = useMemo(() => Number((total - sumPayments).toFixed(2)), [total, sumPayments]);
  const canFinalize = order?.status === 'OPEN' && total > 0 && Math.round(sumPayments * 100) === Math.round(total * 100);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [pmRes] = await Promise.all([
          api.get('/payment-methods'),
        ]);
        setPaymentMethods(pmRes.data || []);

        // carrega pagamentos existentes
        const current = (order?.payments || []).map(p => ({
          paymentMethodId: p.paymentMethodId,
          amount: Number(p.amount),
          installments: p.installments || 1,
          cardBrand: p.cardBrand || '',
          insertIntoCashier: p.insertIntoCashier !== false,
        }));
        // se não houver pagamentos: cria uma linha com o restante todo
        if (!current.length) {
          const firstMethodId = (pmRes.data?.[0]?.id) || '';
          setPayments([rowDefaults(total, firstMethodId)]);
        } else {
          setPayments(current);
        }
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar formas de pagamento.');
      }
    })();
  }, [open, order, total]);

  const updateRow = (idx, patch) => {
    setPayments(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const firstMethodId = paymentMethods?.[0]?.id || '';
    setPayments(prev => [...prev, rowDefaults(remaining > 0 ? remaining : 0, firstMethodId)]);
  };

  const removeRow = (idx) => {
    setPayments(prev => prev.filter((_, i) => i !== idx));
  };

  const autoDistribute = (idx) => {
    // Preenche a linha com todo o restante
    if (remaining > 0) {
      updateRow(idx, { amount: Number(remaining.toFixed(2)) });
    }
  };

  const savePayments = async () => {
    try {
      setLoading(true);
      // valida básicas no front para UX:
      if (!payments.length) {
        toast.error('Adicione ao menos uma forma de pagamento.');
        return;
      }
      if (Math.round(sumPayments * 100) !== Math.round(total * 100)) {
        toast.error('A soma dos pagamentos deve ser igual ao total.');
        return;
      }
      const payload = { payments: payments.map(p => ({
        paymentMethodId: p.paymentMethodId,
        amount: Number(Number(p.amount || 0).toFixed(2)),
        installments: Math.max(1, parseInt(p.installments || 1, 10)),
        cardBrand: p.cardBrand || undefined,
        insertIntoCashier: !!p.insertIntoCashier,
      })) };
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
      // força salvar antes de finalizar
      await savePayments();
      // se após salvar ainda sobrou diferença, aborta
      if (Math.round(sumPayments * 100) !== Math.round(total * 100)) {
        return;
      }
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

  const disabled = order?.status !== 'OPEN';

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* drawer */}
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">Comanda #{order?.id?.slice(0,8)}</h2>
            <p className="text-xs text-gray-500">
              Cliente: <strong>{order?.client?.name || 'N/A'}</strong> • Colaborador: <strong>{order?.user?.name || 'N/A'}</strong>
            </p>
          </div>
          <button onClick={onClose} className="rounded p-2 hover:bg-gray-100" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        {/* body */}
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
                    <td className="px-3 py-2 font-semibold" colSpan={3}>Total</td>
                    <td className="px-3 py-2 font-semibold text-right">{currency(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Pagamentos */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Formas de Pagamento</h3>
              {order?.status === 'OPEN' && (
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
                >
                  <PlusCircle size={16} /> Adicionar
                </button>
              )}
            </div>

            {!payments.length && (
              <div className="rounded-md border p-3 text-sm text-gray-600">
                Nenhuma forma de pagamento adicionada.
              </div>
            )}

            <div className="space-y-3">
              {payments.map((p, idx) => {
                const method = paymentMethods.find(m => m.id === p.paymentMethodId);
                const methodName = method?.name || '—';
                const showCardBrand = (methodName?.toLowerCase().includes('crédito') || methodName?.toLowerCase().includes('cartão'));

                return (
                  <div key={idx} className="rounded-xl border p-3 grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* método */}
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
                          {paymentMethods.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* valor */}
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
                        {!disabled && remaining > 0 && (
                          <button
                            type="button"
                            title="Preencher com restante"
                            onClick={() => autoDistribute(idx)}
                            className="shrink-0 px-3 py-2 text-xs border rounded-md hover:bg-gray-50"
                          >
                            resto
                          </button>
                        )}
                      </div>
                    </div>

                    {/* parcelas */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium">Parcelas</label>
                      <input
                        disabled={disabled}
                        type="number"
                        min="1"
                        value={p.installments}
                        onChange={(e) => updateRow(idx, { installments: Math.max(1, parseInt(e.target.value || 1, 10)) })}
                        className="w-full px-3 py-2 text-sm border rounded-md"
                      />
                    </div>

                    {/* bandeira (se cartão) */}
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

                    {/* caixa toggle + remover */}
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

            {/* aviso de soma */}
            <div className="mt-2 text-xs">
              {Math.round(sumPayments * 100) !== Math.round(total * 100) ? (
                <p className="flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                  <AlertTriangle size={14} /> A soma dos pagamentos ({currency(sumPayments)}) deve ser igual ao total ({currency(total)}).
                </p>
              ) : (
                <p className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  <CheckCircle2 size={14} /> Pagamentos batendo com o total.
                </p>
              )}
            </div>
          </section>

          {/* Resumo */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Resumo</h3>
            <div className="rounded-xl border p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{currency(total)}</span></div>
              <div className="flex justify-between"><span>Pago (somatório)</span><span>{currency(sumPayments)}</span></div>
              <div className="flex justify-between font-semibold"><span>Restante</span><span>{currency(remaining > 0 ? remaining : 0)}</span></div>
            </div>
          </section>
        </div>

        {/* footer */}
        <div className="border-t p-3 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-50">Fechar</button>
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
