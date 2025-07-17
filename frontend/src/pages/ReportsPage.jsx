import React, { useState } from 'react';
import api from '../services/api';
import BarChartComponent from '../components/reports/BarChartComponent';
import PieChartComponent from '../components/reports/PieChartComponent';

const ReportsPage = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    // Define as datas padrão para o dia de hoje
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const handleGenerateReport = async () => {
        setLoading(true);
        setReportData(null);
        try {
            const response = await api.get(`/reports/revenue?startDate=${startDate}&endDate=${endDate}`);
            setReportData(response.data);
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Não foi possível gerar o relatório.";
            console.error("Erro ao gerar relatório:", error);
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Relatórios de Faturamento</h1>

            {/* Seção de Filtros */}
            <div className="p-4 bg-white rounded-lg shadow-md mb-6 flex items-end gap-4">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Data de Início</label>
                    <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Data de Fim</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                </div>
                <button
                    onClick={handleGenerateReport}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {loading ? 'Gerando...' : 'Gerar Relatório'}
                </button>
            </div>

            {/* Seção dos Dados do Relatório */}
            {reportData && (
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-lg shadow-md text-center">
                        <h2 className="text-lg font-medium text-gray-500">Faturamento Total no Período</h2>
                        <p className="text-4xl font-bold text-green-600 mt-2">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportData.totalRevenue)}
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Faturamento por Colaborador</h2>
                        {reportData.revenueByStaff.length > 0 ? (
                            <BarChartComponent data={reportData.revenueByStaff} />
                        ) : (
                            <p className="text-gray-500 text-center py-4">Nenhum dado de faturamento por colaborador neste período.</p>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Faturamento por Serviço</h2>
                        {reportData.revenueByService.length > 0 ? (
                            <PieChartComponent data={reportData.revenueByService} />
                        ) : (
                            <p className="text-gray-500 text-center py-4">Nenhum dado de faturamento por serviço neste período.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;