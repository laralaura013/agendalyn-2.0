// src/components/orders/OrderDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { asArray } from "../../utils/asArray";

import NeuCard from "../ui/NeuCard";
import NeuButton from "../ui/NeuButton";
import "../../styles/neumorphism.css";

const currency = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

const rowDefaults = (remaining = 0, firstMethodId = "") => ({
  paymentMethodId: firstMethodId || "",
  amount: remaining > 0 ? Number(Number(remaining).toFixed(2)) : 0,
  installments: 1,
  cardBrand: "",
  insertIntoCashier: true,
});

const methodIcon = (name = "") => {
  const k = (name || "").toLowerCase();
  if (k.includes("crédito")) return <CreditCard size={16} />;
  if (k.includes("debito") || k.includes("débito")) return <CreditCard size={16} />;
  if (k.includes("pix")) return <Smartphone size={16} />;
  if (k.includes("dinheiro")) return <Banknote size={16} />;
  if (k.includes("boleto")) return <Landmark size={16} />;
  return <CreditCard size={16} />;
};

function asValue({ base, value, mode }) {
  const v = Number(value || 0);
  if (mode === "%") return Math.max(0, Math.round(base * v) / 100);
  return Math.max(0, v);
}

export default function OrderDrawer({ order, open, onClose, refreshOrders }) {
  // Normalizações de entrada
  const safeItems = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order]
  );
  const safeOrderPayments = useMemo(
    () => (Array.isArray(order?.payments) ? order.payments : []),
    [order]
  );

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Caixa
  const [cashierStatus, setCashierStatus] = useState("CLOSED"); // 'OPEN' | 'CLOSED' | 'UNKNOWN'
  const isCashierOpen = cashierStatus === "OPEN";

  // Desconto/Gorjeta com R$ | %
  const [discountValue, setDiscountValue] = useState(0);
  const [discountMode, setDiscountMode] = useState("R$");
  const [tipValue, setTipValue] = useState(0);
  const [tipMode, setTipMode] = useState("R$");

  // Flags de status
  const isOpen = order?.status === "OPEN";
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

  // Carregar métodos de pagamento e status do caixa ao abrir
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [pmRes, cashierRes] = await Promise.allSettled([
          api.get("/payment-methods"),
          api.get("/cashier/status"),
        ]);

        if (pmRes.status === "fulfilled") {
          setPaymentMethods(normalizeList(pmRes.value?.data));
        } else {
          setPaymentMethods([]);
        }

        if (cashierRes.status === "fulfilled") {
          const status = cashierRes.value?.data?.status || "UNKNOWN";
          setCashierStatus(status);
        } else {
          setCashierStatus("UNKNOWN");
        }

        // pagamentos atuais da comanda
        const current = asArray(safeOrderPayments).map((p) => ({
          paymentMethodId: p.paymentMethodId || "",
          amount: Number(p.amount || 0),
          installments: p.installments || 1,
          cardBrand: p.cardBrand || "",
          insertIntoCashier: p.insertIntoCashier !== false,
        }));

        if (!current.length && isOpen) {
          const firstMethodId = normalizeList(pmRes.value?.data)[0]?.id || "";
          setPayments([rowDefaults(total, firstMethodId)]);
          setSelectedIdx(0);
        } else {
          setPayments(current);
          setSelectedIdx(0);
        }

        // Carrega desconto/gorjeta
        if (isOpen) {
          setDiscountValue(0);
          setDiscountMode("R$");
          setTipValue(0);
          setTipMode("R$");
        } else {
          setDiscountValue(Number(order?.discountAmount || 0));
          setDiscountMode(order?.discountMode || "R$");
          setTipValue(Number(order?.tipAmount || 0));
          setTipMode(order?.tipMode || "R$");
        }
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar dados da comanda.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order, total]);

  const disabled = !isOpen;

  const updateRow = (idx, patch) => {
    setPayments((prev) => asArray(prev).map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const firstMethodId = paymentMethods?.[0]?.id || "";
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
      toast("Nada a distribuir: total já bate.", { icon: "👌" });
      return;
    }
    if (payments.length === 0) {
      const firstMethodId = paymentMethods?.[0]?.id || "";
      setPayments([rowDefaults(rest, firstMethodId)]);
      setSelectedIdx(0);
      return;
    }
    const n = payments.length;
    const share = Math.floor((rest * 100) / n) / 100;
    const remainder = Number((rest - share * (n - 1)).toFixed(2));
    setPayments((prev) =>
      asArray(prev).map((p, i) => ({
        ...p,
        amount: Number((Number(p.amount || 0) + (i === n - 1 ? remainder : share)).toFixed(2)),
      }))
    );
  };

  const zeroDifferenceOnSelected = () => {
    if (payments.length === 0) {
      const firstMethodId = paymentMethods?.[0]?.id || "";
      setPayments([rowDefaults(remaining, firstMethodId)]);
      setSelectedIdx(0);
      return;
    }
    const diff = Number((adjustedTotal - sumPayments).toFixed(2));
    if (diff === 0) {
      toast("Nada a ajustar: total já bate.", { icon: "👌" });
      return;
    }
    setPayments((prev) =>
      asArray(prev).map((p, i) =>
        i === selectedIdx ? { ...p, amount: Number((Number(p.amount || 0) + diff).toFixed(2)) } : p
      )
    );
  };

  // ====== Caixa ======
  const refreshCashierStatus = async () => {
    try {
      const res = await api.get("/cashier/status");
      const s = res?.data?.status || "UNKNOWN";
      setCashierStatus(s);
      return s;
    } catch {
      setCashierStatus("UNKNOWN");
      return "UNKNOWN";
    }
  };

  const handleOpenCashier = async () => {
    try {
      const p = api.post("/cashier/open");
      await toast.promise(p, {
        loading: "Abrindo caixa...",
        success: "Caixa aberto!",
        error: (e) => e?.response?.data?.message || "Erro ao abrir caixa.",
      });
      await refreshCashierStatus();
    } catch {}
  };

  const handleCloseCashier = async () => {
    try {
      const p = api.post("/cashier/close");
      await toast.promise(p, {
        loading: "Fechando caixa...",
        success: "Caixa fechado!",
        error: (e) => e?.response?.data?.message || "Erro ao fechar caixa.",
      });
      await refreshCashierStatus();
    } catch {}
  };

  const ensureCashierOk = async () => {
    const s = await refreshCashierStatus();
    if (payments.some((p) => p.insertIntoCashier) && s !== "OPEN") {
      toast.error('Caixa fechado: desmarque “Inserir no Caixa” ou abra o Caixa para continuar.');
      return false;
    }
    return true;
  };

  // Salvar pagamentos + totais
  const savePayments = async () => {
    try {
      setLoading(true);
      if (!payments.length) {
        toast.error("Adicione ao menos uma forma de pagamento.");
        return;
      }
      if (!(await ensureCashierOk())) return;

      // valida método
      const invalid = payments.find((p) => !p.paymentMethodId);
      if (invalid) {
        toast.error("Selecione uma forma de pagamento para todas as linhas.");
        return;
      }

      const payload = {
        payments: asArray(payments).map((p) => ({
          paymentMethodId: p.paymentMethodId,
          amount: Number(Number(p.amount || 0).toFixed(2)),
          installments: Math.max(1, parseInt(p.installments || 1, 10)),
          cardBrand: p.cardBrand || undefined,
          insertIntoCashier: !!p.insertIntoCashier,
        })),
        discount: Number(discountValue || 0),
        discountMode,
        tip: Number(tipValue || 0),
        tipMode,
        expectedTotal: Number(adjustedTotal || 0),
      };

      await api.put(`/orders/${order.id}/payments`, payload);
      toast.success("Pagamentos e totais salvos!");
      await refreshOrders?.();
    } catch (e) {
      const msg = e?.response?.data?.message || "Erro ao salvar pagamentos.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setLoading(true);
      if (!(await ensureCashierOk())) return;

      await savePayments(); // inclui totais
      await api.put(`/orders/${order.id}/finish`);
      toast.success("Comanda finalizada!");
      await refreshOrders?.();
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || "Erro ao finalizar comanda.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = () => {
    const s = order?.status;
    if (s === "OPEN")
      return <span className="neu-chip text-amber-700">ABERTA</span>;
    if (s === "FINISHED")
      return <span className="neu-chip text-emerald-700">FINALIZADA</span>;
    if (s === "CANCELED")
      return <span className="neu-chip text-rose-700">CANCELADA</span>;
    return null;
  };

  const CashierBadge = () => {
    if (cashierStatus === "OPEN")
      return <span className="neu-chip text-emerald-700">CAIXA: ABERTO</span>;
    if (cashierStatus === "CLOSED")
      return <span className="neu-chip text-slate-700">CAIXA: FECHADO</span>;
    return <span className="neu-chip text-slate-600">CAIXA: —</span>;
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[720px] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <NeuCard className="h-full rounded-none flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5">
              <h2 className="text-lg font-semibold text-[var(--text-color)]">
                Comanda #{order?.id?.slice?.(0, 8) || "—"}
              </h2>
              <p className="text-xs text-[var(--text-color)] opacity-80">
                Cliente: <strong>{order?.client?.name || "N/A"}</strong> •
                {"  "}Colaborador: <strong>{order?.user?.name || "N/A"}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <CashierBadge />
              <NeuButton
                className="!px-2 !py-1 text-xs"
                onClick={refreshCashierStatus}
                title="Recarregar status do caixa"
              >
                Atualizar status
              </NeuButton>
              {cashierStatus === "CLOSED" && (
                <NeuButton className="!px-2 !py-1 text-xs" onClick={handleOpenCashier}>
                  Abrir Caixa
                </NeuButton>
              )}
              {cashierStatus === "OPEN" && (
                <NeuButton className="!px-2 !py-1 text-xs" onClick={handleCloseCashier}>
                  Fechar Caixa
                </NeuButton>
              )}
              <StatusBadge />
              <NeuButton
                className="!px-2 !py-2 rounded-xl"
                onClick={onClose}
                title="Fechar"
                aria-label="Fechar"
              >
                <X size={18} />
              </NeuButton>
            </div>
          </div>

          {/* Top action bar */}
          <div className="sticky top-0 z-40 px-3 pb-3">
            <NeuCard inset className="p-3 flex gap-2 justify-end">
              <NeuButton onClick={onClose} className="!px-3 !py-1.5">
                Fechar
              </NeuButton>
              {isOpen && (
                <>
                  <NeuButton
                    onClick={savePayments}
                    className="!px-3 !py-1.5"
                    disabled={loading}
                    title={
                      !isCashierOpen && payments.some((p) => p.insertIntoCashier)
                        ? 'Abra o Caixa ou desmarque "Inserir no Caixa" para salvar'
                        : undefined
                    }
                  >
                    Salvar Pagamentos
                  </NeuButton>
                  <NeuButton
                    variant="primary"
                    onClick={handleFinalize}
                    className="!px-3 !py-1.5"
                    disabled={!canFinalize || loading}
                    title={
                      !isCashierOpen && payments.some((p) => p.insertIntoCashier)
                        ? 'Abra o Caixa ou desmarque "Inserir no Caixa" para finalizar'
                        : undefined
                    }
                  >
                    Finalizar Comanda
                  </NeuButton>
                </>
              )}
            </NeuCard>
          </div>

          {/* Quick summary */}
          <div className="px-3">
            <NeuCard inset className="p-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl p-2">
                  <div className="flex justify-between text-[var(--text-color)]">
                    <span className="opacity-80">Subtotal</span>
                    <strong>{currency(total)}</strong>
                  </div>
                  <div className="flex justify-between text-[var(--text-color)]">
                    <span className="opacity-80">Desconto</span>
                    <span>- {currency(discountAbs)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-color)]">
                    <span className="opacity-80">Gorjeta</span>
                    <span>{currency(tipAbs)}</span>
                  </div>
                </div>

                <div className="rounded-xl p-2">
                  <div className="flex justify-between text-[var(--text-color)]">
                    <span className="opacity-80">
                      {isOpen ? "Total a pagar" : "Total da comanda"}
                    </span>
                    <strong>{currency(adjustedTotal)}</strong>
                  </div>
                  <div className="flex justify-between text-[var(--text-color)]">
                    <span className="opacity-80">Pago</span>
                    <span>{currency(sumPayments)}</span>
                  </div>

                  {isOpen && (
                    <div
                      className={`flex justify-between ${
                        remaining > 0 ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      <span>Restante</span>
                      <span className="font-semibold">
                        {currency(Math.max(0, remaining))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {showSumWarning && (
                <p className="mt-2 text-[12px] text-amber-700 inline-flex items-center gap-2">
                  <AlertTriangle size={14} />
                  A soma dos pagamentos deve ser igual ao total a pagar.
                </p>
              )}

              {isOpen && !isCashierOpen && payments.some((p) => p.insertIntoCashier) && (
                <p className="mt-2 text-[12px] text-rose-700 inline-flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Caixa fechado: desmarque “Inserir no Caixa” nas formas de pagamento ou abra o
                  Caixa para continuar.
                </p>
              )}

              {!isOpen && (
                <p className="mt-2 text-[12px] text-[var(--text-color)] opacity-70">
                  Comanda finalizada. Valores exibidos são informativos.
                </p>
              )}
            </NeuCard>
          </div>

          {/* Body */}
          <div className="h-[calc(100%-14rem)] overflow-y-auto p-4 space-y-6">
            {/* Itens */}
            <section>
              <h3 className="text-sm font-semibold text-[var(--text-color)] mb-2">Itens</h3>
              <NeuCard inset className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--text-color)] opacity-80">
                        <th className="px-3 py-2">Descrição</th>
                        <th className="px-3 py-2 text-right">Qtd</th>
                        <th className="px-3 py-2 text-right">Preço</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asArray(safeItems).map((it) => {
                        const desc = it?.service?.name || it?.product?.name || "Item";
                        const price = Number(it?.price || 0);
                        const qty = Number(it?.quantity || 0);
                        const subtotal = price * qty;
                        return (
                          <tr key={it?.id} className="border-t">
                            <td className="px-3 py-2 text-[var(--text-color)]">{desc}</td>
                            <td className="px-3 py-2 text-right text-[var(--text-color)]">{qty}</td>
                            <td className="px-3 py-2 text-right text-[var(--text-color)]">
                              {currency(price)}
                            </td>
                            <td className="px-3 py-2 text-right text-[var(--text-color)]">
                              {currency(subtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-semibold text-[var(--text-color)]" colSpan={3}>
                          Total
                        </td>
                        <td className="px-3 py-2 font-semibold text-right text-[var(--text-color)]">
                          {currency(total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </NeuCard>
            </section>

            {/* Pagamentos */}
            <section>
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-color)]">
                  Formas de Pagamento
                </h3>
                {isOpen && (
                  <div className="flex flex-wrap gap-2">
                    <NeuButton type="button" onClick={addRow} className="!px-3 !py-1.5 text-sm">
                      <PlusCircle size={16} /> Adicionar
                    </NeuButton>
                    <NeuButton
                      type="button"
                      onClick={distributeEqually}
                      className="!px-3 !py-1.5 text-sm"
                      title="Distribuir o restante igualmente entre as formas"
                    >
                      Distribuir restante igualmente
                    </NeuButton>
                    <NeuButton
                      type="button"
                      onClick={zeroDifferenceOnSelected}
                      className="!px-3 !py-1.5 text-sm"
                      title="Aplicar toda a diferença na linha selecionada"
                    >
                      Zerar diferença (linha selecionada)
                    </NeuButton>
                  </div>
                )}
              </div>

              {!payments.length && (
                <NeuCard inset className="p-3 text-sm text-[var(--text-color)] opacity-80">
                  Nenhuma forma de pagamento adicionada.
                </NeuCard>
              )}

              <div className="space-y-3">
                {asArray(payments).map((p, idx) => {
                  const method = paymentMethods.find((m) => m.id === p.paymentMethodId);
                  const methodName = method?.name || "—";
                  const showCardBrand =
                    (methodName || "").toLowerCase().includes("crédito") ||
                    (methodName || "").toLowerCase().includes("cartão");
                  const selected = idx === selectedIdx;

                  return (
                    <NeuCard
                      key={idx}
                      className={`p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 ${
                        selected ? "ring-2 ring-purple-500/30" : ""
                      }`}
                    >
                      {/* Seletor */}
                      <div className="sm:col-span-12 -mt-1 -mb-1">
                        <button
                          type="button"
                          onClick={() => setSelectedIdx(idx)}
                          className="flex items-center gap-2 text-xs text-[var(--text-color)] opacity-80 hover:opacity-100"
                          title="Selecionar esta forma para ações rápidas"
                        >
                          {selected ? <CircleDot size={14} /> : <Circle size={14} />}
                          {selected ? "Linha selecionada" : "Selecionar linha"}
                        </button>
                      </div>

                      {/* Método */}
                      <div className="sm:col-span-5">
                        <label className="text-xs font-medium text-[var(--text-color)]">Forma</label>
                        <div className="flex items-center gap-2">
                          <span className="opacity-80 text-[var(--text-color)]">
                            {methodIcon(methodName)}
                          </span>
                          <select
                            disabled={disabled}
                            value={p.paymentMethodId}
                            onChange={(e) => updateRow(idx, { paymentMethodId: e.target.value })}
                            className="w-full px-3 py-2 text-sm border rounded-md bg-transparent text-[var(--text-color)]"
                          >
                            {asArray(paymentMethods).map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Valor */}
                      <div className="sm:col-span-3">
                        <label className="text-xs font-medium text-[var(--text-color)]">
                          Valor
                        </label>
                        <div className="flex gap-2">
                          <input
                            disabled={disabled}
                            type="number"
                            min="0"
                            step="0.01"
                            value={p.amount}
                            onChange={(e) =>
                              updateRow(idx, { amount: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 text-sm border rounded-md bg-transparent text-[var(--text-color)]"
                          />
                          {!disabled && (
                            <NeuButton
                              type="button"
                              title="Ajustar pelo restante"
                              onClick={() => {
                                const diff = Number((adjustedTotal - sumPayments).toFixed(2));
                                if (diff !== 0) {
                                  updateRow(idx, {
                                    amount: Number((Number(p.amount || 0) + diff).toFixed(2)),
                                  });
                                }
                              }}
                              className="shrink-0 !px-3 !py-2 text-xs"
                            >
                              resto
                            </NeuButton>
                          )}
                        </div>
                      </div>

                      {/* Parcelas */}
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-[var(--text-color)]">
                          Parcelas
                        </label>
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
                          className="w-full px-3 py-2 text-sm border rounded-md bg-transparent text-[var(--text-color)]"
                        />
                      </div>

                      {/* Bandeira */}
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-[var(--text-color)]">
                          Bandeira
                        </label>
                        <input
                          disabled={disabled || !showCardBrand}
                          placeholder={showCardBrand ? "VISA, Master..." : "—"}
                          value={p.cardBrand}
                          onChange={(e) => updateRow(idx, { cardBrand: e.target.value })}
                          className="w-full px-3 py-2 text-sm border rounded-md bg-transparent text-[var(--text-color)] disabled:opacity-60"
                        />
                      </div>

                      {/* Caixa + remover */}
                      <div className="sm:col-span-12 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-[var(--text-color)]">
                          <input
                            disabled={disabled}
                            type="checkbox"
                            checked={!!p.insertIntoCashier}
                            onChange={(e) =>
                              updateRow(idx, { insertIntoCashier: e.target.checked })
                            }
                          />
                          Inserir no Caixa (receber agora a parcela 1)
                        </label>
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="text-rose-600 text-sm hover:underline"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </NeuCard>
                  );
                })}
              </div>
            </section>

            {/* Resumo + Desconto/Gorjeta */}
            <section>
              <h3 className="text-sm font-semibold text-[var(--text-color)] mb-2">Resumo</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {/* Desconto */}
                <NeuCard className="p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[var(--text-color)]">
                      Desconto
                    </label>
                    <div className="text-[11px] border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDiscountMode("R$")}
                        className={`px-2 py-0.5 ${
                          discountMode === "R$" ? "bg-purple-700 text-white" : ""
                        }`}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountMode("%")}
                        className={`px-2 py-0.5 border-l ${
                          discountMode === "%" ? "bg-purple-700 text-white" : ""
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!isOpen}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value || 0)))}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-transparent text-[var(--text-color)]"
                  />
                  <p className="text-[11px] text-[var(--text-color)] opacity-80 mt-1">
                    {discountMode === "%"
                      ? `= ${currency(discountAbs)} (${discountValue || 0}% de ${currency(total)})`
                      : `= ${currency(discountAbs)}`}
                  </p>
                </NeuCard>

                {/* Gorjeta */}
                <NeuCard className="p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[var(--text-color)]">
                      Gorjeta
                    </label>
                    <div className="text-[11px] border rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setTipMode("R$")}
                        className={`px-2 py-0.5 ${
                          tipMode === "R$" ? "bg-purple-700 text-white" : ""
                        }`}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipMode("%")}
                        className={`px-2 py-0.5 border-l ${
                          tipMode === "%" ? "bg-purple-700 text-white" : ""
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!isOpen}
                    value={tipValue}
                    onChange={(e) => setTipValue(Math.max(0, Number(e.target.value || 0)))}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-transparent text-[var(--text-color)]"
                  />
                  <p className="text-[11px] text-[var(--text-color)] opacity-80 mt-1">
                    {tipMode === "%"
                      ? `= ${currency(tipAbs)} (${tipValue || 0}% de ${currency(total)})`
                      : `= ${currency(tipAbs)}`}
                  </p>
                </NeuCard>
              </div>

              <NeuCard className="p-3 space-y-1 text-sm">
                <div className="flex justify-between text-[var(--text-color)]">
                  <span>Subtotal</span>
                  <span>{currency(total)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-color)]">
                  <span>Desconto ({discountMode})</span>
                  <span>- {currency(discountAbs)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-color)]">
                  <span>Gorjeta ({tipMode})</span>
                  <span>{currency(tipAbs)}</span>
                </div>
                <div className="flex justify-between font-semibold text-[var(--text-color)]">
                  <span>{isOpen ? "Total a pagar" : "Total da comanda"}</span>
                  <span>{currency(adjustedTotal)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-[var(--text-color)]">
                  <span>Pago (somatório)</span>
                  <span>{currency(sumPayments)}</span>
                </div>

                {isOpen && (
                  <div className="flex justify-between font-semibold text-[var(--text-color)]">
                    <span>Restante</span>
                    <span>{currency(Math.max(0, remaining))}</span>
                  </div>
                )}

                {isOpen && !isCashierOpen && payments.some((p) => p.insertIntoCashier) && (
                  <p className="mt-2 text-[12px] text-rose-700">
                    Caixa fechado: desmarque “Inserir no Caixa” nas formas de pagamento ou abra o
                    Caixa para continuar.
                  </p>
                )}
              </NeuCard>
            </section>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-3 pb-3">
            <NeuCard inset className="p-3 flex gap-3 justify-end">
              <NeuButton onClick={onClose} className="!px-4 !py-2">
                Fechar
              </NeuButton>
              {isOpen && (
                <>
                  <NeuButton
                    onClick={savePayments}
                    className="!px-4 !py-2"
                    disabled={loading}
                    title={
                      !isCashierOpen && payments.some((p) => p.insertIntoCashier)
                        ? 'Abra o Caixa ou desmarque "Inserir no Caixa" para salvar'
                        : undefined
                    }
                  >
                    Salvar Pagamentos
                  </NeuButton>
                  <NeuButton
                    variant="primary"
                    onClick={handleFinalize}
                    className="!px-4 !py-2"
                    disabled={!canFinalize || loading}
                    title={
                      !isCashierOpen && payments.some((p) => p.insertIntoCashier)
                        ? 'Abra o Caixa ou desmarque "Inserir no Caixa" para finalizar'
                        : undefined
                    }
                  >
                    Finalizar Comanda
                  </NeuButton>
                </>
              )}
            </NeuCard>
          </div>
        </NeuCard>
      </div>
    </div>
  );
}
