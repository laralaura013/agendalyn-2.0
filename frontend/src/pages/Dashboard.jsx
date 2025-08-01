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

// registra Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const Dashboard = () => {
  // estados
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
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: sum } = await api.get('/dashboard/summary')
        let rev = { months: monthly.labels, salesCounts: monthly.values, productStats }
        try {
          const { data } = await api.get('/dashboard/revenue-by-month')
          rev = data
        } catch (e) {
          console.warn('Sem /dashboard/revenue-by-month ou falha: ', e)
        }

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
      } catch (e) {
        console.error('Erro ao buscar dados do dashboard:', e)
        setError(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // formata BRL
  const fmtBRL = v =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  // cards
  const cards = [
    {
      label: 'Faturamento Hoje',
      value: fmtBRL(summary.revenueToday),
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

  // prepara dados dos gráficos
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
  const doughnutData = {
    labels: productStats.map(p => p.label),
    datasets: [
      {
        data: productStats.map(p => p.value),
        backgroundColor: ['#9333ea', '#3b82f6', '#10b981'],
      },
    ],
  }

  // renderização segura
  let content
  if (error) {
    content = (
      <p className="text-red-500">
        Erro ao carregar dashboard: {error.message}
      </p>
    )
  } else if (loading) {
    content = (
      <p className="text-gray-500 animate-pulse">
        Carregando dados do painel...
      </p>
    )
  } else {
    try {
      content = (
        <>
          {/* cards */}
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

          {/* gráfico de barras */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Faturamento Mensal</h2>
            <Bar
              data={barData}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          </div>

          {/* gráfico donut */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Product Statistic</h2>
            <Doughnut
              data={doughnutData}
              options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
            />
          </div>
        </>
      )
    } catch (e) {
      console.error('Erro ao renderizar Dashboard:', e)
      content = (
        <p className="text-red-500">
          Erro ao renderizar dashboard: {e.message}
        </p>
      )
    }
  }

  return (
    <div className="p-4 space-y-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      {content}
    </div>
  )
}

export default Dashboard
