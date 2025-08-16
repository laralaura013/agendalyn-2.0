import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TYPE_LABEL = { PAYABLE: 'Pagar', RECEIVABLE: 'Receber' };

export default function FinanceCategoriesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL | PAYABLE | RECEIVABLE
  const [sortBy, setSortBy] = useState('name'); // name|createdAt
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({ name: '', type: 'PAYABLE' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', type: 'PAYABLE' });
  const [submitting, setSubmitting] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const toggleSort = (col) => { if (col===sortBy) setSortOrder(o=>o==='asc'?'desc':'asc'); else { setSortBy(col); setSortOrder('asc'); } };

  async function fetchData(customPage = page) {
    setLoading(true);
    try {
      const params = { page: customPage, pageSize, sortBy, sortOrder };
      if (q?.trim()) params.q = q.trim();
      if (typeFilter !== 'ALL') params.type = typeFilter;
      const { data } = await api.get('/finance/categories', { params });
      setItems(data.items || []); setTotal(data.total || 0); setPage(data.page || customPage);
    } catch (e) {
      toast.error('Erro ao carregar categorias.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(1); /* eslint-disable-next-line */ }, [sortBy, sortOrder, pageSize, typeFilter]);
  useEffect(() => { fetchData(page); /* eslint-disable-next-line */ }, [page]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Informe o nome.');
    setSubmitting(true);
    try {
      await api.post('/finance/categories', { name: form.name.trim(), type: form.type });
      toast.success('Categoria criada!');
      setForm({ name: '', type: 'PAYABLE' });
      fetchData(1);
    } catch {
      toast.error('Erro ao criar categoria.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (cat) => { setEditingId(cat.id); setEditForm({ name: cat.name, type: cat.type }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({ name: '', type: 'PAYABLE' }); };
  const saveEdit = async (id) => {
    if (!editForm.name.trim()) return toast.error('Informe o nome.');
    try {
      await api.put(`/finance/categories/${id}`, { name: editForm.name.trim(), type: editForm.type });
      toast.success('Categoria atualizada!'); cancelEdit(); fetchData(page);
    } catch {
      toast.error('Erro ao atualizar categoria.');
    }
  };

  const remove = async (id) => {
    if (!confirm('Excluir esta categoria?')) return;
    try {
      await api.delete(`/finance/categories/${id}`);
      toast.success('Categoria excluída!');
      const next = items.length===1 && page>1 ? page-1 : page;
      fetchData(next);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Erro ao excluir categoria.';
      toast.error(msg);
    }
  };

  const exportCsv = async () => {
    try {
      const params = { sortBy, sortOrder };
      if (q?.trim()) params.q = q.trim();
      if (typeFilter !== 'ALL') params.type = typeFilter;
      const res = await api.get('/finance/categories/export/csv', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = 'finance-categories.csv'; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch { toast.error('Erro ao exportar CSV.'); }
  };

  return (
    <div className="space-y-6">
      {/* Filtro e Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Categorias Financeiras</h2>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2" placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=> e.key==='Enter' && (setPage(1), fetchData(1))} />
          <select className="border rounded px-3 py-2" value={typeFilter} onChange={e=>{ setTypeFilter(e.target.value); setPage(1); }}>
            <option value="ALL">Todos</option>
            <option value="PAYABLE">Pagar</option>
            <option value="RECEIVABLE">Receber</option>
          </select>
          <button className="px-3 py-2 border rounded" onClick={()=> (setPage(1), fetchData(1))}>Filtrar</button>
          <button className="px-3 py-2 border rounded" onClick={exportCsv}>Exportar CSV</button>
        </div>
      </div>

      {/* Criar */}
      <div className="bg-white p-4 rounded-md shadow">
        <h3 className="text-base font-semibold mb-3">Nova categoria</h3>
        <form onSubmit={submit} className="flex flex-wrap gap-3">
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome" className="border rounded px-3 py-2" required />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="border rounded px-3 py-2">
            <option value="PAYABLE">Pagar</option>
            <option value="RECEIVABLE">Receber</option>
          </select>
          <button className="px-4 py-2 bg-gray-900 text-white rounded disabled:opacity-60" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white p-4 rounded-md shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Categorias</h3>
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
                  <th>Tipo</th>
                  <th className="cursor-pointer" onClick={()=>toggleSort('createdAt')}>Criado em</th>
                  <th className="w-36">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b">
                    <td className="py-2 pr-4">
                      {editingId === it.id ? (
                        <input className="border rounded px-2 py-1 w-full" value={editForm.name} onChange={(e)=>setEditForm(f=>({...f, name:e.target.value}))} />
                      ) : it.name}
                    </td>
                    <td className="pr-4">
                      {editingId === it.id ? (
                        <select className="border rounded px-2 py-1" value={editForm.type} onChange={(e)=>setEditForm(f=>({...f, type:e.target.value}))}>
                          <option value="PAYABLE">Pagar</option>
                          <option value="RECEIVABLE">Receber</option>
                        </select>
                      ) : (TYPE_LABEL[it.type] || it.type)}
                    </td>
                    <td className="pr-4">{it.createdAt ? new Date(it.createdAt).toLocaleDateString() : '-'}</td>
                    <td className="pr-2">
                      {editingId === it.id ? (
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
                  <tr><td colSpan="4" className="py-3 text-center text-gray-500">Nenhum registro</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

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
