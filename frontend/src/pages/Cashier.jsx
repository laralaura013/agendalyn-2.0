// src/pages/Cashier.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  RefreshCcw,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Search,
  Download,
  CalendarDays,
  Filter,
  X,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import CashierControll from '../components/cashier/CashierControll';
import { asArray } from '../utils/asArray';

/* =========================================================================
 * Helpers
 * ========================================================================= */
const toBRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const todayISO = () => new Date().toISOString().slice(0, 10);
const safeStr = (s) => (s == null ? '' : String(s));

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

const downloadCSV = (filename, rows) => {
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/* =========================================================================
 * Normalização de status (compatível com legado e novo)
 * ========================================================================= */
function normalizeStatus(data) {
  const statusRaw = data?.status || (data?.isOpen ? 'OPEN' : 'CLOSED');
  const isOpen = statusRaw === 'OPEN' || !!data?.isOpen;

  // LEGADO
  if (data?.session) {
    const opening = Number(data.session.openingBalance || 0);
    const txs = Array.isArray(data.session.transactions) ? data.session.transactions : [];
    const income = txs
      .filter((t) => t?.type === 'INCOME')
      .reduce((s, t) => s + Number(t?.amount || 0), 0);
    const expense = txs
      .filter((t) => t?.type === 'EXPENSE')
      .reduce((s, t) => s + Number(t?.amount || 0), 0);
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

  // NOVO
  const t = data?.totalsToday || { income: 0, expense: 0, balance: 0 };
  const opening = Number(data?.openingBalance ?? 0);
  const income = Number(t.income || 0);
  const expense = Number(t.expense || 0);
  const hasBalance = Object.prototype.hasOwnProperty.call(t, 'balance');
  const balance = hasBalance ? Number(t.balance || 0) : income - expense;

  return {
    isOpen,
    mode: 'new',
    openingBalance: Number.isFinite(opening) ? opening : null,
    income,
    expense,
    balance,
    raw: data,
  };
}

/* =========================================================================
 * Opções de filtro (para a tabela por dia)
 * ========================================================================= */
const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'INCOME', label: 'Entradas' },
  { value: 'EXPENSE', label: 'Saídas' },
];

/* =========================================================================
 * Gráfico de barras por método (sem libs externas)
 * ========================================================================= */
