// src/pages/Dashboard.jsx

import React, { useEffect, useState } from 'react'
import api from '../services/api'
import StatsCard from '../components/ui/StatsCard'
import CustomerHabits from '../components/charts/CustomerHabits'
import ProductStatistic from '../components/charts/ProductStatistic'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSales:     { value: 'R$ 0', var: 0 },
    totalOrders:    { value: 0,    var: 0 },
    visitor:        { value: 0,    var: 0 },
    soldProducts:   { value: 0,    var: 0 },
    months:   ['Jan','Fev','Mar','Abr','Mai','Jun','Jul'],
    seenCounts: [0,0,0,0,0,0,0],
    salesCounts:[0,0,0,0,0,0,0],
    productStats: [
      { label: 'Eletrônicos', value: 0 },
      { label: 'Games',        value: 0 },
      { label: 'Móveis',       value: 0 },
    ],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // summary: { totalSales: {value, var}, totalOrders, visitor, soldProducts }
        const resSummary = await api.get('/dashboard/summary')
        // revenue-by-month: { months, seenCounts, salesCounts, productStats }
        const resRevenue = await api.get('/dashboard/revenue-by-month')

        setStats({
          ...stats,
          totalSales:   resSummary.data.totalSales,
          totalOrders:  resSummary.data.totalOrders,
          visitor:      resSummary.data.visitor,
          soldProducts: resSummary.data.soldProducts,
          months:       resRevenue.data.months,
          seenCounts:   resRevenue.data.seenCounts,
          salesCounts:  resRevenue.data.salesCounts,
          productStats: resRevenue.data.productStats,
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-4 space-y-8 max-w-5xl mx-auto animate-fade-in-up">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {loading
        ? <p className="text-gray-500 animate-pulse">Carregando dados do painel...</p>
        : (
          <>
            {/* ▷ grid de métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Sales"
                value={stats.totalSales.value}
                variation={`${stats.totalSales.var}%`}
                isPositive={stats.totalSales.var >= 0}
              />
              <StatsCard
                title="Total Orders"
                value={stats.totalOrders.value}
                variation={`${stats.totalOrders.var}%`}
                isPositive={stats.totalOrders.var >= 0}
              />
              <StatsCard
                title="Visitor"
                value={stats.visitor.value}
                variation={`${stats.visitor.var}%`}
                isPositive={stats.visitor.var >= 0}
              />
              <StatsCard
                title="Total Sold Products"
                value={stats.soldProducts.value}
                variation={`${stats.soldProducts.var}%`}
                isPositive={stats.soldProducts.var >= 0}
              />
            </div>

            {/* ▷ gráfico de barras */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Customer Habits</h3>
              <CustomerHabits
                data={{
                  categories: stats.months,
                  seriesA:    stats.seenCounts,
                  seriesB:    stats.salesCounts,
                }}
              />
            </div>

            {/* ▷ gráfico donut */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Product Statistic</h3>
              <ProductStatistic data={stats.productStats} />
            </div>
          </>
        )
      }
    </div>
  )
}

export default Dashboard
