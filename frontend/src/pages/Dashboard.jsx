import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  DollarSign, CalendarDays, Users, TrendingUp
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const Dashboard = () => {
  const [summary, setSummary] = useState({
    revenueToday: 0,
    appointmentsToday: 0,
    newClientsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  const [monthlyData, setMonthlyData] = useState([
    { month: 'Abr', value: 1000 },
    { month: 'Mai', value: 750 },
    { month: 'Jun', value: 1300 },
    { month: 'Jul', value: 0 },
  ]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        setSummary(res.data);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const cards = [
    {
      label: 'Faturamento Hoje',
      value: formatCurrency(summary.revenueToday),
      icon: <DollarSign className="text-green-600" />,
    },
    {
      label: 'Agendamentos Hoje',
      value: summary.appointmentsToday,
      icon: <CalendarDays className="text-blue-600" />,
    },
    {
      label: 'Novos Clientes (Mês)',
      value: summary.newClientsThisMonth,
      icon: <Users className="text-purple-600" />,
    },
    {
      label: 'Taxa de Ocupação',
      value: '0%',
      icon: <TrendingUp className="text-gray-500" />,
    },
  ];

  const chartData = {
    labels: monthlyData.map((d) => d.month),
    datasets: [
      {
        label: 'Faturamento',
        data: monthlyData.map((d) => d.value),
        backgroundColor: '#9333ea',
        borderRadius: 6,
        barThickness: 40,
      },
    ],
  };

  return (
    <div className="p-4 space-y-8 max-w-5xl mx-auto animate-fade-in-up">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Carregando dados do painel...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 border border-gray-100"
              >
                <div className="p-2 bg-gray-100 rounded-full">{card.icon}</div>
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-lg font-semibold">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border animate-fade-in-up">
            <h2 className="text-lg font-semibold mb-4">Faturamento Mensal</h2>
            <Bar
              data={chartData}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
