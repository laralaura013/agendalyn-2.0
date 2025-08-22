// frontend/src/pages/reports/CashflowReportPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { RefreshCw, Download, CalendarDays } from 'lucide-react';


import { asArray } from '../../utils/asArray';
const currency = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const addDays = (dateStr, delta) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const monthRange = (date = new Date()) => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  const f = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
  const t = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`;
  return { f, t };
};

// --- Normalizadores defensivos ---
const normalizeMethods = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
};

const normalizeCashflow = (raw) => {
  const d = raw || {};
  // dias pode vir como d.days, d.data, ou até já ser um array
  const days =
    Array.isArray(d.days) ? d.days :
    Array.isArray(d.data) ? d.data :
    (Array.isArray(d) ? d : []);
  const totalsRaw = (d.totals && typeof d.totals === 'object') ? d.totals : {};
  const income = Number(totalsRaw.income || 0);
  const expense = Number(totalsRaw.expense || 0);
  const net = ('net' in totalsRaw) ? Number(totalsRaw.net || 0) : (income - expense);
  const closingBalance = Number(totalsRaw.closingBalance || 0);

  return {
    range: d.range ?? null,
    openingBalance: Number(d.openingBalance || 0),
    totals: { income, expense, net, closingBalance },
    days: Array.isArray(days) ? days : [],
  };
};

export default function CashflowReportPage() {
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState([]);
  const [filters, setFilters] = useState({
    date_from: addDays(todayKey(), -6),
    date_to: todayKey(),
    paymentMethodId: '',
    openingBalance: '',
  });
  const [data, setData] = useState({
    range: null,
    openingBalance: 0,
    totals: { income: 0, expense: 0, net: 0, closingBalance: 0 },
    days: [],
  });

  const loadMethods = async () => {
    try {
      // força o back a devolver tudo (se for paginado)
      const r = await api.get('/finance/payment-methods', {
        params: { page: 1, pageSize: 999, sortBy: 'name', sortOrder: 'asc' },
      });
      setMethods(normalizeMethods(r.data));
    } catch (e) {
      console.warn('payment-methods error:', e?.response?.data || e.message);
      setMethods([]); // garante array
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await api.get('/reports/cashflow', { params: filters });
      setData(normalizeCashflow(r.data));
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erro ao carregar fluxo de caixa.');
      // ainda assim mantém shape válido pra evitar .map em não-array
      setData({ range: null, openingBalance: 0, totals: { income: 0, expense: 0, net: 0, closingBalance: 0 }, days: [] });
      console.error('cashflow error:', e);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    try {
      const r = await api.get('/reports/cashflow.csv', {
        params: filters,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cashflow.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Erro ao exportar CSV.');
    }
  };

  useEffect(() => {
    loadMethods();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeFilter = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const applyQuick = (type) => {
    if (type === 'today') {
      const t = todayKey();
      setFilters((f) => ({ ...f, date_from: t, date_to: t }));
    } else if (type === '7d') {
      const t = todayKey();
      setFilters((f) => ({ ...f, date_from: addDays(t, -6), date_to: t }));
    } else if (type === '15d') {
      const t = todayKey();
      setFilters((f) => ({ ...f, date_from: addDays(t, -14), date_to: t }));
    } else if (type === '30d') {
      const t = todayKey();
      setFilters((f) => ({ ...f, date_from: addDays(t, -29), date_to: t }));
    } else if (type === 'month') {
      const { f, t } = monthRange(new Date());
      setFilters((s) => ({ ...s, date_from: f, date_to: t }));
    }
  };

  const submit = (e) => {
    e?.preventDefault();
    fetchData();
  };

  const totals = data?.totals || { income: 0, expense: 0, net: 0, closingBalance: 0 };
  const methodOptions = Array.isArray(methods) ? methods : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Relatório: Fluxo de Caixa</h2>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-2"
            disabled={loading}
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-white p-4 rounded border">
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600">De</label>
          <input type="date" name="date_from" value={filters.date_from} onChange={onChangeFilter}
                 className="border rounded px-2 py-2 w-full" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600">Até</label>
          <input type="date" name="date_to" value={filters.date_to} onChange={onChangeFilter}
                 className="border rounded px-2 py-2 w-full" />
        </div>
        <div>
          <label className="text-xs text-gray-600">Forma de Pagamento</label>
          <select name="paymentMethodId" value={filters.paymentMethodId} onChange={onChangeFilter}
                  className="border rounded px-2 py-2 w-full">
            <option value="">Todas</option>
            {asArray(methodOptions).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Saldo Inicial</label>
          <input type="number" step="0.01" name="openingBalance" value={filters.openingBalance}
                 onChange={onChangeFilter} placeholder="0,00"
                 className="border rounded px-2 py-2 w-full" />
        </div>

        <div className="md:col-span-6 flex flex-wrap gap-2 justify-between pt-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => applyQuick('today')} className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
              Hoje
            </button>
            <button type="button" onClick={() => applyQuick('7d')} className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
              7 dias
            </button>
            <button type="button" onClick={() => applyQuick('15d')} className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
              15 dias
            </button>
            <button type="button" onClick={() => applyQuick('30d')} className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
              30 dias
            </button>
            <button type="button" onClick={() => applyQuick('month')} className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1">
              <CalendarDays size={14} /> Mês atual
            </button>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={()=>{
              const t = todayKey();
              setFilters({ date_from: addDays(t,-6), date_to: t, paymentMethodId:'', openingBalance:'' });
            }} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-2">
              <RefreshCw size={16} /> Limpar
            </button>
            <button type="submit" className="px-3 py-2 bg-gray-900 text-white rounded hover:bg-black" disabled={loading}>
              {loading ? 'Carregando…' : 'Aplicar'}
            </button>
          </div>
        </div>
      </form>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white shadow">
          <div className="text-sm text-gray-500">Entradas</div>
          <div className="text-lg font-semibold text-emerald-700">{currency(totals.income)}</div>
        </div>
        <div className="p-4 rounded-xl bg-white shadow">
          <div className="text-sm text-gray-500">Saídas</div>
          <div className="text-lg font-semibold text-red-700">{currency(totals.expense)}</div>
        </div>
        <div className="p-4 rounded-xl bg-white shadow">
          <div className="text-sm text-gray-500">Saldo do Período</div>
          <div className="text-lg font-semibold">{currency(totals.net)}</div>
        </div>
        <div className="p-4 rounded-xl bg-white shadow">
          <div className="text-sm text-gray-500">Saldo Final</div>
          <div className="text-lg font-semibold">{currency(totals.closingBalance)}</div>
        </div>
      </div>

      {/* Tabela por dia */}
      <div className="bg-white border rounded overflow-hidden">
        <div className="px-4 py-2 border-b flex justify-between items-center text-sm">
          <span>{loading ? 'Carregando...' : `${Array.isArray(data?.days) ? data.days.length : 0} dia(s)`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Dia</th>
                <th className="text-right p-2">Entradas</th>
                <th className="text-right p-2">Saídas</th>
                <th className="text-right p-2">Saldo do Dia</th>
                <th className="text-right p-2">Saldo Corrente</th>
              </tr>
            </thead>
            <tbody>
              {asArray(data?.days).map((d) => (
                <tr key={d.date} className="border-t">
                  <td className="p-2">{new Date(`${d.date}T12:00:00`).toLocaleDateString()}</td>
                  <td className="p-2 text-right">{currency(d.income)}</td>
                  <td className="p-2 text-right">{currency(d.expense)}</td>
                  <td className="p-2 text-right">{currency(d.net)}</td>
                  <td className="p-2 text-right font-medium">{currency(d.balance)}</td>
                </tr>
              ))}
              {!loading && (!Array.isArray(data?.days) || data.days.length === 0) && (
                <tr><td colSpan="5" className="p-4 text-center text-gray-500">Sem movimentações no período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}