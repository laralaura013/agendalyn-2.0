import React from 'react'
import Chart from 'react-apexcharts'

const CustomerHabits = ({ data }) => {
  // data: { categories: [], seriesA: [], seriesB: [] }
  const options = {
    chart: { type: 'bar', toolbar: { show: false } },
    xaxis: { categories: data.categories },
    plotOptions: { bar: { borderRadius: 8, columnWidth: '50%' } },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    tooltip: { shared: true, intersect: false },
  }

  const series = [
    { name: 'Seen product', data: data.seriesA },
    { name: 'Sales',       data: data.seriesB },
  ]

  return <Chart options={options} series={series} type="bar" height={300} />
}

export default CustomerHabits
