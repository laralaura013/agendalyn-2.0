// src/pages/Dashboard.jsx

import React from 'react'
import StatsCard from '../components/ui/StatsCard'

const Dashboard = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold text-gray-800">Dashboard – Teste StatsCard</h1>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
      <StatsCard
        title="Teste Positivo"
        value="123"
        variation="+10%"
        isPositive={true}
      />
      <StatsCard
        title="Teste Negativo"
        value="456"
        variation="-5%"
        isPositive={false}
      />
    </div>
  </div>
)

export default Dashboard
