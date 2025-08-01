// src/pages/Dashboard.jsx

import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { DollarSign, CalendarDays, Users, TrendingUp } from 'lucide-react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

// registra os elementos do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const Dashboard = () => {
  // state separado para evitar erros de undefined
  const [summary, setSummary] = useState({
    revenueToday: 0,
    appointmentsToday: 0,
    newClientsThisMonth: 0,
    occupationRate: 0,
  })
  const [monthly, setMonthly] = useState({
    labels: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul'],
    values: [0,0,0,0,0,0,0],
  })
  const [productStats, setProductStats] = useState([
    { label: 'Eletrônicos', value: 0 },
    { label: 'Games',       value: 0 },
    { label: 'Móveis',      value: 0 },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // 1) resumo diário
        const { data: sum } = await api.get('/dashboard/summary')
        // 2) faturamento por mês + productStats (pode falhar sem travar)
        let rev = { months: monthly.labels, salesCounts: monthly.values, productStats }
        try {
          const { data } = await api.get('/dashboard/revenue-by-month')
          rev = data
        } catch (_) {}

        setSummary({
          revenueToday:       sum.revenueToday,
          appointmentsToday:  sum.appointmentsToday,
          newClientsThisMonth: sum.newClientsThisMonth,
          occupationRate:     sum.occupationRate ?? 0,
        })
        setMonthly({
          labels: rev.months,
          values: rev.salesCounts,
        })
        setProductStats(rev.productStats)
      } catch (err) {
        console.error('Erro no Dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // formatação de moeda
  const fmt = v =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  // cards de resumo
  const cards = [
    {
      label: 'Faturamento Hoje',
      value: fmt(summary.revenueToday),
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

  // dados do Bar chart
  const barData = {
    labels: monthly.labels,
    datasets: [
      {
        label: 'Faturamento',
        data: monthly.values,
        backgroundColor: '#9333ea',
        borderRadius: 6,
        barThickness: 40,
      },
    ],
  }

  // dados do Doughnut chart
  const doughnutData = {
    labels: productStats.map(p => p.label),
    datasets: [
      {
        data: productStats.map(p => p.value),
        backgroundColor: ['#9333ea', '#3b82f6', '#10b981'],
      },
    ],
  }

  return (
    <div className="p-4 space-y-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Carregando dados do painel...</p>
      ) : (
        <>
          {/* ▷ cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(c => (
              <div
                key={c.label}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 border border-gray-100"
              >
                <div className="p-2 bg-gray-100 rounded-full">{c.icon}</div>
                <div>
                  <p className="text-sm text-gray-500">{c.label}</p>
                  <p className="text-lg font-semibold">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ▷ gráfico de barras */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Faturamento Mensal</h2>
            <Bar
              data={barData}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          </div>

          {/* ▷ gráfico donut */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Product Statistic</h2>
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'bottom' } },
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
