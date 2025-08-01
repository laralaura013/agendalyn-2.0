// src/pages/Dashboard.jsx

import React from 'react'
import CustomerHabits from '../components/charts/CustomerHabits'

const Dashboard = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold mb-6">Dashboard – Teste CustomerHabits</h1>
    <div className="bg-white rounded-2xl shadow-md p-6">
      <CustomerHabits
        data={{
          categories: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul'],
          seriesA:    [30, 40, 45, 50, 49, 60, 70],
          seriesB:    [23, 32, 34, 52, 41, 59, 65],
        }}
      />
    </div>
  </div>
)

export default Dashboard
