import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', taxId: '', phone: '', email: '' });

  const fetchData = async () => {
    try {
      const { data } = await api.get('/finance/suppliers');
      setItems(data);
    } catch {
      toast.error('Erro ao carregar fornecedores.');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/suppliers', form);
      toast.success('Fornecedor criado!');
      setForm({ name: '', taxId: '', phone: '', email: '' });
      fetchData();
    } catch {
      toast.error('Erro ao criar fornecedor.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Novo fornecedor</h2>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Nome" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required/>
          <input className="border rounded px-3 py-2" placeholder="CNPJ/CPF" value={form.taxId} onChange={e=>setForm({...form, taxId:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="Telefone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="E-mail" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
          <button className="px-4 py-2 bg-gray-900 text-white rounded">Salvar</button>
        </form>
      </div>
      <div className="bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-3">Fornecedores</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th className="py-2">Nome</th><th>Documento</th><th>Telefone</th><th>E-mail</th></tr></thead>
          <tbody>
            {items.map(it=>(
              <tr key={it.id} className="border-b">
                <td className="py-2">{it.name}</td><td>{it.taxId||'-'}</td><td>{it.phone||'-'}</td><td>{it.email||'-'}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="4" className="py-3 text-gray-500">Nenhum registro</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
