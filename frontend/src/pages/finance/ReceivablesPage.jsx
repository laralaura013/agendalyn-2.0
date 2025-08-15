// frontend/src/pages/finance/ReceivablesPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Download, RefreshCw, CheckCircle2, XCircle, Edit3, Trash2 } from 'lucide-react';

const STATUSES = ['OPEN', 'RECEIVED', 'CANCELED'];

const toIsoNoon = (d) => (d ? `${d}T12:00:00` : null);
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '');
const currency = (n) =>
  n != null ? Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';

export default function ReceivablesPage() {
  // listagem
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // filtros
  const [filters, setFilters] = useState({
    status: 'OPEN',
    date_from: '',
    date_to: '',
    clientId: '',
    categoryId: '',
    orderId: '',
  });

  // selects
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]); // type=RECEIVABLE
  const [methods, setMethods] = useState([]);

  // form (criar/editar)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    clientId: '',
    orderId: '',
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

  // ========= LOAD OPTIONS =========
  const loadOptions = async () => {
    try {
      const [cats, pms] = await Promise.all([
        api.get('/finance/categories', { params: { type: 'RECEIVABLE' } }),
        api.get('/finance/payment-methods'),
      ]);
      setCategories(cats.data || []);
      setMethods(pms.data || []);
    } catch (e) {
      console.warn(e);
    }

    // clientes — tenta duas formas de resposta (lista direta ou {items:[]})
    try {
      const r = await api.get('/clients', { params: { q: '', limit: 200 } });
      const list = Array.isArray(r.data) ? r.data : (r.data?.items || []);
      setClients(list);
    } catch (e) {
      console.warn(e);
    }
  };

  // ========= LIST =========
  const fetchList = async () => {
    setLoading(true);
    try {
      const r = await api.get('/finance/receivables', { params: filters });
      setRows(r.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erro ao listar Receber.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========= FILTERS =========
  const onChangeFilter = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };
  const applyFilters = async (e) => {
    e?.preventDefault();
    await fetchList();
  };
  const resetFilters = async () => {
    setFilters({
      status: 'OPEN',
      date_from: '',
      date_to: '',
      clientId: '',
      categoryId: '',
      orderId: '',
    });
    setTimeout(fetchList, 0);
  };

  // ========= FORM =========
  const openCreate = () => {
    setEditing(null);
    setForm({
      clientId: '',
      orderId: '',
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
      clientId: row.clientId || '',
      orderId: row.orderId || '',
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
    try {
      const payload = {
        dueDate: toIsoNoon(form.dueDate),
        amount: Number(form.amount),
        notes: form.notes?.trim() || '',
      };
      if (form.clientId) payload.clientId = form.clientId;
      if (form.orderId) payload.orderId = form.orderId;
      if (form.categoryId) payload.categoryId = form.categoryId;
      if (form.paymentMethodId) payload.paymentMethodId = form.paymentMethodId;

      if (!editing) {
        await api.post('/finance/receivables', payload);
        toast.success('Conta a receber criada!');
      } else {
        await api.put(`/finance/receivables/${editing.id}`, payload);
        toast.success('Conta a receber atualizada!');
      }
      setFormOpen(false);
      fetchList();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erro ao salvar.');
    }
  };

  // ========= ACTIONS =========
  const markReceived = async (row) => {
    try {
      await api.put(`/finance/receivables/${row.id}`, { status: 'RECEIVED' });
      toast.success('Marcado como recebido.');
      fetchList();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erro ao atualizar.');
    }
  };
  const cancelItem = async (row) => {
    if (!window.confirm('Cancelar este recebível?')) return;
    try {
      await api.put(`/finance/receivables/${row.id}`, { status: 'CANCELED' });
      toast.success('Recebível cancelado.');
      fetchList();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erro ao atualizar.');
    }
  };
  const removeItem = async (row) => {
    if (!window.confirm('Excluir permanentemente?')) return;
    try {
      await api.delete(`/finance/receivables/${row.id}`);
      toast.success('Excluído.');
      fetchList();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erro ao excluir.');
    }
  };

  // ========= EXPORT =========
  const exportCsv = async () => {
    try {
      const r = await api.get('/exports/receivables.csv', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'receivables.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Erro ao exportar CSV.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Contas a Receber</h2>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-2">
            <Download size={16} /> Exportar CSV
          </button>
          <button onClick={openCreate} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2">
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-white p-4 rounded border mb-4">
        <select name="status" value={filters.status} onChange={onChangeFilter} className="border rounded px-2 py-2">
          <option value="">Todos status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" name="date_from" value={filters.date_from} onChange={onChangeFilter} className="border rounded px-2 py-2" />
        <input type="date" name="date_to" value={filters.date_to} onChange={onChangeFilter} className="border rounded px-2 py-2" />
        <select name="clientId" value={filters.clientId} onChange={onChangeFilter} className="border rounded px-2 py-2">
          <option value="">Cliente: todos</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="categoryId" value={filters.categoryId} onChange={onChangeFilter} className="border rounded px-2 py-2">
          <option value="">Categoria: todas</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="text"
          name="orderId"
          placeholder="Comanda (opcional)"
          value={filters.orderId}
          onChange={onChangeFilter}
          className="border rounded px-2 py-2"
        />
        <div className="md:col-span-6 flex justify-end gap-2">
          <button type="button" onClick={resetFilters} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-2">
            <RefreshCw size={16} /> Limpar
          </button>
          <button type="submit" className="px-3 py-2 bg-gray-900 text-white rounded hover:bg-black">Aplicar</button>
        </div>
      </form>

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
                <th className="text-left p-2">Vencimento</th>
                <th className="text-left p-2">Cliente</th>
                <th className="text-left p-2">Categoria</th>
                <th className="text-left p-2">Forma Pgto</th>
                <th className="text-right p-2">Valor</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Obs.</th>
                <th className="text-right p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{fmtDate(r.dueDate)}</td>
                  <td className="p-2">{r.client?.name || '—'}</td>
                  <td className="p-2">{r.category?.name || '—'}</td>
                  <td className="p-2">{r.paymentMethod?.name || '—'}</td>
                  <td className="p-2 text-right">{currency(r.amount)}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{r.notes}</td>
                  <td className="p-2">
                    <div className="flex justify-end gap-2">
                      {r.status === 'OPEN' && (
                        <>
                          <button onClick={() => markReceived(r)} className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700" title="Marcar recebido">
                            <CheckCircle2 size={16} />
                          </button>
                          <button onClick={() => cancelItem(r)} className="px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700" title="Cancelar">
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      <button onClick={() => openEdit(r)} className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200" title="Editar">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => removeItem(r)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr>
                  <td colSpan="8" className="p-4 text-center text-gray-500">Nenhum registro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded shadow-lg">
            <div className="px-4 py-3 border-b font-medium">{editing ? 'Editar Recebível' : 'Novo Recebível'}</div>
            <form onSubmit={submitForm} className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Cliente (opcional)</label>
                  <select
                    value={form.clientId}
                    onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                    className="border rounded px-2 py-2 w-full"
                  >
                    <option value="">Nenhum</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Comanda (opcional)</label>
                  <input
                    type="text"
                    value={form.orderId}
                    onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
                    className="border rounded px-2 py-2 w-full"
                    placeholder="ID da comanda"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Categoria</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    className="border rounded px-2 py-2 w-full"
                  >
                    <option value="">Nenhuma</option>
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
                  <label className="text-sm text-gray-600">Vencimento</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="border rounded px-2 py-2 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Valor</label>
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
