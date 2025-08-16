// frontend/src/pages/finance/PayablesPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Plus, Download, RefreshCw, CheckCircle2, XCircle, Edit3, Trash2, Search,
  ArrowUp, ArrowDown
} from 'lucide-react';

const STATUSES = ['OPEN', 'PAID', 'CANCELED'];

// Helpers visuais
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '');
const currency = (n) =>
  n != null ? Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';

export default function PayablesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // paginação
  const [page, setPage] = useState(1);       // 1-based
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // ordenação server-side
  const [sortBy, setSortBy] = useState('dueDate'); // allowed: dueDate|createdAt|updatedAt|amount|status
  const [sortOrder, setSortOrder] = useState('asc'); // asc|desc

  // filtros
  const [filters, setFilters] = useState({
    status: 'OPEN',
    date_from: '',
    date_to: '',
    supplierId: '',
    categoryId: '',
    paymentMethodId: '',
    minAmount: '',
    maxAmount: '',
    q: '',
  });
  const [filtersApplied, setFiltersApplied] = useState(0);

  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]); // type=PAYABLE
  const [methods, setMethods] = useState([]);

  // resumo (do backend)
  const [totalsByStatus, setTotalsByStatus] = useState({
    OPEN: { count: 0, amount: 0 },
    PAID: { count: 0, amount: 0 },
    CANCELED: { count: 0, amount: 0 },
  });
  const [summary, setSummary] = useState({ amountSum: 0 });

  // seleção
  const [selected, setSelected] = useState(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    supplierId: '',
    categoryId: '',
    paymentMethodId: '',
    dueDate: '',
    amount: '',
    notes: '',
  });

  const totalList = useMemo(
    () => rows.reduce((s, r) => s + Number(r.amount || 0), 0),
    [rows]
  );

  const allPageIds = useMemo(() => rows.map(r => r.id), [rows]);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every(id => selected.has(id));

  // ========= LOAD OPTIONS =========
  const loadOptions = async () => {
    try {
      const [sup, cats, pms] = await Promise.all([
        api.get('/finance/suppliers'),
        api.get('/finance/categories', { params: { type: 'PAYABLE' } }),
        api.get('/finance/payment-methods'),
      ]);
      setSuppliers(sup.data?.items || sup.data || []);
      setCategories(cats.data?.items || cats.data || []);
      setMethods(pms.data?.items || pms.data || []);
    } catch (e) {
      console.warn(e);
    }
  };

  // ========= LIST =========
  const fetchList = async () => {
    setLoading(true);
    try {
      const r = await api.get('/finance/payables', {
        params: {
          ...filters,
          page, pageSize,
          sortBy, sortOrder,
        },
      });

      // normaliza payload (array direto OU objeto paginado)
      const payload = Array.isArray(r.data)
        ? { items: r.data, total: r.data.length, page, pageSize, totalsByStatus: { OPEN:{count:0,amount:0}, PAID:{count:0,amount:0}, CANCELED:{count:0,amount:0} }, summary: { amountSum: r.data.reduce((s,x)=>s+Number(x.amount||0),0) } }
        : r.data || {};

      const items = payload.items || [];
      setRows(items);
      setTotal(payload.total ?? items.length);
      setTotalsByStatus(payload.totalsByStatus || { OPEN:{count:0,amount:0}, PAID:{count:0,amount:0}, CANCELED:{count:0,amount:0} });
      setSummary(payload.summary || { amountSum: items.reduce((s,x)=>s+Number(x.amount||0),0) });
      if (payload.page) setPage(payload.page);
      if (payload.pageSize) setPageSize(payload.pageSize);

      // mantém apenas os selecionados que ainda estão na página
      setSelected(prev => new Set([...prev].filter(id => items.some(x => x.id === id))));
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erro ao listar Pagar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filtersApplied, sortBy, sortOrder]);

  // ========= FILTERS =========
  const onChangeFilter = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const applyFilters = (e) => {
    e?.preventDefault();
    setPage(1);
    setFiltersApplied((v) => v + 1);
  };

  const resetFilters = () => {
    setFilters({
      status: 'OPEN',
      date_from: '',
      date_to: '',
      supplierId: '',
      categoryId: '',
      paymentMethodId: '',
      minAmount: '',
      maxAmount: '',
      q: '',
    });
    setPage(1);
    setFiltersApplied((v) => v + 1);
  };

  // ========= FORM =========
  const openCreate = () => {
    setEditing(null);
    setForm({
      supplierId: '',
      categoryId: '',
      paymentMethodId: '',
      dueDate: '',
      amount: '',
      notes: '',
    });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      supplierId: row.supplierId || '',
      categoryId: row.categoryId || '',
      paymentMethodId: row.paymentMethodId || '',
      dueDate: row.dueDate ? String(row.dueDate).slice(0, 10) : '',
      amount: row.amount != null ? String(row.amount) : '',
      notes: row.notes || '',
    });
    setFormOpen(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();

    const amountOk = Number(form.amount);
    if (!form.categoryId) {
      toast.error('Selecione uma categoria.');
      return;
    }
    if (!form.dueDate || !isFinite(amountOk) || amountOk <= 0) {
      toast.error('Preencha um vencimento válido e um valor positivo.');
      return;
    }

    try {
      const payload = {
        categoryId: form.categoryId,
        dueDate: form.dueDate, // backend aceita 'YYYY-MM-DD'
        amount: amountOk,
        notes: form.notes?.trim() || '',
      };
      if (form.supplierId) payload.supplierId = form.supplierId;
      if (form.paymentMethodId) payload.paymentMethodId = form.paymentMethodId;

      if (!editing) {
        await api.post('/finance/payables', payload);
        toast.success('Conta a pagar criada!');
      } else {
        await api.put(`/finance/payables/${editing.id}`, payload);
        toast.success('Conta a pagar atualizada!');
      }
      setFormOpen(false);
      setFiltersApplied((v) => v + 1);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erro ao salvar.');
    }
  };

  // ========= SELEÇÃO / AÇÕES EM LOTE =========
  const toggleSelectAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        allPageIds.forEach((id) => next.delete(id));
      } else {
        allPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkUpdateStatus = async (newStatus) => {
    if (selected.size === 0) return;
    try {
      const ids = [...selected];
      const ops = ids.map(id =>
        api.put(`/finance/payables/${id}`, { status: newStatus })
      );
      const results = await Promise.allSettled(ops);
      const fails = results.filter(r => r.status === 'rejected').length;
      if (fails === 0) toast.success(`Atualizado(s) ${ids.length} registro(s).`);
      else toast.error(`Alguns registros falharam (${fails}).`);
      setSelected(new Set());
      setFiltersApplied((v) => v + 1);
      window.dispatchEvent?.(new CustomEvent('cashier:refresh'));
    } catch {
      toast.error('Falha na atualização em lote.');
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Excluir ${selected.size} registro(s)?`)) return;
    try {
      const ids = [...selected];
      const ops = ids.map(id => api.delete(`/finance/payables/${id}`));
      const results = await Promise.allSettled(ops);
      const fails = results.filter(r => r.status === 'rejected').length;
      if (fails === 0) toast.success(`Excluído(s) ${ids.length} registro(s).`);
      else toast.error(`Alguns registros falharam (${fails}).`);
      setSelected(new Set());
      setFiltersApplied((v) => v + 1);
      window.dispatchEvent?.(new CustomEvent('cashier:refresh'));
    } catch {
      toast.error('Falha na exclusão em lote.');
    }
  };

  // ========= AÇÕES POR LINHA =========
  const markPaid = async (row) => {
    try {
      await api.put(`/finance/payables/${row.id}`, { status: 'PAID' });
      toast.success('Marcado como pago.');
      setFiltersApplied((v) => v + 1);
      window.dispatchEvent?.(new CustomEvent('cashier:refresh'));
    } catch (e) {
      const msg = e?.response?.data?.message || 'Erro ao atualizar.';
      if (e?.response?.status === 409) {
        toast.error(msg || 'Caixa fechado. Abra o caixa para registrar o pagamento.');
      } else {
        toast.error(msg);
      }
    }
  };

  const cancelItem = async (row) => {
    if (!window.confirm('Cancelar este pagável?')) return;
    try {
      await api.put(`/finance/payables/${row.id}`, { status: 'CANCELED' });
      toast.success('Pagável cancelado.');
      setFiltersApplied((v) => v + 1);
      window.dispatchEvent?.(new CustomEvent('cashier:refresh'));
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erro ao atualizar.');
    }
  };

  const removeItem = async (row) => {
    if (!window.confirm('Excluir permanentemente?')) return;
    try {
      await api.delete(`/finance/payables/${row.id}`);
      toast.success('Excluído.');
      setFiltersApplied((v) => v + 1);
      window.dispatchEvent?.(new CustomEvent('cashier:refresh'));
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erro ao excluir.');
    }
  };

  // ========= EXPORT =========
  const exportCsv = async () => {
    try {
      const r = await api.get('/exports/payables.csv', {
        params: { ...filters, sortBy, sortOrder },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0,10);
      a.download = `payables_${ts}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Erro ao exportar CSV.');
    }
  };

  const sortable = (key) => ['dueDate', 'createdAt', 'updatedAt', 'amount', 'status'].includes(key);
  const toggleSort = (key) => {
    if (!sortable(key)) return;
    setSortBy(key);
    setSortOrder((prev) => (sortBy === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };
  const SortIcon = ({ col }) =>
    sortBy === col ? (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Contas a Pagar</h2>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-2" disabled={loading}>
            <Download size={16} /> Exportar CSV
          </button>
          <button onClick={openCreate} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2">
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white shadow">
          <div className="text-sm text-gray-500">Total (filtro)</div>
          <div className="text-lg font-semibold">{currency(summary.amountSum)}</div>
        </div>
        {STATUSES.map((st) => (
          <div key={st} className="p-4 rounded-xl bg-white shadow">
            <div className="text-sm text-gray-500">{st}</div>
            <div className="text-sm text-gray-700">
              {totalsByStatus[st]?.count || 0} itens — {currency(totalsByStatus[st]?.amount || 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-8 gap-3 bg-white p-4 rounded border">
        <select name="status" value={filters.status} onChange={onChangeFilter} className="border rounded px-2 py-2">
          <option value="">Todos status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" name="date_from" value={filters.date_from} onChange={onChangeFilter} className="border rounded px-2 py-2" />
        <input type="date" name="date_to" value={filters.date_to} onChange={onChangeFilter} className="border rounded px-2 py-2" />

        <select name="supplierId" value={filters.supplierId} onChange={onChangeFilter} className="border rounded px-2 py-2">
          <option value="">Fornecedor: todos</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="categoryId" value={filters.categoryId} onChange={onChangeFilter} className="border rounded px-2 py-2">
          <option value="">Categoria: todas</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="paymentMethodId" value={filters.paymentMethodId} onChange={onChangeFilter} className="border rounded px-2 py-2">
          <option value="">Pagamento: todos</option>
          {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <div className="flex items-center gap-2">
          <Search size={16} className="text-gray-500" />
          <input
            type="text"
            name="q"
            value={filters.q}
            onChange={onChangeFilter}
            placeholder="Buscar por observação"
            className="border rounded px-2 py-2 w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input type="number" step="0.01" name="minAmount" value={filters.minAmount} onChange={onChangeFilter} placeholder="Valor min" className="border rounded px-2 py-2" />
          <input type="number" step="0.01" name="maxAmount" value={filters.maxAmount} onChange={onChangeFilter} placeholder="Valor máx" className="border rounded px-2 py-2" />
        </div>

        <div className="md:col-span-8 flex justify-end gap-2">
          <button type="button" onClick={resetFilters} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-2">
            <RefreshCw size={16} /> Limpar
          </button>
          <button type="submit" className="px-3 py-2 bg-gray-900 text-white rounded hover:bg-black">Aplicar</button>
        </div>
      </form>

      {/* Barra de ações em massa */}
      {selected.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm text-indigo-800">{selected.size} selecionado(s)</div>
          <div className="flex gap-2">
            <button onClick={() => bulkUpdateStatus('PAID')} className="px-3 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700">
              Marcar PAGO
            </button>
            <button onClick={() => bulkUpdateStatus('OPEN')} className="px-3 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-800">
              Voltar para ABERTO
            </button>
            <button onClick={() => bulkUpdateStatus('CANCELED')} className="px-3 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700">
              Cancelar
            </button>
            <button onClick={bulkDelete} className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">
              Excluir
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white border rounded overflow-hidden">
        <div className="px-4 py-2 border-b flex justify-between items-center text-sm">
          <span>{loading ? 'Carregando...' : `${rows.length} registro(s)`}</span>
          <span className="font-medium">Total listado: {currency(totalList)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAllPage} />
                </th>
                <th className="text-left p-2 cursor-pointer select-none" onClick={() => toggleSort('dueDate')}>
                  <div className="inline-flex items-center gap-1">Vencimento <SortIcon col="dueDate" /></div>
                </th>
                <th className="text-left p-2">Fornecedor</th>
                <th className="text-left p-2">Categoria</th>
                <th className="text-left p-2">Forma Pgto</th>
                <th className="text-right p-2 cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                  <div className="inline-flex items-center gap-1 justify-end">Valor <SortIcon col="amount" /></div>
                </th>
                <th className="text-left p-2 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <div className="inline-flex items-center gap-1">Status <SortIcon col="status" /></div>
                </th>
                <th className="text-left p-2">Obs.</th>
                <th className="text-right p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isSel = selected.has(r.id);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">
                      <input type="checkbox" checked={isSel} onChange={() => toggleSelectRow(r.id)} />
                    </td>
                    <td className="p-2">{fmtDate(r.dueDate)}</td>
                    <td className="p-2">{r.supplier?.name || '—'}</td>
                    <td className="p-2">{r.category?.name || '—'}</td>
                    <td className="p-2">{r.paymentMethod?.name || '—'}</td>
                    <td className="p-2 text-right">{currency(r.amount)}</td>
                    <td className="p-2">{r.status}</td>
                    <td className="p-2">{r.notes}</td>
                    <td className="p-2">
                      <div className="flex justify-end gap-2">
                        {r.status === 'OPEN' && (
                          <>
                            <button onClick={() => markPaid(r)} className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700" title="Marcar pago" disabled={loading}>
                              <CheckCircle2 size={16} />
                            </button>
                            <button onClick={() => cancelItem(r)} className="px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700" title="Cancelar" disabled={loading}>
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button onClick={() => openEdit(r)} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200" title="Editar" disabled={loading}>
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => removeItem(r)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700" title="Excluir" disabled={loading}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && !loading && (
                <tr>
                  <td colSpan="9" className="p-4 text-center text-gray-500">Nenhum registro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* paginação */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Página {page} de {Math.max(1, Math.ceil(total / pageSize))} • {total} registro(s)
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1 text-sm"
              value={pageSize}
              onChange={(e)=>{ setPage(1); setPageSize(parseInt(e.target.value, 10)); }}
            >
              {[10,20,50,100].map(n => <option key={n} value={n}>{n}/página</option>)}
            </select>
            <button
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              onClick={()=> setPage(p => Math.max(1, p-1))}
              disabled={page <= 1 || loading}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              onClick={()=>{
                const totalPages = Math.max(1, Math.ceil(total / pageSize));
                setPage(p => Math.min(totalPages, p+1));
              }}
              disabled={page >= Math.max(1, Math.ceil(total / pageSize)) || loading}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded shadow-lg">
            <div className="px-4 py-3 border-b font-medium">{editing ? 'Editar Pagável' : 'Novo Pagável'}</div>
            <form onSubmit={submitForm} className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Fornecedor</label>
                  <select
                    value={form.supplierId}
                    onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
                    className="border rounded px-2 py-2 w-full"
                  >
                    <option value="">Nenhum</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Categoria *</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    className="border rounded px-2 py-2 w-full"
                    required
                  >
                    <option value="">Selecione</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Forma de Pagamento</label>
                  <select
                    value={form.paymentMethodId}
                    onChange={(e) => setForm((f) => ({ ...f, paymentMethodId: e.target.value }))}
                    className="border rounded px-2 py-2 w-full"
                  >
                    <option value="">Nenhuma</option>
                    {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Vencimento *</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="border rounded px-2 py-2 w-full"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Valor *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="border rounded px-2 py-2 w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="border rounded px-2 py-2 w-full"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">
                  Cancelar
                </button>
                <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
