import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ClientOriginsPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');

  const fetchData = async () => {
    try {
      const { data } = await api.get('/settings/client-origins');
      setItems(data);
    } catch {
      toast.error('Erro ao carregar origens.');
    }
  };

  useEffect(()=>{ fetchData(); },[]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/settings/client-origins', { name, active: true });
      toast.success('Origem criada!');
      setName('');
      fetchData();
    } catch {
      toast.error('Erro ao criar origem.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Nova Origem</h2>
        <form onSubmit={submit} className="flex gap-3">
          <input className="border rounded px-3 py-2" placeholder="Ex.: Instagram, Indicação" value={name} onChange={e=>setName(e.target.value)} required/>
          <button className="px-4 py-2 bg-gray-900 text-white rounded">Salvar</button>
        </form>
      </div>
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Origens</h2>
        <ul className="list-disc pl-5">
          {items.map(it => <li key={it.id}>{it.name} {it.active ? '' : '(inativo)'}</li>)}
          {!items.length && <p className="text-gray-500">Nenhum registro</p>}
        </ul>
      </div>
    </div>
  );
}
