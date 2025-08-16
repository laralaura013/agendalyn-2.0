import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', taxId: '', phone: '', email: '' };

export default function SuppliersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name|createdAt
  const [sortOrder, setSortOrder] = useState('asc'); // asc|desc
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const toggleSort = (col) => {
    if (col === sortBy) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortOrder('asc'); }
  };

  async function fetchData(customPage = page) {
    setLoading(true);
    try {
      const params = { page: customPage, pageSize, sortBy, sortOrder };
      if (q?.trim()) params.q = q.trim();
      const { data } = await api.get('/finance/suppliers', { params });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || customPage);
    } catch {
      toast.error('Erro ao carregar fornecedores.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(1); /* eslint-disable-next-line */ }, [sortBy, sortOrder, pageSize]);
  // mudança de página
  useEffect(() => { fetchData(page); /* eslint-disable-next-line */ }, [page]);

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
      fetchData(1);
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
  const cancelEdit = () => { setEditingId(null); setEditForm(emptyForm); };
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
      fetchData(page);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Erro ao atualizar fornecedor.';
      toast.error(msg);
    }
  };
  const remove = async (id) => {
    if (!confirm('Excluir este fornecedor?')) return;
    try {
      await api.delete(`/finance/suppliers/${id}`);
      toast.success('Fornecedor excluído!');
      // se apagou o último da página, recua a página quando necessário
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
      fetchData(nextPage);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Erro ao excluir fornecedor.';
      toast.error(msg);
    }
  };

  const exportCsv = async () => {
    try {
      const params = { sortBy, sortOrder };
      if (q?.trim()) params.q = q.trim();
      const res = await api.get('/finance/suppliers/export/csv', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'suppliers.csv'; document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao exportar CSV.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Criar */}
      <div className="bg-white p-4 rounded-md shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Novo fornecedor</h2>
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2"
              placeholder="Buscar..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              onKeyDown={e=> e.key==='Enter' && (setPage(1), fetchData(1))}
            />
            <button className="px-3 py-2 border rounded" onClick={()=> (setPage(1), fetchData(1))}>
              Filtrar
            </button>
            <button className="px-3 py-2 border rounded" onClick={exportCsv}>
              Exportar CSV
            </button>
          </div>
        </div>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Nome" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
          <input className="border rounded px-3 py-2" placeholder="CNPJ/CPF" value={form.taxId} onChange={e=>setForm({...form, taxId:e.target.value})} />
          <input className="border rounded px-3 py-2" placeholder="Telefone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
          <input className="border rounded px-3 py-2" placeholder="E-mail" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          <div className="sm:col-span-2">
            <button className="px-4 py-2 bg-gray-900 text-white rounded">Salvar</button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white p-4 rounded-md shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Fornecedores</h2>
          <div className="flex items-center gap-2 text-sm">
            <span>Ordenar por:</span>
            <select className="border rounded px-2 py-1" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="name">Nome</option>
              <option value="createdAt">Criado em</option>
            </select>
            <select className="border rounded px-2 py-1" value={sortOrder} onChange={e=>setSortOrder(e.target.value)}>
              <option value="asc">ASC</option>
              <option value="desc">DESC</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 cursor-pointer" onClick={()=>toggleSort('name')}>Nome</th>
                  <th>Documento</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th className="cursor-pointer" onClick={()=>toggleSort('createdAt')}>Criado em</th>
                  <th className="w-36">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b">
                    <td className="py-2 pr-3">
                      {editingId===it.id ? (
                        <input className="border rounded px-2 py-1 w-full" value={editForm.name} onChange={e=>setEditForm(f=>({ ...f, name:e.target.value }))} />
                      ) : it.name}
                    </td>
                    <td className="pr-3">
                      {editingId===it.id ? (
                        <input className="border rounded px-2 py-1 w-full" value={editForm.taxId} onChange={e=>setEditForm(f=>({ ...f, taxId:e.target.value }))} />
                      ) : (it.taxId || '-')}
                    </td>
                    <td className="pr-3">
                      {editingId===it.id ? (
                        <input className="border rounded px-2 py-1 w-full" value={editForm.phone} onChange={e=>setEditForm(f=>({ ...f, phone:e.target.value }))} />
                      ) : (it.phone || '-')}
                    </td>
                    <td className="pr-3">
                      {editingId===it.id ? (
                        <input type="email" className="border rounded px-2 py-1 w-full" value={editForm.email} onChange={e=>setEditForm(f=>({ ...f, email:e.target.value }))} />
                      ) : (it.email || '-')}
                    </td>
                    <td className="pr-3">{it.createdAt ? new Date(it.createdAt).toLocaleDateString() : '-'}</td>
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
                  <tr><td colSpan="6" className="py-3 text-center text-gray-500">Nenhum registro</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm">Página {page} de {totalPages}</span>
          <button className="px-3 py-1 border rounded" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button>
          <button className="px-3 py-1 border rounded" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Próxima</button>
          <select className="ml-auto border rounded px-2 py-1" value={pageSize} onChange={e=> (setPageSize(parseInt(e.target.value,10)), setPage(1))}>
            {[10,20,50,100].map(n => <option key={n} value={n}>{n}/página</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
