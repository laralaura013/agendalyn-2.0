import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function PaymentMethodsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', active: true });

  const fetchData = async () => {
    try {
      const { data } = await api.get('/finance/payment-methods');
      setItems(data);
    } catch {
      toast.error('Erro ao carregar formas de pagamento.');
    }
  };
  useEffect(()=>{ fetchData(); },[]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/payment-methods', form);
      toast.success('Forma de pagamento criada!');
      setForm({ name: '', active: true });
      fetchData();
    } catch {
      toast.error('Erro ao criar forma de pagamento.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Nova forma de pagamento</h2>
        <form onSubmit={submit} className="flex gap-3 flex-wrap">
          <input className="border rounded px-3 py-2" placeholder="Nome" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required/>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={e=>setForm({...form, active:e.target.checked})}/>
            Ativa
          </label>
          <button className="px-4 py-2 bg-gray-900 text-white rounded">Salvar</button>
        </form>
      </div>

      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Formas de pagamento</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th className="py-2">Nome</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(it=>(
              <tr key={it.id} className="border-b">
                <td className="py-2">{it.name}</td>
                <td>{it.active ? 'Ativa' : 'Inativa'}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="2" className="py-3 text-gray-500">Nenhum registro</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
