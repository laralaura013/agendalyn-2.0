import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', active: true };

export default function PaymentMethodsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [active, setActive] = useState('ALL'); // ALL|true|false
  const [sortBy, setSortBy] = useState('name'); // name|createdAt
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const toggleSort = (col) => { if (col===sortBy) setSortOrder(o=>o==='asc'?'desc':'asc'); else { setSortBy(col); setSortOrder('asc'); } };

  async function fetchData(customPage = page) {
    setLoading(true);
    try {
      const params = { page: customPage, pageSize, sortBy, sortOrder };
      if (q?.trim()) params.q = q.trim();
      if (active !== 'ALL') params.active = String(active);
      const { data } = await api.get('/finance/payment-methods', { params });
      setItems(data.items || []); setTotal(data.total || 0); setPage(data.page || customPage);
    } catch { toast.error('Erro ao carregar formas de pagamento.'); } finally { setLoading(false); }
  }

  useEffect(()=>{ fetchData(1); /* eslint-disable-next-line */ }, [sortBy, sortOrder, pageSize, active]);
  useEffect(()=>{ fetchData(page); /* eslint-disable-next-line */ }, [page]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Informe o nome.');
    try {
      await api.post('/finance/payment-methods', { name: form.name.trim(), active: !!form.active });
      toast.success('Forma de pagamento criada!'); setForm(emptyForm); fetchData(1);
    } catch { toast.error('Erro ao criar forma de pagamento.'); }
  };

  const startEdit = (row) => { setEditingId(row.id); setEditForm({ name: row.name || '', active: !!row.active }); };
  const cancelEdit = () => { setEditingId(null); setEditForm(emptyForm); };
  const saveEdit = async (id) => {
    if (!editForm.name.trim()) return toast.error('Informe o nome.');
    try {
      await api.put(`/finance/payment-methods/${id}`, { name: editForm.name.trim(), active: !!editForm.active });
      toast.success('Forma de pagamento atualizada!'); cancelEdit(); fetchData(page);
    } catch { toast.error('Erro ao atualizar forma de pagamento.'); }
  };
  const toggleActive = async (row) => {
    try { await api.put(`/finance/payment-methods/${row.id}`, { name: row.name, active: !row.active }); fetchData(page); }
    catch { toast.error('Erro ao alterar status.'); }
  };
  const remove = async (id) => {
    if (!confirm('Excluir esta forma de pagamento?')) return;
    try { await api.delete(`/finance/payment-methods/${id}`); toast.success('Excluída!'); const next = items.length===1 && page>1 ? page-1 : page; fetchData(next); }
    catch (e) { toast.error(e?.response?.data?.message || 'Erro ao excluir.'); }
  };

  const exportCsv = async () => {
    try {
      const params = { sortBy, sortOrder };
      if (q?.trim()) params.q = q.trim();
      if (active !== 'ALL') params.active = String(active);
      const res = await api.get('/finance/payment-methods/export/csv', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = 'payment-methods.csv'; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch { toast.error('Erro ao exportar CSV.'); }
  };

  return (
    <div className="space-y-6">
      {/* Criar */}
      <div className="bg-white p-4 rounded-md shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Nova forma de pagamento</h2>
          <div className="flex gap-2">
            <input className="border rounded px-3 py-2" placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=> e.key==='Enter' && (setPage(1), fetchData(1))} />
            <select className="border rounded px-2 py-2" value={active} onChange={(e)=>{ setActive(e.target.value); setPage(1); }}>
              <option value="ALL">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
            <button className="px-3 py-2 border rounded" onClick={()=> (setPage(1), fetchData(1))}>Filtrar</button>
            <button className="px-3 py-2 border rounded" onClick={exportCsv}>Exportar CSV</button>
          </div>
        </div>
        <form onSubmit={submit} className="flex gap-3 flex-wrap items-center">
          <input className="border rounded px-3 py-2" placeholder="Nome" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={e=>setForm({...form, active:e.target.checked})} /> Ativa
          </label>
          <button className="px-4 py-2 bg-gray-900 text-white rounded">Salvar</button>
        </form>
      </div>

      {/* Lista */}
      <div className="bg-white p-4 rounded-md shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Formas de pagamento</h2>
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
                  <th>Status</th>
                  <th className="cursor-pointer" onClick={()=>toggleSort('createdAt')}>Criado em</th>
                  <th className="w-40">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it)=>(
                  <tr key={it.id} className="border-b">
                    <td className="py-2 pr-3">
                      {editingId===it.id ? (
                        <input className="border rounded px-2 py-1 w-full" value={editForm.name} onChange={e=>setEditForm(f=>({ ...f, name:e.target.value }))} />
                      ) : it.name}
                    </td>
                    <td className="pr-3">
                      {editingId===it.id ? (
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={!!editForm.active} onChange={e=>setEditForm(f=>({ ...f, active:e.target.checked }))} />
                          {editForm.active ? 'Ativa' : 'Inativa'}
                        </label>
                      ) : (
                        <button onClick={()=>toggleActive(it)} className={`px-2 py-1 rounded border ${it.active ? 'text-green-700 border-green-300' : 'text-gray-600'}`} title="Alternar status">
                          {it.active ? 'Ativa' : 'Inativa'}
                        </button>
                      )}
                    </td>
                    <td className="pr-3">{it.createdAt ? new Date(it.createdAt).toLocaleDateString() : '-'}</td>
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
