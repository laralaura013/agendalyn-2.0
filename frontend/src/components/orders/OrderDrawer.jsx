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

function asValue({ base, value, mode }) {
  const v = Number(value || 0);
  if (mode === '%') return Math.max(0, Math.round(base * v) / 100);
  return Math.max(0, v);
}

export default function OrderDrawer({ order, open, onClose, refreshOrders }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Caixa
  const [cashierStatus, setCashierStatus] = useState('CLOSED'); // 'OPEN' | 'CLOSED' | 'UNKNOWN'
  const isCashierOpen = cashierStatus === 'OPEN';

  // Desconto/Gorjeta com R$ | %
  const [discountValue, setDiscountValue] = useState(0);
  const [discountMode, setDiscountMode] = useState('R$'); // 'R$' | '%'
  const [tipValue, setTipValue] = useState(0);
  const [tipMode, setTipMode] = useState('R$'); // 'R$' | '%'

  // Flags
  const isOpen = order?.status === 'OPEN';

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
    () => Number((Math.max(0, total - discountAbs) + tipAbs).toFixed(2)),
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

  const showSumWarning =
    isOpen && Math.round(sumPayments * 100) !== Math.round(adjustedTotal * 100);

  const canFinalize =
    isOpen &&
    payments.length > 0 &&
    (isCashierOpen || !payments.some((p) => p.insertIntoCashier));

  // carregar dados ao abrir
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [pmRes, cashierRes] = await Promise.allSettled([
          api.get('/payment-methods'),
          api.get('/cashier/status'),
        ]);

        if (pmRes.status === 'fulfilled') setPaymentMethods(pmRes.value.data || []);
        else setPaymentMethods([]);

        if (cashierRes.status === 'fulfilled') {
          const status = cashierRes.value?.data?.status || 'UNKNOWN';
          setCashierStatus(status);
        } else {
          setCashierStatus('UNKNOWN');
        }

        // pagamentos existentes
        const current = (order?.payments || []).map((p) => ({
          paymentMethodId: p.paymentMethodId,
          amount: Number(p.amount),
          installments: p.installments || 1,
          cardBrand: p.cardBrand || '',
          insertIntoCashier: p.insertIntoCashier !== false,
        }));

        if (!current.length) {
          const firstMethodId = pmRes.status === 'fulfilled' ? pmRes.value.data?.[0]?.id || '' : '';
          setPayments([rowDefaults(total, firstMethodId)]);
          setSelectedIdx(0);
        } else {
          setPayments(current);
          setSelectedIdx(0);
        }

        setDiscountValue(0);
        setDiscountMode('R$');
        setTipValue(0);
        setTipMode('R$');
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar dados da comanda.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order, total]);

  const disabled = !isOpen;

  const updateRow = (idx, patch) => {
    setPayments((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const firstMethodId = paymentMethods?.[0]?.id || '';
    setPayments((prev) => {
      const next = [...prev, rowDefaults(remaining > 0 ? remaining : 0, firstMethodId)];
      setSelectedIdx(next.length - 1);
      return next;
    });
  };

  const removeRow = (idx) => {
    setPayments((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) setSelectedIdx(0);
      else if (idx <= selectedIdx) setSelectedIdx(Math.max(0, selectedIdx - 1));
      return next;
    });
  };

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

  const zeroDifferenceOnSelected = () => {
    if (payments.length === 0) {
      const firstMethodId = paymentMethods?.[0]?.id || '';
      setPayments([rowDefaults(remaining, firstMethodId)]);
      setSelectedIdx(0);
      return;
    }
    const diff = Number((adjustedTotal - sumPayments).toFixed(2));
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

  // ====== Ações do Caixa ======
  const refreshCashierStatus = async () => {
    try {
      const res = await api.get('/cashier/status');
      const s = res?.data?.status || 'UNKNOWN';
      setCashierStatus(s);
      return s;
    } catch {
      setCashierStatus('UNKNOWN');
      return 'UNKNOWN';
    }
  };

  const handleOpenCashier = async () => {
    try {
      const p = api.post('/cashier/open');
      await toast.promise(p, {
        loading: 'Abrindo caixa...',
        success: 'Caixa aberto!',
        error: (e) => e?.response?.data?.message || 'Erro ao abrir caixa.',
      });
      await refreshCashierStatus();
    } catch (_) {}
  };

  const handleCloseCashier = async () => {
    try {
      const p = api.post('/cashier/close');
      await toast.promise(p, {
        loading: 'Fechando caixa...',
        success: 'Caixa fechado!',
        error: (e) => e?.response?.data?.message || 'Erro ao fechar caixa.',
      });
      await refreshCashierStatus();
    } catch (_) {}
  };

  const ensureCashierOk = async () => {
    const s = await refreshCashierStatus();
    if (payments.some((p) => p.insertIntoCashier) && s !== 'OPEN') {
      toast.error('Caixa fechado: desmarque “Inserir no Caixa” ou abra o Caixa para continuar.');
      return false;
    }
    return true;
  };

  // ====== Totais (desconto/gorjeta) ======
  const saveTotals = async () => {
    if (!order?.id || !isOpen) return;
    try {
      await api.put(`/orders/${order.id}/totals`, {
        discount: discountAbs,
        tip: tipAbs,
      });
    } catch (e) {
      console.warn('Falha ao salvar desconto/gorjeta:', e?.response?.data || e?.message);
    }
  };

  // autosave com debounce
  useEffect(() => {
    if (!open || !isOpen) return;
    const t = setTimeout(() => {
      saveTotals();
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isOpen, order?.id, discountAbs, tipAbs]);

  const savePayments = async () => {
    try {
      setLoading(true);
      if (!payments.length) {
        toast.error('Adicione ao menos uma forma de pagamento.');
        return;
      }
      if (!(await ensureCashierOk())) return;

      // garante que o backend recebeu os totais
      await saveTotals();

      const payload = {
        expectedTotal: Number(adjustedTotal.toFixed(2)),
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
      if (!(await ensureCashierOk())) return;

      // salva totais + pagamentos (com expectedTotal) antes de finalizar
      await saveTotals();
      await savePayments();

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

  const StatusBadge = () => {
    const s = order?.status;
    if (s === 'OPEN')
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-yellow-100 text-yellow-800 font-semibold">
          ABERTA
        </span>
      );
    if (s === 'FINISHED')
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800 font-semibold">
          FINALIZADA
        </span>
      );
    if (s === 'CANCELED')
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-red-100 text-red-700 font-semibold">
          CANCELADA
        </span>
      );
    return null;
  };

  const CashierBadge = () => {
    if (cashierStatus === 'OPEN')
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800 font-semibold">
          CAIXA: ABERTO
        </span>
      );
    if (cashierStatus === 'CLOSED')
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700 font-semibold">
          CAIXA: FECHADO
        </span>
      );
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 font-semibold">
        CAIXA: —
      </span>
    );
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
        className={`absolute right-0 top-0 h-full w-full sm:w-[620px] bg-white shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold">Comanda #{order?.id?.slice(0, 8)}</h2>
            <p className="text-xs text-gray-500">
              Cliente: <strong>{order?.client?.name || 'N/A'}</strong> • Colaborador:{' '}
              <strong>{order?.user?.name || 'N/A'}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CashierBadge />
            <button
              onClick={refreshCashierStatus}
              className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-gray-50"
              title="Recarregar status do caixa"
            >
              Atualizar status
            </button>
            {cashierStatus === 'CLOSED' && (
              <button
                onClick={handleOpenCashier}
                className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-gray-50"
              >
                Abrir Caixa
              </button>
            )}
            {cashierStatus === 'OPEN' && (
              <button
                onClick={handleCloseCashier}
                className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-gray-50"
              >
                Fechar Caixa
              </button>
            )}
            <StatusBadge />
            <button onClick={onClose} className="rounded p-2 hover:bg-gray-100" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Top action bar */}
        <div className="sticky top-[64px] z-40 bg-white border-b p-3 flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border hover:bg-gray-50">
            Fechar
          </button>
          {isOpen && (
            <>
              <button
                disabled={loading}
                onClick={savePayments}
                className="px-3 py-1.5 rounded-md border hover:bg-gray-50 disabled:opacity-60"
                title={
                  !isCashierOpen && payments.some((p) => p.insertIntoCashier)
                    ? 'Abra o Caixa ou desmarque "Inserir no Caixa" para salvar'
                    : undefined
                }
              >
                Salvar Pagamentos
              </button>
              <button
                disabled={!canFinalize || loading}
                onClick={handleFinalize}
                className="px-3 py-1.5 rounded-md bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60"
                title={
                  !isCashierOpen && payments.some((p) => p.insertIntoCashier)
                    ? 'Abra o Caixa ou desmarque "Inserir no Caixa" para finalizar'
                    : undefined
                }
              >
                Finalizar Comanda
              </button>
            </>
          )}
        </div>

        {/* Quick summary bar */}
        <div className="sticky top-[116px] z-30 bg-white/95 backdrop-blur border-b p-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border p-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <strong>{currency(total)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Desconto</span>
                <span>- {currency(discountAbs)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gorjeta</span>
                <span>{currency(tipAbs)}</span>
              </div>
            </div>

            <div className="rounded-lg border p-2">
              <div className="flex justify-between">
                <span className="text-gray-600">{isOpen ? 'Total a pagar' : 'Total da comanda'}</span>
                <strong>{currency(adjustedTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pago</span>
                <span>{currency(sumPayments)}</span>
              </div>

              {isOpen && (
                <div
                  className={`flex justify-between ${
                    remaining > 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  <span>Restante</span>
                  <span className="font-semibold">{currency(Math.max(0, remaining))}</span>
                </div>
              )}
            </div>
          </div>

          {showSumWarning && (
            <p className="mt-2 text-[12px] text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md px-2.5 py-1.5 inline-flex items-center gap-2">
              <AlertTriangle size={14} />
              A soma dos pagamentos deve ser igual ao total a pagar.
            </p>
          )}

          {isOpen && !isCashierOpen && payments.some((p) => p.insertIntoCashier) && (
            <p className="mt-2 text-[12px] text-red-800 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 inline-flex items-center gap-2">
              <AlertTriangle size={14} />
              Caixa fechado: desmarque “Inserir no Caixa” nas formas de pagamento ou abra o Caixa para continuar.
            </p>
          )}

          {!isOpen && (
            <p className="mt-2 text-[12px] text-slate-600">
              Comanda finalizada. Valores exibidos são informativos.
            </p>
          )}
        </div>

        {/* Body */}
        <div className="h-[calc(100%-9.5rem)] overflow-y-auto p-4 space-y-6">
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
                      <tr key={it.id} className="border-t hover:bg-gray-50/60">
                        <td className="px-3 py-2">{desc}</td>
                        <td className="px-3 py-2 text-right">{it.quantity}</td>
                        <td className="px-3 py-2 text-right">{currency(it.price)}</td>
                        <td className="px-3 py-2 text-right">{currency(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-gray-50">
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
              {isOpen && (
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
                          onBlur={saveTotals}
                        />
                        {!disabled && (
                          <button
                            type="button"
                            title="Ajustar pelo restante"
                            onClick={() => {
                              const diff = Number((adjustedTotal - sumPayments).toFixed(2));
                              if (diff !== 0) {
                                updateRow(idx, { amount: Number((Number(p.amount || 0) + diff).toFixed(2)) });
                              }
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

                    {/* Bandeira */}
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

                    {/* Caixa + remover */}
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
          </section>

          {/* Resumo + Desconto/Gorjeta */}
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
                  onBlur={saveTotals}
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
                  onBlur={saveTotals}
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
                <span>{isOpen ? 'Total a pagar' : 'Total da comanda'}</span>
                <span>{currency(adjustedTotal)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between">
                <span>Pago (somatório)</span>
                <span>{currency(sumPayments)}</span>
              </div>

              {isOpen && (
                <div className="flex justify-between font-semibold">
                  <span>Restante</span>
                  <span>{currency(Math.max(0, remaining))}</span>
                </div>
              )}

              {isOpen && !isCashierOpen && payments.some((p) => p.insertIntoCashier) && (
                <p className="mt-2 text-[12px] text-red-800 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
                  Caixa fechado: desmarque “Inserir no Caixa” nas formas de pagamento ou abra o Caixa para continuar.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-3 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md border hover:bg-gray-50">
            Fechar
          </button>
          {isOpen && (
            <>
              <button
                disabled={loading}
                onClick={savePayments}
                className="px-4 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-60"
                title={
                  !isCashierOpen && payments.some((p) => p.insertIntoCashier)
                    ? 'Abra o Caixa ou desmarque "Inserir no Caixa" para salvar'
                    : undefined
                }
              >
                Salvar Pagamentos
              </button>
              <button
                disabled={!canFinalize || loading}
                onClick={handleFinalize}
                className="px-4 py-2 rounded-md bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60"
                title={
                  !isCashierOpen && payments.some((p) => p.insertIntoCashier)
                    ? 'Abra o Caixa ou desmarque "Inserir no Caixa" para finalizar'
                    : undefined
                }
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
