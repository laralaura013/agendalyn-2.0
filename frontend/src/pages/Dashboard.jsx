import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Dashboard = () => {
  const [summary, setSummary] = useState({
    revenueToday: 0,
    appointmentsToday: 0,
    newClientsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboard/summary');
        setSummary(response.data);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        // Pode adicionar um alerta para o usuário aqui, se desejar
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return <p>Carregando dados do painel...</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Faturamento Hoje</h3>
          <p className="text-3xl font-bold mt-2 text-green-600">{formatCurrency(summary.revenueToday)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Agendamentos Hoje</h3>
          <p className="text-3xl font-bold mt-2 text-blue-600">{summary.appointmentsToday}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Novos Clientes (Mês)</h3>
          <p className="text-3xl font-bold mt-2 text-indigo-600">{summary.newClientsThisMonth}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Taxa de Ocupação</h3>
          <p className="text-3xl font-bold mt-2">0%</p>
          <p className="text-xs text-gray-400">(A ser implementado)</p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;