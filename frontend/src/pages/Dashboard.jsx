// src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react'
import api from '../services/api'
import {
  DollarSign,
  CalendarDays,
  Users,
  TrendingUp
} from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js'

// registra Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const Dashboard = () => {
  const [summary, setSummary] = useState({
    revenueToday: 0,
    appointmentsToday: 0,
    newClientsThisMonth: 0,
    occupationRate: 0,
  })
  const [monthlyData, setMonthlyData] = useState([
    { month: 'Jan', value: 0 },
    { month: 'Fev', value: 0 },
    { month: 'Mar', value: 0 },
    { month: 'Abr', value: 0 },
    { month: 'Mai', value: 0 },
    { month: 'Jun', value: 0 },
    { month: 'Jul', value: 0 },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        // summary original
        const res = await api.get('/dashboard/summary')
        setSummary({
          revenueToday: res.data.revenueToday,
          appointmentsToday: res.data.appointmentsToday,
          newClientsThisMonth: res.data.newClientsThisMonth,
          occupationRate: res.data.occupationRate ?? 0,
        })

        // tenta buscar dados mensais de faturamento, sem travar se não existir
        try {
          const rev = await api.get('/dashboard/revenue-by-month')
          // espera que rev.data seja array [{ month:"Jan", value:123 }, ...]
          setMonthlyData(rev.data)
        } catch {
          // ignora se rota não existir ou erro
        }

      } catch (err) {
        console.error("Erro ao buscar dados do dashboard:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const formatCurrency = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

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
      value: `${summary.occupationRate}%`,
      icon: <TrendingUp className="text-gray-500" />,
    },
  ]

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
  }

  return (
    <div className="p-4 space-y-8 max-w-5xl mx-auto animate-fade-in-up">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {loading ? (
        <p className="text-gray-500 animate-pulse">
          Carregando dados do painel...
        </p>
      ) : (
        <>
          {/* Resumo em cards */}
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

          {/* Gráfico de Faturamento Mensal */}
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
  )
}

export default Dashboard
