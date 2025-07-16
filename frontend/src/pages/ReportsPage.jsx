import React, { useState } from 'react';
import BarChartComponent from '../components/reports/BarChartComponent';
import PieChartComponent from '../components/reports/PieChartComponent';

const ReportsPage = () => {
  const [dateRange, setDateRange] = useState({
    start: '2025-07-01',
    end: '2025-07-15'
  });

  const revenueByUser = [
    { name: 'João', Faturamento: 4000 },
    { name: 'Maria', Faturamento: 3000 },
    { name: 'Pedro', Faturamento: 2000 },
    { name: 'Ana', Faturamento: 2780 },
    { name: 'Carlos', Faturamento: 1890 },
  ];
  const revenueByService = [
    { name: 'Corte', value: 400 },
    { name: 'Barba', value: 300 },
    { name: 'Pintura', value: 300 },
    { name: 'Manicure', value: 200 },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Relatórios</h1>
      {/* Aqui entrariam os filtros de data */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-center">Faturamento por Colaborador</h2>
          <BarChartComponent data={revenueByUser} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-center">Faturamento por Serviço</h2>
          <PieChartComponent data={revenueByService} />
        </div>
      </div>
    </div>
  );
};
export default ReportsPage;