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
  // começamos com zeros para sempre renderizar algo
  const [summary, setSummary] = useState({
    revenueToday: 0,
    appointmentsToday: 0,
    newClientsThisMonth: 0,
    occupationRate: 0,
    productStats: [],
  })
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function load() {
      // 1) tenta buscar o summary
      try {
        const { data: sum } = await api.get('/dashboard/summary')
        setSummary({
          revenueToday:        sum.revenueToday        ?? 0,
          appointmentsToday:   sum.appointmentsToday   ?? 0,
          newClientsThisMonth: sum.newClientsThisMonth ?? 0,
          occupationRate:      sum.occupationRate      ?? 0,
          productStats:        sum.productStats        ?? [],
        })
      } catch (e) {
        console.error('Erro ao buscar summary:', e)
        // captura a mensagem da API (ou a mensagem JS genérica)
        setErrorMessage(e.response?.data?.message || e.message)
      }

      // 2) tenta buscar faturamento mensal (não fatal)
      try {
        const { data: rev } = await api.get('/dashboard/revenue-by-month')
        setMonthly(Array.isArray(rev) ? rev : [])
      } catch (e) {
        console.warn('Não conseguiu /dashboard/revenue-by-month:', e)
      }

      setLoading(false)
    }
    load()
  }, [])

  const fmtBRL = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  if (loading) {
    return (
      <p className="text-center py-20 text-gray-500 animate-pulse">
        Carregando painel…
      </p>
    )
  }

  if (errorMessage) {
    return (
      <p className="text-center py-20 text-red-500">
        Erro ao carregar dashboard: {errorMessage}
      </p>
    )
  }

  // monta os cards
  const cards = [
    {
      label: 'Faturamento Hoje',
      value: fmtBRL(summary.revenueToday),
      pct: summary.revenueVarPct ?? 0,
      icon: <DollarSign size={28} className="text-green-500" />,
      gradient: 'from-green-300 to-green-500',
    },
    {
      label: 'Agendamentos Hoje',
      value: summary.appointmentsToday,
      pct: summary.appointmentsVarPct ?? 0,
      icon: <CalendarDays size={28} className="text-blue-500" />,
      gradient: 'from-blue-300 to-blue-500',
    },
    {
      label: 'Novos Clientes (Mês)',
      value: summary.newClientsThisMonth,
      pct: summary.clientsVarPct ?? 0,
      icon: <Users size={28} className="text-purple-500" />,
      gradient: 'from-purple-300 to-purple-500',
    },
    {
      label: 'Taxa de Ocupação',
      value: `${summary.occupationRate ?? 0}%`,
      pct: summary.occupationRate ?? 0,
      icon: <TrendingUp size={28} className="text-gray-500" />,
      gradient: 'from-gray-300 to-gray-500',
    },
  ]

  // dados do Bar
  const barData = {
    labels: monthly.map((d) => d.month),
    datasets: [
      {
        label: 'Faturamento',
        data: monthly.map((d) => d.value),
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
        ticks: { callback: (v) => fmtBRL(v) },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => fmtBRL(ctx.parsed.y) } },
    },
  }

  // dados do Doughnut (fallback estático)
  const statsPS = summary.productStats.length
    ? summary.productStats
    : [
        { label: 'Eletrônicos', value: 0 },
        { label: 'Games', value: 0 },
        { label: 'Móveis', value: 0 },
      ]
  const doughnutData = {
    labels: statsPS.map((p) => p.label),
    datasets: [
      {
        data: statsPS.map((p) => p.value),
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`relative bg-gradient-to-br ${c.gradient} rounded-2xl shadow-lg p-5 text-white flex items-center justify-between`}
          >
            <div>
              <p className="text-sm opacity-90">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </div>
            {c.icon}
            <div className="absolute bottom-3 left-5 text-xs bg-white/30 px-2 py-1 rounded-full">
              {c.pct >= 0 ? '+' : ''}
              {c.pct}%
            </div>
          </motion.div>
        ))}
      </div>

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
