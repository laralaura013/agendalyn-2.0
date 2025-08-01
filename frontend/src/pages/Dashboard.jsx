// src/pages/Dashboard.jsx

import React from 'react'
import ProductStatistic from '../components/charts/ProductStatistic'

const Dashboard = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold mb-6">Dashboard – Teste ProductStatistic</h1>
    <div className="bg-white rounded-2xl shadow-md p-6">
      <ProductStatistic
        data={[
          { label: 'Eletrônicos', value: 2487 },
          { label: 'Games',       value: 1828 },
          { label: 'Móveis',      value: 1463 },
        ]}
      />
    </div>
  </div>
)

export default Dashboard
