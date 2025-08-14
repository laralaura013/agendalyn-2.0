// frontend/src/pages/finance/ReceivablesPage.jsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api'; // ajuste o caminho se seu services/api estiver em outro lugar

const initialForm = {
  clientId: '',
  orderId: '',
  categoryId: '',
  paymentMethodId: '',
  dueDate: '',
  amount: '',
  notes: '',
};

function buildReceivablePayload(f) {
  // Evita problemas de fuso: manda hora fixa no meio do dia
  const dueIso = f.dueDate
    ? (f.dueDate.includes('T') ? f.dueDate : `${f.dueDate}T12:00:00`)
    : null;

  const payload = {
    dueDate: dueIso,
    amount: Number(f.amount),
    notes: f.notes?.trim() || '',
  };

  if (f.clientId)        payload.clientId = f.clientId;
  if (f.orderId)         payload.orderId = f.orderId;
  if (f.categoryId)      payload.categoryId = f.categoryId;         // deve ser do tipo RECEIVABLE
  if (f.paymentMethodId) payload.paymentMethodId = f.paymentMethodId;

  return payload;
}

const ReceivablesPage = () => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const [clients, setClients] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [categories, setCategories] = useState([]); // type=RECEIVABLE

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function loadRefs() {
    try {
      const [cl, pm, cat] = await Promise.all([
        api.get('/clients'),
        api.get('/finance/payment-methods'),
        api.get('/finance/categories', { params: { type: 'RECEIVABLE' } }),
      ]);
      setClients(cl.data || []);
      setPaymentMethods(pm.data || []);
      setCategories(cat.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar listas (clientes/categorias/formas).');
    }
  }

  async function loadReceivables() {
    try {
      const { data } = await api.get('/finance/receivables');
      setRows(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar contas a receber.');
    }
  }

  useEffect(() => {
    loadRefs();
    loadReceivables();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dueDate || !form.amount) {
      toast.error('Preencha vencimento e valor.');
      return;
    }
    setLoading(true);
    try {
      const payload = buildReceivablePayload(form);
      await api.post('/finance/receivables', payload);
      toast.success('Conta a receber criada!');
      setForm((f) => ({ ...initialForm, dueDate: f.dueDate })); // mantém a data, se quiser
      await loadReceivables();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao criar conta a receber.';
      toast.error(msg);
      console.error(msg, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">Nova conta a receber</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cliente (opcional) */}
          <div>
            <label className="block text-sm font-medium mb-1">Cliente (opcional)</label>
            <select
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Nenhum</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Categoria (Receber) */}
          <div>
            <label className="block text-sm font-medium mb-1">Categoria</label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Nenhuma</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-sm font-medium mb-1">Forma de pagamento</label>
            <select
              name="paymentMethodId"
              value={form.paymentMethodId}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Nenhuma</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>{pm.name}</option>
              ))}
            </select>
          </div>

          {/* Vencimento */}
          <div>
            <label className="block text-sm font-medium mb-1">Vencimento</label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium mb-1">Valor</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>

          {/* Observações */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1">Observações</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Opcional"
            />
          </div>

          <div className="md:col-span-3 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-gray-900 text-white rounded-md px-4 py-2 disabled:opacity-60"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">Contas a receber</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Vencimento</th>
                <th className="py-2 pr-4">Cliente</th>
                <th className="py-2 pr-4">Categoria</th>
                <th className="py-2 pr-4">Forma</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-none">
                  <td className="py-2 pr-4">{new Date(r.dueDate).toLocaleDateString()}</td>
                  <td className="py-2 pr-4">{r.client?.name || '—'}</td>
                  <td className="py-2 pr-4">{r.category?.name || '—'}</td>
                  <td className="py-2 pr-4">{r.paymentMethod?.name || '—'}</td>
                  <td className="py-2 pr-4">
                    {Number(r.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="py-2 pr-4">{r.status}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReceivablesPage;
