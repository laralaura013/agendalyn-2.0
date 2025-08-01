import React from 'react'
import Chart from 'react-apexcharts'

const ProductStatistic = ({ data }) => {
  const labels = data.map(item => item.label)
  const series = data.map(item => item.value)

  const options = {
    chart: { type: 'donut' },
    labels,
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
    responsive: [{ breakpoint: 640, options: { chart: { width: 200 } } }],
  }

  return <Chart options={options} series={series} type="donut" width="100%" />
}

export default ProductStatistic
