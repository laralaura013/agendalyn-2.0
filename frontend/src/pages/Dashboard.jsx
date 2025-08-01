// src/pages/Dashboard.jsx

import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Bar, Doughnut } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import {
  DollarSign,
  CalendarDays,
  Users,
  TrendingUp
} from 'lucide-react'

// registra Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const Dashboard = () => {
  const [summary, setSummary] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: sum } = await api.get('/dashboard/summary')
        const { data: rev } = await api.get('/dashboard/revenue-by-month')
        setSummary(sum)
        setMonthly(Array.isArray(rev) ? rev : [])
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

  if (loading)
    return <p className="text-center py-20 text-gray-500 animate-pulse">Carregando painel…</p>
  if (error || !summary)
    return <p className="text-center py-20 text-red-500">Erro ao carregar dashboard.</p>

  // dados dos cards
  const cards = [
    {
      label: 'Faturamento Hoje',
      value: fmtBRL(summary.revenueToday),
      pct: summary.appointmentsVarPct !== undefined ? summary.revenueVarPct : 0,
      icon: <DollarSign size={28} />,
      gradient: 'from-green-300 to-green-500',
    },
    {
      label: 'Agendamentos Hoje',
      value: summary.appointmentsToday,
      pct: summary.appointmentsVarPct ?? 0,
      icon: <CalendarDays size={28} />,
      gradient: 'from-blue-300 to-blue-500',
    },
    {
      label: 'Novos Clientes (Mês)',
      value: summary.newClientsThisMonth,
      pct: summary.clientsVarPct ?? 0,
      icon: <Users size={28} />,
      gradient: 'from-purple-300 to-purple-500',
    },
    {
      label: 'Taxa de Ocupação',
      value: `${summary.occupationRate ?? 0}%`,
      pct: summary.occupationRate ?? 0,
      icon: <TrendingUp size={28} />,
      gradient: 'from-gray-300 to-gray-500',
    },
  ]

  // Bar chart data
  const barData = {
    labels: monthly.map(d => d.month),
    datasets: [
      {
        label: 'Faturamento',
        data: monthly.map(d => d.value),
        backgroundColor: '#7C3AED',
        borderRadius: 8,
        barThickness: 30,
      },
    ],
  }
  const barOptions = {
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { color: '#E5E7EB' },
        ticks: { callback: v => fmtBRL(v) },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => fmtBRL(ctx.parsed.y) } },
    },
  }

  // Doughnut chart data (fallback estático se não vier do summary)
  const productStats = summary.productStats || [
    { label: 'Eletrônicos', value: 0 },
    { label: 'Games', value: 0 },
    { label: 'Móveis', value: 0 },
  ]
  const doughnutData = {
    labels: productStats.map(p => p.label),
    datasets: [
      {
        data: productStats.map(p => p.value),
        backgroundColor: ['#7C3AED', '#FBBF24', '#10B981'],
      },
    ],
  }
  const doughnutOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`bg-gradient-to-br ${c.gradient} rounded-2xl shadow-lg p-5 text-white flex justify-between items-center`}
          >
            <div>
              <p className="text-sm opacity-90">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </div>
            <div>
              {c.icon}
            </div>
            <div className="absolute bottom-2 left-5 text-xs bg-white/30 px-2 py-1 rounded-full">
              {c.pct >= 0 ? '+' : ''}
              {c.pct}%
            </div>
          </motion.div>
        ))}
      </div>

      {/* GRÁFICO DE BARRAS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Faturamento Mensal</h2>
          <div className="h-80">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </motion.div>

      {/* GRÁFICO DONUT */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Product Statistic</h2>
          <div className="h-72">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Dashboard
