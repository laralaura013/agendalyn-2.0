// src/pages/Dashboard.jsx

import React from 'react'
import StatsCard from '../components/ui/StatsCard'
import CustomerHabits from '../components/charts/CustomerHabits'
import ProductStatistic from '../components/charts/ProductStatistic'

const Dashboard = () => {
  // Dados estáticos de exemplo
  const stats = {
    totalSales:   { value: 'R$ 12.345', var: 5 },
    totalOrders:  { value:  987,       var: -2 },
    visitor:      { value:  4567,      var: 12 },
    soldProducts: { value:  1234,      var: 8 },
  }
  const chartData = {
    categories: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul'],
    seriesA:    [30, 40, 45, 50, 49, 60, 70],
    seriesB:    [23, 32, 34, 52, 41, 59, 65],
  }
  const productStats = [
    { label: 'Eletrônicos', value: 2487 },
    { label: 'Games',       value: 1828 },
    { label: 'Móveis',      value: 1463 },
  ]

  return (
    <div className="p-4 space-y-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard – Teste Integrado</h1>

      {/* Estatísticas */}
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

      {/* Gráfico de barras */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Customer Habits</h3>
        <CustomerHabits data={chartData} />
      </div>

      {/* Gráfico donut */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Product Statistic</h3>
        <ProductStatistic data={productStats} />
      </div>
    </div>
  )
}

export default Dashboard
