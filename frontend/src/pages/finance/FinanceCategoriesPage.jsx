import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function FinanceCategoriesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'PAYABLE' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/finance/categories');
      setItems(data);
    } catch (e) {
      toast.error('Erro ao carregar categorias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/categories', form);
      toast.success('Categoria criada!');
      setForm({ name: '', type: 'PAYABLE' });
      fetchData();
    } catch (e) {
      toast.error('Erro ao criar categoria.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Nova categoria</h2>
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
          <button className="px-4 py-2 bg-gray-900 text-white rounded">Salvar</button>
        </form>
      </div>

      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Categorias</h2>
        {loading ? 'Carregando...' : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Nome</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-b">
                  <td className="py-2">{it.name}</td>
                  <td>{it.type === 'PAYABLE' ? 'Pagar' : 'Receber'}</td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan="2" className="py-3 text-gray-500">Nenhum registro</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
