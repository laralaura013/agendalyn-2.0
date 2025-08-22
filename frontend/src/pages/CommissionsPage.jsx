import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

import { asArray } from '../utils/asArray';
// // REMOVIDO

const CommissionsPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/staff')
      .then(res => setStaffList(res.data))
      .catch(() => toast.error("Não foi possível carregar a lista de colaboradores."));
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedStaff) {
      toast.error("Por favor, selecione um colaborador.");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const params = { staffId: selectedStaff, startDate, endDate };
      const response = await api.get('/commissions', { params });
      setReport(response.data);
    } catch (error) {
      toast.error("Não foi possível gerar o relatório de comissão.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(value);

  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Relatório de Comissões</h1>

      {/* Filtros */}
      <div className="p-4 bg-white rounded-lg shadow-md mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Colaborador</label>
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="mt-1 block w-full p-2 border rounded-md"
          >
            <option value="">Selecione um colaborador</option>
            {asArray(staffList).map(staff => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Data de Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Data de Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full p-2 border rounded-md"
          />
        </div>
        <div className="sm:col-span-2 md:col-span-4 text-right">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-6 py-2 bg-purple-700 text-white font-semibold rounded-lg shadow-md hover:bg-purple-800 disabled:bg-gray-400 w-full sm:w-auto"
          >
            {loading ? 'A gerar...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {report && (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
          <h2 className="text-xl font-bold">Resultado para: {report.staffName}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Total Vendido</p>
              <p className="text-2xl font-bold">{formatCurrency(report.totalSales)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Taxa de Comissão</p>
              <p className="text-2xl font-bold">{report.commissionRate}%</p>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <p className="text-sm text-green-700">Comissão a Pagar</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(report.totalCommission)}</p>
            </div>
          </div>

          <h3 className="font-semibold">Vendas Incluídas no Cálculo</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-600">Data</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-600">Comanda</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-600">Cliente</th>
                  <th className="py-2 px-4 text-right text-sm font-semibold text-gray-600">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {asArray(report.orders).map(order => (
                  <tr key={order.id} className="border-b">
                    <td className="py-2 px-4">{new Date(order.updatedAt).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2 px-4">#{order.id.substring(0, 8)}</td>
                    <td className="py-2 px-4">{order.client.name}</td>
                    <td className="py-2 px-4 text-right font-medium">{formatCurrency(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionsPage;
