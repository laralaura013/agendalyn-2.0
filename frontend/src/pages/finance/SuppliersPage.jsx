// frontend/src/pages/finance/SuppliersPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', taxId: '', phone: '', email: '' };

export default function SuppliersPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  async function fetchData() {
    setLoading(true);
    try {
      const { data } = await api.get('/finance/suppliers');
      setItems(data || []);
    } catch {
      toast.error('Erro ao carregar fornecedores.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Informe o nome.');
    try {
      await api.post('/finance/suppliers', {
        name: form.name.trim(),
        taxId: form.taxId?.trim() || '',
        phone: form.phone?.trim() || '',
        email: form.email?.trim() || '',
      });
      toast.success('Fornecedor criado!');
      setForm(emptyForm);
      fetchData();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Erro ao criar fornecedor.';
      toast.error(msg);
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({
      name: row.name || '',
      taxId: row.taxId || '',
      phone: row.phone || '',
      email: row.email || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const saveEdit = async (id) => {
    if (!editForm.name.trim()) return toast.error('Informe o nome.');
    try {
      await api.put(`/finance/suppliers/${id}`, {
        name: editForm.name.trim(),
        taxId: editForm.taxId?.trim() || '',
        phone: editForm.phone?.trim() || '',
        email: editForm.email?.trim() || '',
      });
      toast.success('Fornecedor atualizado!');
      cancelEdit();
      fetchData();
    } catch {
      toast.error('Erro ao atualizar fornecedor.');
    }
  };

  const remove = async (id) => {
    if (!confirm('Excluir este fornecedor?')) return;
    try {
      await api.delete(`/finance/suppliers/${id}`);
      toast.success('Fornecedor excluído!');
      fetchData();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Erro ao excluir fornecedor.';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Criar */}
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Novo fornecedor</h2>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Nome"
            value={form.name}
            onChange={e=>setForm({...form, name:e.target.value})}
            required
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="CNPJ/CPF"
            value={form.taxId}
            onChange={e=>setForm({...form, taxId:e.target.value})}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Telefone"
            value={form.phone}
            onChange={e=>setForm({...form, phone:e.target.value})}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="E-mail"
            type="email"
            value={form.email}
            onChange={e=>setForm({...form, email:e.target.value})}
          />
          <div className="sm:col-span-2">
            <button className="px-4 py-2 bg-gray-900 text-white rounded">Salvar</button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Fornecedores</h2>
        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Nome</th>
                  <th>Documento</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th className="w-36">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
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
                        <input
                          className="border rounded px-2 py-1 w-full"
                          value={editForm.taxId}
                          onChange={e=>setEditForm(f=>({ ...f, taxId:e.target.value }))}
                        />
                      ) : (it.taxId || '-')}
                    </td>
                    <td className="pr-3">
                      {editingId===it.id ? (
                        <input
                          className="border rounded px-2 py-1 w-full"
                          value={editForm.phone}
                          onChange={e=>setEditForm(f=>({ ...f, phone:e.target.value }))}
                        />
                      ) : (it.phone || '-')}
                    </td>
                    <td className="pr-3">
                      {editingId===it.id ? (
                        <input
                          type="email"
                          className="border rounded px-2 py-1 w-full"
                          value={editForm.email}
                          onChange={e=>setEditForm(f=>({ ...f, email:e.target.value }))}
                        />
                      ) : (it.email || '-')}
                    </td>
                    <td className="pr-2">
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
                  <tr><td colSpan="5" className="py-3 text-center text-gray-500">Nenhum registro</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
