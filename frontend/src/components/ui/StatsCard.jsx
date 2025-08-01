import React from 'react'
import Card from './Card'

const StatsCard = ({ title, value, variation, isPositive }) => (
  <Card title={title}>
    <div className="flex items-center justify-between">
      <span className="text-2xl font-bold">{value}</span>
      <span
        className={`px-2 py-1 text-sm font-medium rounded ${
          isPositive
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}
      >
        {variation}
      </span>
    </div>
  </Card>
)

export default StatsCard
