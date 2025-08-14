import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ExportCsvButton from '../../components/common/ExportCsvButton';

export default function PayablesPage() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [methods, setMethods] = useState([]);
  const [form, setForm] = useState({ categoryId: '', supplierId: '', paymentMethodId: '', dueDate: '', amount: '', notes: '' });

  const fetchAll = async () => {
    try {
      const [p, c, s, m] = await Promise.all([
        api.get('/finance/payables'),
        api.get('/finance/categories?type=PAYABLE'),
        api.get('/finance/suppliers'),
        api.get('/finance/payment-methods'),
      ]);
      setItems(p.data); setCats(c.data); setSuppliers(s.data); setMethods(m.data);
    } catch {
      toast.error('Erro ao carregar dados.');
    }
  };
  useEffect(()=>{ fetchAll(); },[]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/finance/payables', {
        ...form,
        amount: Number(form.amount || 0),
        supplierId: form.supplierId || null,
        paymentMethodId: form.paymentMethodId || null,
      });
      toast.success('Conta a pagar criada!');
      setForm({ categoryId: '', supplierId: '', paymentMethodId: '', dueDate: '', amount: '', notes: '' });
      fetchAll();
    } catch {
      toast.error('Erro ao criar conta.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contas a Pagar</h2>
        <ExportCsvButton entity="payables" />
      </div>

      <div className="bg-white p-4 rounded-md shadow">
        <h3 className="font-medium mb-3">Nova Conta</h3>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select className="border rounded px-3 py-2" value={form.categoryId} onChange={e=>setForm({...form, categoryId:e.target.value})} required>
            <option value="">Categoria</option>
            {cats.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="border rounded px-3 py-2" value={form.supplierId} onChange={e=>setForm({...form, supplierId:e.target.value})}>
            <option value="">Fornecedor (opcional)</option>
            {suppliers.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="border rounded px-3 py-2" value={form.paymentMethodId} onChange={e=>setForm({...form, paymentMethodId:e.target.value})}>
            <option value="">Forma de pagamento</option>
            {methods.map(m=> <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input type="date" className="border rounded px-3 py-2" value={form.dueDate} onChange={e=>setForm({...form, dueDate:e.target.value})} required/>
          <input type="number" step="0.01" className="border rounded px-3 py-2" placeholder="Valor" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} required/>
          <input type="text" className="border rounded px-3 py-2" placeholder="Observações" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})}/>
          <div className="sm:col-span-3">
            <button className="px-4 py-2 bg-gray-900 text-white rounded">Salvar</button>
          </div>
        </form>
      </div>

      <div className="bg-white p-4 rounded-md shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Vencimento</th>
              <th>Categoria</th>
              <th>Fornecedor</th>
              <th>Forma</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
            <tbody>
              {items.map(it=>(
                <tr key={it.id} className="border-b">
                  <td className="py-2">{String(it.dueDate).slice(0,10)}</td>
                  <td>{it.category?.name}</td>
                  <td>{it.supplier?.name || '-'}</td>
                  <td>{it.paymentMethod?.name || '-'}</td>
                  <td>R$ {Number(it.amount).toFixed(2)}</td>
                  <td>{it.status}</td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan="6" className="py-3 text-gray-500">Nenhum registro</td></tr>}
            </tbody>
        </table>
      </div>
    </div>
  );
}
