import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import ExportCsvButton from '../../components/common/ExportCsvButton';
import toast from 'react-hot-toast';


import { asArray } from '../../utils/asArray';
export default function BirthdaysReportPage() {
  const [month, setMonth] = useState('');
  const [items, setItems] = useState([]);

  const fetchData = async () => {
    try {
      const qs = month ? `?month=${month}` : '';
      const { data } = await api.get(`/reports/birthdays${qs}`);
      setItems(data.items || []);
    } catch {
      toast.error('Erro ao carregar aniversariantes.');
    }
  };

  useEffect(()=>{ fetchData(); },[month]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Aniversariantes</h2>
        {/* Export geral de clientes (pode filtrar depois no Excel) */}
        <ExportCsvButton entity="clients" />
      </div>
      <div className="bg-white p-4 rounded-md shadow flex gap-3 items-center">
        <label className="text-sm">Mês:</label>
        <select className="border rounded px-3 py-2" value={month} onChange={e=>setMonth(e.target.value)}>
          <option value="">Todos</option>
          {[...Array(asArray(12)]).map((_,i)=> <option key={i+1} value={i+1}>{i+1}</option>)}
        </select>
      </div>
      <div className="bg-white p-4 rounded-md shadow">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th className="py-2">Nome</th><th>Telefone</th><th>E-mail</th><th>Nascimento</th></tr></thead>
          <tbody>
            {asArray(items).map(it=>(
              <tr key={it.id} className="border-b">
                <td className="py-2">{it.name}</td>
                <td>{it.phone || '-'}</td>
                <td>{it.email || '-'}</td>
                <td>{it.birthDate}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="4" className="py-3 text-gray-500">Nenhum registro</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
