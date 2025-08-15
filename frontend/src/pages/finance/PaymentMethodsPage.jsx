// frontend/src/pages/finance/PaymentMethodsPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', active: true };

export default function PaymentMethodsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  async function fetchData() {
    setLoading(true);
    try {
      const { data } = await api.get('/finance/payment-methods');
      setItems(data || []);
    } catch {
      toast.error('Erro ao carregar formas de pagamento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ fetchData(); },[]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Informe o nome.');
    try {
      await api.post('/finance/payment-methods', {
        name: form.name.trim(),
        active: !!form.active,
      });
      toast.success('Forma de pagamento criada!');
      setForm(emptyForm);
      fetchData();
    } catch {
      toast.error('Erro ao criar forma de pagamento.');
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({ name: row.name || '', active: !!row.active });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const saveEdit = async (id) => {
    if (!editForm.name.trim()) return toast.error('Informe o nome.');
    try {
      await api.put(`/finance/payment-methods/${id}`, {
        name: editForm.name.trim(),
        active: !!editForm.active,
      });
      toast.success('Forma de pagamento atualizada!');
      cancelEdit();
      fetchData();
    } catch {
      toast.error('Erro ao atualizar forma de pagamento.');
    }
  };

  const toggleActive = async (row) => {
    try {
      await api.put(`/finance/payment-methods/${row.id}`, {
        name: row.name,
        active: !row.active,
      });
      fetchData();
    } catch {
      toast.error('Erro ao alterar status.');
    }
  };

  const remove = async (id) => {
    if (!confirm('Excluir esta forma de pagamento?')) return;
    try {
      await api.delete(`/finance/payment-methods/${id}`);
      toast.success('Excluída!');
      fetchData();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Erro ao excluir.';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Criar */}
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Nova forma de pagamento</h2>
        <form onSubmit={submit} className="flex gap-3 flex-wrap items-center">
          <input
            className="border rounded px-3 py-2"
            placeholder="Nome"
            value={form.name}
            onChange={e=>setForm({...form, name:e.target.value})}
            required
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e=>setForm({...form, active:e.target.checked})}
            />
            Ativa
          </label>
          <button className="px-4 py-2 bg-gray-900 text-white rounded">Salvar</button>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Formas de pagamento</h2>
        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Nome</th>
                  <th>Status</th>
                  <th className="w-40">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it)=>(
                  <tr key={it.id} className="border-b">
                    <td className="py-2 pr-3">
                      {editingId===it.id ? (
                        <input
                          className="border rounded px-2 py-1 w-full"
                          value={editForm.name}
                          onChange={e=>setEditForm(f=>({ ...f, name:e.target.value }))}
                        />
                      ) : it.name}
                    </td>
                    <td className="pr-3">
                      {editingId===it.id ? (
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!editForm.active}
                            onChange={e=>setEditForm(f=>({ ...f, active:e.target.checked }))}
                          />
                          {editForm.active ? 'Ativa' : 'Inativa'}
                        </label>
                      ) : (
                        <button
                          onClick={()=>toggleActive(it)}
                          className={`px-2 py-1 rounded border ${it.active ? 'text-green-700 border-green-300' : 'text-gray-600'}`}
                          title="Alternar status"
                        >
                          {it.active ? 'Ativa' : 'Inativa'}
                        </button>
                      )}
                    </td>
                    <td>
                      {editingId===it.id ? (
                        <div className="flex gap-2">
                          <button className="px-2 py-1 bg-gray-900 text-white rounded" onClick={()=>saveEdit(it.id)}>Salvar</button>
                          <button className="px-2 py-1 border rounded" onClick={cancelEdit}>Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button className="px-2 py-1 border rounded" onClick={()=>startEdit(it)}>Editar</button>
                          <button className="px-2 py-1 border rounded text-red-600" onClick={()=>remove(it.id)}>Excluir</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr><td colSpan="3" className="py-3 text-center text-gray-500">Nenhum registro</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