const BarChartByMethod = ({ data }) => {
  const width = 560;
  const height = 180;
  const padding = 28;
  const barW = 22;
  const gap = 20;

  const yVals = asArray(data).map((d) =>
    Math.max(Number(d.entries || 0), Number(d.exits || 0))
  );
  const maxY = Math.max(1, ...yVals);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" />

      {asArray(data).map((d, i) => {
        const x0 = padding + i * (barW * 2 + gap);
        const entriesH = (Number(d.entries || 0) * (height - 2 * padding)) / maxY;
        const exitsH = (Number(d.exits || 0) * (height - 2 * padding)) / maxY;
        return (
          <g key={i}>
            <rect x={x0} y={height - padding - entriesH} width={barW} height={entriesH} fill="#059669" rx="3" />
            <rect x={x0 + barW + 6} y={height - padding - exitsH} width={barW} height={exitsH} fill="#dc2626" rx="3" />
            <text x={x0 + barW} y={height - padding + 12} textAnchor="middle" fontSize="10" fill="#6b7280">
              {safeStr(d.name || '').slice(0, 10)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* =========================================================================
 * Modal simples (inline)
 * ========================================================================= */
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 left-0 top-10 mx-auto w-[96%] sm:w-[720px] bg-white rounded-xl shadow-lg">
        {children}
      </div>
    </div>
  );
};

/* =========================================================================
 * Cashier Page
 * ========================================================================= */
const Cashier = () => {
  // ---- Status principal do caixa
  const [view, setView] = useState({
    isOpen: false,
    mode: 'legacy',
    openingBalance: null,
    income: 0,
    expense: 0,
    balance: 0,
    raw: null,
  });
  const [loadingStatus, setLoadingStatus] = useState(true);

  // ---- Estado LEGADO para o CashierControll (fallback se API falhar)
  const [legacySession, setLegacySession] = useState({
    status: 'CLOSED',
    openingBalance: 0,
    transactions: [],
  });

  // ---- Filtros e dados auxiliares
  const [date, setDate] = useState(todayISO());
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [methodId, setMethodId] = useState('');
  const [userId, setUserId] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [staff, setStaff] = useState([]);

  // ---- Resumos e “tabela por dia”
  const [summary, setSummary] = useState({
    entries: 0,
    exits: 0,
    balance: 0,
    byMethod: [],
  });
  const [byDayRows, setByDayRows] = useState([]); // [{date, income, expense, balance}]
  const [loadingTable, setLoadingTable] = useState(true);

  const isOpen = view.isOpen;

  // ---- Modal Fechamento com contagem
  const [closeOpenModal, setCloseOpenModal] = useState(false);
  const DENOMS = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05];
  const [counts, setCounts] = useState(
    Object.fromEntries(asArray(DENOMS).map((v) => [String(v), 0]))
  );
  const [closeNote, setCloseNote] = useState('');

  const countedTotal = useMemo(
    () => DENOMS.reduce((sum, v) => sum + Number(counts[String(v)] || 0) * v, 0).toFixed(2),
    [counts]
  );
  const expectedTotal = useMemo(
    () =>
      Number(
        Number(view.openingBalance || 0) + Number(view.income || 0) - Number(view.expense || 0)
      ).toFixed(2),
    [view.openingBalance, view.income, view.expense]
  );
  const diffTotal = useMemo(
    () => (Number(countedTotal) - Number(expectedTotal)).toFixed(2),
    [countedTotal, expectedTotal]
  );

  /* ---------------- Basics ---------------- */
  const loadBasics = useCallback(async () => {
    try {
      const [pm, st] = await Promise.allSettled([api.get('/payment-methods'), api.get('/staff')]);
      setPaymentMethods(pm.status === 'fulfilled' ? normalizeList(pm.value?.data) : []);
      setStaff(st.status === 'fulfilled' ? normalizeList(st.value?.data) : []);
    } catch {
      setPaymentMethods([]);
      setStaff([]);
    }
  }, []);

  /* ---------------- Status ---------------- */
  const fetchCashierStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await api.get('/cashier/status');
      const normalized = normalizeStatus(res.data || {});
      setView(normalized);

      // Mantém o CashierControll em sincronia com o status real
      if (normalized.isOpen) {
        setLegacySession({
          status: 'OPEN',
          openingBalance: Number(normalized.openingBalance || 0),
          transactions: Array.isArray(normalized.raw?.session?.transactions)
            ? normalized.raw.session.transactions
            : [],
        });
      } else {
        setLegacySession({ status: 'CLOSED', openingBalance: 0, transactions: [] });
      }
    } catch (error) {
      console.error('Erro ao buscar status do caixa:', error);
      toast.error(error?.response?.data?.message || 'Não foi possível carregar o status do caixa.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  /* ---------------- Summary ---------------- */
  const loadSummary = useCallback(async () => {
    try {
      const from = `${date}T00:00:00.000`;
      const to = `${date}T23:59:59.999`;

      const r = await api.get('/cashier/summary', { params: { from, to } });
      const totals = r?.data?.totals || { income: 0, expense: 0, balance: 0 };

      // “por método” combinando receivables (entradas) e payables (saídas)
      const recvPM = normalizeList(r?.data?.receivables?.byPaymentMethod).map((x) => ({
        id: x.paymentMethodId || null,
        name: x.name || '—',
        entries: Number(x.amount || 0),
      }));
      const payPM = normalizeList(r?.data?.payables?.byPaymentMethod).map((x) => ({
        id: x.paymentMethodId || null,
        name: x.name || '—',
        exits: Number(x.amount || 0),
      }));

      // Combina por id/nome
      const map = new Map();
      for (const e of recvPM) {
        const key = e.id || `__${e.name}`;
        map.set(key, { name: e.name, entries: e.entries, exits: 0 });
      }
      for (const s of payPM) {
        const key = s.id || `__${s.name}`;
        const prev = map.get(key) || { name: s.name, entries: 0, exits: 0 };
        prev.exits += s.exits || 0;
        map.set(key, prev);
      }
      const byMethod = Array.from(map.values()).sort(
        (a, b) => b.entries + b.exits - (a.entries + a.exits)
      );

      setSummary({
        entries: Number(totals.income || 0),
        exits: Number(totals.expense || 0),
        balance: Number(totals.balance || 0),
        byMethod,
      });
    } catch {
      // fallback: calcula a partir do status
      const entries = Number(view.income || 0);
      const exits = Number(view.expense || 0);
      setSummary({ entries, exits, balance: entries - exits, byMethod: [] });
    }
  }, [date, view.expense, view.income]);

  /* ---------------- Tabela por dia ---------------- */
  const loadByDay = useCallback(async () => {
    try {
      setLoadingTable(true);
      const from = `${date}T00:00:00.000`;
      const to = `${date}T23:59:59.999`;

      const r = await api.get('/cashier/statement', { params: { from, to } });
      const arr = normalizeList(r?.data?.byDay);

      // Filtros simples (tipo)
      const filtered = arr.filter((row) => {
        if (!type) return true;
        if (type === 'INCOME') return Number(row.income || 0) > 0;
        if (type === 'EXPENSE') return Number(row.expense || 0) > 0;
        return true;
      });

      // Filtro texto (q)
      const filteredQ = q
        ? filtered.filter((row) => {
            const s = `${row.date} ${row.income} ${row.expense} ${row.balance}`.toLowerCase();
            return s.includes(q.toLowerCase());
          })
        : filtered;

      setByDayRows(filteredQ);
    } catch (e) {
      console.error(e);
      setByDayRows([]);
    } finally {
      setLoadingTable(false);
    }
  }, [date, q, type]);

  /* ---------------- init & refresh ---------------- */
  useEffect(() => {
    loadBasics();
    fetchCashierStatus();
  }, [loadBasics, fetchCashierStatus]);

  useEffect(() => {
    loadSummary();
    loadByDay();
  }, [loadSummary, loadByDay]);

  useEffect(() => {
    const handler = () => {
      fetchCashierStatus();
      loadSummary();
      loadByDay();
    };
    window.addEventListener('cashier:refresh', handler);
    return () => window.removeEventListener('cashier:refresh', handler);
  }, [fetchCashierStatus, loadSummary, loadByDay]);

  /* ---------------- Actions ---------------- */
  const handleOpenCashier = async () => {
    const initial = view.openingBalance ?? 0;
    const openingBalanceStr = prompt(
      'Digite o valor de abertura do caixa (fundo de troco):',
      Number(initial).toFixed(2)
    );
    if (openingBalanceStr === null) return;

    const opening = parseFloat(String(openingBalanceStr).replace(',', '.'));
    if (Number.isNaN(opening) || opening < 0) {
      toast.error('Valor inválido.');
      return;
    }

    try {
      const payload = { openingAmount: opening };
      await api.post('/cashier/open', payload);
      await Promise.all([fetchCashierStatus(), loadSummary(), loadByDay()]);
      toast.success('Caixa aberto!');
    } catch (error) {
      // Fallback local (modo legado)
      setLegacySession({ status: 'OPEN', openingBalance: opening, transactions: [] });
      setView({
        isOpen: true,
        mode: 'legacy',
        openingBalance: opening,
        income: 0,
        expense: 0,
        balance: opening,
        raw: null,
      });
      toast('Caixa aberto (modo local).', { icon: '⚠️' });
    }
  };

  const handleCloseCashier = async () => {
    setCloseOpenModal(true);
  };

  const confirmClose = async () => {
    try {
      const details = {
        countedTotal: Number(countedTotal),
        expectedTotal: Number(expectedTotal),
        diff: Number(diffTotal),
        denominations: Object.entries(counts).map(([denom, qtd]) => ({
          denom: Number(denom),
          qty: Number(qtd || 0),
          total: Number((Number(qtd || 0) * Number(denom)).toFixed(2)),
        })),
        note: closeNote || '',
      };

      await api.post('/cashier/close', details);
      setCloseOpenModal(false);
      setCounts(Object.fromEntries(asArray(DENOMS).map((v) => [String(v), 0])));
      setCloseNote('');
      await Promise.all([fetchCashierStatus(), loadSummary(), loadByDay()]);
      toast.success('Caixa fechado!');
    } catch (error) {
      // Fallback local
      setCloseOpenModal(false);
      setCounts(Object.fromEntries(asArray(DENOMS).map((v) => [String(v), 0])));
      setCloseNote('');
      setLegacySession({ status: 'CLOSED', openingBalance: 0, transactions: [] });
      setView((v) => ({ ...v, isOpen: false }));
      toast('Caixa fechado (modo local).', { icon: '⚠️' });
    }
  };

  const exportDaily = () => {
    const header = ['Data;Entradas;Saídas;Saldo acumulado'];
    const lines = asArray(byDayRows).map((row) => {
      const dt = row.date;
      const inc = Number(row.income || 0).toFixed(2).replace('.', ',');
      const exp = Number(row.expense || 0).toFixed(2).replace('.', ',');
      const bal = Number(row.balance || 0).toFixed(2).replace('.', ',');
      return `${dt};${inc};${exp};${bal}`;
    });
    downloadCSV(`resumo_diario_${date}.csv`, [...header, ...lines]);
  };

  /* ---------------- UI ---------------- */
  if (loadingStatus) {
    return (
      <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
        <p className="text-gray-500">Carregando informações do caixa...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Controle de Caixa</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              Promise.all([fetchCashierStatus(), loadSummary(), loadByDay()]).then(() =>
                toast.success('Atualizado!')
              );
            }}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-md bg-white hover:bg-gray-50"
            title="Atualizar"
          >
            <RefreshCcw size={16} /> Atualizar
          </button>
          {isOpen ? (
            <button
              onClick={handleCloseCashier}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              Fechar Caixa
            </button>
          ) : (
            <button
              onClick={handleOpenCashier}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Abrir Caixa
            </button>
          )}
        </div>
      </div>

      {/* Status + Ações rápidas */}
      <div className="mb-4">
        <div className="rounded-xl border p-4 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`px-3 py-1 text-xs font-bold rounded-full ${
                isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Caixa {isOpen ? 'Aberto' : 'Fechado'}
            </div>
            {view.openingBalance !== null && (
              <div className="text-sm text-gray-600">
                Saldo inicial: <strong>{toBRL(view.openingBalance)}</strong>
              </div>
            )}
          </div>
          {isOpen && (
            <div className="flex gap-2">
              <CashierControll session={legacySession} setSession={setLegacySession} />
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Entradas (Recebimentos)</span>
            <ArrowDownCircle className="text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {toBRL(summary.entries || view.income)}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Saídas (Pagamentos)</span>
            <ArrowUpCircle className="text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-600">
            {toBRL(summary.exits || view.expense)}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Saldo do Dia</span>
            <Wallet className="text-slate-700" />
          </div>
          <div className="mt-2 text-2xl font-bold">
            {toBRL(
              'balance' in summary ? summary.balance : Number(view.income || 0) - Number(view.expense || 0)
            )}
          </div>
        </div>
      </div>

      {/* Filtros + Resumo por método */}
      <div className="rounded-2xl border bg-white p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <label className="flex items-center gap-2">
            <CalendarDays size={16} />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
              }}
              className="border rounded-md px-3 py-1.5 text-sm"
            />
          </label>

          <label className="flex items-center gap-2">
            <Filter size={16} />
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
              }}
              className="border rounded-md px-3 py-1.5 text-sm w-full"
            >
              {asArray(TYPE_OPTIONS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <select
            value={methodId}
            onChange={(e) => {
              setMethodId(e.target.value);
            }}
            className="border rounded-md px-3 py-1.5 text-sm w-full"
          >
            <option value="">Método de pagamento (todos)</option>
            {asArray(paymentMethods).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
            }}
            className="border rounded-md px-3 py-1.5 text-sm w-full"
          >
            <option value="">Usuário (todos)</option>
            {asArray(staff).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <div className="md:col-span-2 flex items-center gap-2">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
              }}
              placeholder="Buscar no resumo diário…"
              className="border rounded-md px-3 py-1.5 text-sm w-full"
            />
          </div>
        </div>

        {/* Por método (mini-resumo) + gráfico */}
        {summary.byMethod?.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border p-3">
              <div className="text-sm font-semibold mb-2">Resumo por método</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {asArray(summary.byMethod).map((bm, idx) => (
                  <div key={idx} className="rounded-lg border p-3">
                    <div className="text-xs text-gray-500">Método</div>
                    <div className="font-semibold">{bm.name || '—'}</div>
                    <div className="mt-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Entradas</span>
                        <span className="text-emerald-700">{toBRL(bm.entries || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Saídas</span>
                        <span className="text-red-700">{toBRL(bm.exits || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="text-sm font-semibold mb-2">Barras por método</div>
              <BarChartByMethod data={summary.byMethod} />
            </div>
          </div>
        )}
      </div>

      {/* Tabela — Resumo por dia */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">
          {loadingTable ? 'Carregando…' : `${byDayRows.length} dia(s) no período`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportDaily}
            className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50"
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2 text-right">Entradas</th>
              <th className="px-3 py-2 text-right">Saídas</th>
              <th className="px-3 py-2 text-right">Saldo acumulado</th>
            </tr>
          </thead>
          <tbody>
            {asArray(byDayRows).map((row, i) => {
              const dt = row.date;
              const inc = Number(row.income || 0);
              const exp = Number(row.expense || 0);
              const bal = Number(row.balance || 0);
              return (
                <tr key={dt || i} className="border-t">
                  <td className="px-3 py-2">{dt}</td>
                  <td className="px-3 py-2 text-right text-emerald-700">{toBRL(inc)}</td>
                  <td className="px-3 py-2 text-right text-red-700">{toBRL(exp)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{toBRL(bal)}</td>
                </tr>
              );
            })}
            {!loadingTable && asArray(byDayRows).length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  Nenhum registro encontrado para o dia selecionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Fechamento com contagem */}
      <Modal open={closeOpenModal} onClose={() => setCloseOpenModal(false)}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Fechar Caixa — Contagem de Dinheiro</h3>
            <button
              onClick={() => setCloseOpenModal(false)}
              className="p-2 rounded hover:bg-gray-100"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Informe a quantidade de cada cédula/moeda. Calculamos o total e a diferença esperada.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {asArray(DENOMS).map((v) => (
              <div key={v} className="rounded-lg border p-3 flex flex-col gap-1">
                <span className="text-xs text-gray-500">R$ {v.toFixed(2)}</span>
                <input
                  type="number"
                  min="0"
                  value={counts[String(v)]}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value || '0', 10));
                    setCounts((prev) => ({ ...prev, [String(v)]: val }));
                  }}
                  className="px-2 py-1 text-sm border rounded"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg border p-3">
              <div className="text-sm text-gray-600">Total contado</div>
              <div className="text-xl font-semibold">{toBRL(countedTotal)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm text-gray-600">Total esperado</div>
              <div className="text-xl font-semibold">{toBRL(expectedTotal)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm text-gray-600">Diferença</div>
              <div
                className={`text-xl font-semibold ${
                  Number(diffTotal) < 0 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {toBRL(diffTotal)}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium">Observação</label>
            <textarea
              value={closeNote}
              onChange={(e) => setCloseNote(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border rounded"
              rows={3}
              placeholder="Ex.: Entregue ao responsável, diferença por troco, etc."
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={() => setCloseOpenModal(false)} className="px-3 py-2 rounded-md border hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={confirmClose}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              <Check size={16} /> Confirmar Fechamento
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Cashier;
