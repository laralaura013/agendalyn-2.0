// frontend/src/pages/finance/FinanceCategoriesPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TYPE_LABEL = {
  PAYABLE: 'Pagar',
  RECEIVABLE: 'Receber',
};

export default function FinanceCategoriesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'PAYABLE' });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL | PAYABLE | RECEIVABLE

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', type: 'PAYABLE' });
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      const { data } = await api.get('/finance/categories', { params });
      setItems(data || []);
    } catch (e) {
      toast.error('Erro ao carregar categorias.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [typeFilter]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Informe o nome.');
    setSubmitting(true);
    try {
      await api.post('/finance/categories', {
        name: form.name.trim(),
        type: form.type,
      });
      toast.success('Categoria criada!');
      setForm({ name: '', type: 'PAYABLE' });
      fetchData();
    } catch {
      toast.error('Erro ao criar categoria.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, type: cat.type });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', type: 'PAYABLE' });
  };

  const saveEdit = async (id) => {
    if (!editForm.name.trim()) return toast.error('Informe o nome.');
    try {
      await api.put(`/finance/categories/${id}`, {
        name: editForm.name.trim(),
        type: editForm.type,
      });
      toast.success('Categoria atualizada!');
      cancelEdit();
      fetchData();
    } catch {
      toast.error('Erro ao atualizar categoria.');
    }
  };

  const remove = async (id) => {
    if (!confirm('Excluir esta categoria?')) return;
    try {
      await api.delete(`/finance/categories/${id}`);
      toast.success('Categoria excluída!');
      fetchData();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Erro ao excluir categoria.';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtro por tipo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Categorias Financeiras</h2>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded ${typeFilter==='ALL'?'bg-gray-900 text-white':'bg-white border'}`}
            onClick={()=>setTypeFilter('ALL')}
          >
            Todas
          </button>
          <button
            className={`px-3 py-1 rounded ${typeFilter==='PAYABLE'?'bg-gray-900 text-white':'bg-white border'}`}
            onClick={()=>setTypeFilter('PAYABLE')}
          >
            Pagar
          </button>
          <button
            className={`px-3 py-1 rounded ${typeFilter==='RECEIVABLE'?'bg-gray-900 text-white':'bg-white border'}`}
            onClick={()=>setTypeFilter('RECEIVABLE')}
          >
            Receber
          </button>
        </div>
      </div>

      {/* Criar */}
      <div className="bg-white p-4 rounded-md shadow">
        <h3 className="text-base font-semibold mb-3">Nova categoria</h3>
        <form onSubmit={submit} className="flex flex-wrap gap-3">
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Nome"
            className="border rounded px-3 py-2"
            required
          />
          <select
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="PAYABLE">Pagar</option>
            <option value="RECEIVABLE">Receber</option>
          </select>
          <button
            className="px-4 py-2 bg-gray-900 text-white rounded disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white p-4 rounded-md shadow">
        <h3 className="text-base font-semibold mb-3">Categorias</h3>
        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Nome</th>
                  <th>Tipo</th>
                  <th className="w-36">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b">
                    <td className="py-2 pr-4">
                      {editingId === it.id ? (
                        <input
                          className="border rounded px-2 py-1 w-full"
                          value={editForm.name}
                          onChange={(e)=>setEditForm(f=>({...f, name:e.target.value}))}
                        />
                      ) : (
                        it.name
                      )}
                    </td>
                    <td className="pr-4">
                      {editingId === it.id ? (
                        <select
                          className="border rounded px-2 py-1"
                          value={editForm.type}
                          onChange={(e)=>setEditForm(f=>({...f, type:e.target.value}))}
                        >
                          <option value="PAYABLE">Pagar</option>
                          <option value="RECEIVABLE">Receber</option>
                        </select>
                      ) : (
                        TYPE_LABEL[it.type] || it.type
                      )}
                    </td>
                    <td className="pr-2">
                      {editingId === it.id ? (
                        <div className="flex gap-2">
                          <button
                            className="px-2 py-1 bg-gray-900 text-white rounded"
                            onClick={()=>saveEdit(it.id)}
                          >
                            Salvar
                          </button>
                          <button
                            className="px-2 py-1 border rounded"
                            onClick={cancelEdit}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            className="px-2 py-1 border rounded"
                            onClick={()=>startEdit(it)}
                          >
                            Editar
                          </button>
                          <button
                            className="px-2 py-1 border rounded text-red-600"
                            onClick={()=>remove(it.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan="3" className="py-3 text-center text-gray-500">Nenhum registro</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
