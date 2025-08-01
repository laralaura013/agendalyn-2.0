// src/pages/Dashboard.jsx

import React, { useEffect, useState } from 'react'
import api from '../services/api'
import Card from '../components/ui/Card'
import StatsCard from '../components/ui/StatsCard'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'

// registra Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const Dashboard = () => {
  const [summary, setSummary] = useState(null)
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: sum } = await api.get('/dashboard/summary')
        const { data: rev } = await api.get('/dashboard/revenue-by-month')
        setSummary(sum)
        setMonthlyData(Array.isArray(rev) ? rev : [])
      } catch (e) {
        console.error(e)
        setError(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmtBRL = v =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  if (loading) return <p className="text-center py-20 text-gray-500 animate-pulse">Carregando painel…</p>
  if (error || !summary)
    return <p className="text-center py-20 text-red-500">Erro ao carregar dashboard.</p>

  // prepara cards
  const cards = [
    {
      title: 'Faturamento Hoje',
      value: fmtBRL(summary.revenueToday),
      variation: summary.revenueVarPct,
      isPositive: summary.revenueVarPct >= 0,
      iconColor: 'text-green-500',
      icon: '💰'
    },
    {
      title: 'Agendamentos Hoje',
      value: summary.appointmentsToday,
      variation: summary.appointmentsVarPct,
      isPositive: summary.appointmentsVarPct >= 0,
      iconColor: 'text-blue-500',
      icon: '📅'
    },
    {
      title: 'Novos Clientes (Mês)',
      value: summary.newClientsThisMonth,
      variation: summary.clientsVarPct,
      isPositive: summary.clientsVarPct >= 0,
      iconColor: 'text-purple-500',
      icon: '👤'
    },
    {
      title: 'Taxa de Ocupação',
      value: `${summary.occupationRate ?? 0}%`,
      variation: 0,
      isPositive: true,
      iconColor: 'text-gray-400',
      icon: '📈'
    }
  ]

  // dados do gráfico de barras
  const barData = {
    labels: monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Faturamento',
        data: monthlyData.map(d => d.value),
        backgroundColor: '#7C3AED', // roxo
        borderRadius: 8,
        barThickness: 30
      }
    ]
  }
  const barOptions = {
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { color: '#E5E7EB' },
        ticks: { callback: v => fmtBRL(v) }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => fmtBRL(ctx.parsed.y) } }
    }
  }

  // dados do donut
  const productStats = summary.productStats || [
    { label: 'Eletrônicos', value: 0 },
    { label: 'Games', value: 0 },
    { label: 'Móveis', value: 0 }
  ]
  const doughnutData = {
    labels: productStats.map(p => p.label),
    datasets: [
      {
        data: productStats.map(p => p.value),
        backgroundColor: ['#6366F1','#FBBF24','#10B981']
      }
    ]
  }
  const doughnutOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmtBRL(ctx.parsed)}` } }
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(c => (
          <Card key={c.title}>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg bg-gray-100 ${c.iconColor} text-xl`}>{c.icon}</div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{c.title}</p>
                <p className="text-2xl font-semibold">{c.value}</p>
              </div>
            </div>
            {typeof c.variation === 'number' && (
              <div className="mt-2 text-sm">
                <span
                  className={`px-2 py-1 rounded-full ${
                    c.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {c.isPositive ? '+' : ''}
                  {c.variation}%
                </span>
                <span className="ml-2 text-gray-400">vs mês anterior</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* GRÁFICO DE BARRAS */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Faturamento Mensal</h2>
        <div className="h-80">
          <Bar data={barData} options={barOptions} />
        </div>
      </Card>

      {/* DONUT */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Product Statistic</h2>
        <div className="h-72">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
      </Card>
    </div>
  )
}

export default Dashboard
