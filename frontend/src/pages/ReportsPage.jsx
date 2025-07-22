import React, { useState } from 'react';
import api from '../services/api';
import BarChartComponent from '../components/reports/BarChartComponent';
import PieChartComponent from '../components/reports/PieChartComponent';
import toast from 'react-hot-toast'; // Adicionado para mensagens de erro

const ReportsPage = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const handleGenerateReport = async () => {
        setLoading(true);
        setReportData(null);
        try {
            const response = await api.get('/reports/revenue', {
                params: { startDate, endDate }
            });
            setReportData(response.data);
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Não foi possível gerar o relatório.";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Relatórios de Faturação</h1>

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
                    className="px-6 py-2 bg-purple-700 text-white font-semibold rounded-lg shadow-md hover:bg-purple-800 disabled:bg-gray-400"
                >
                    {loading ? 'A gerar...' : 'Gerar Relatório'}
                </button>
            </div>

            {/* Seção dos Dados do Relatório */}
            {reportData && (
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-lg shadow-md text-center">
                        <h2 className="text-lg font-medium text-gray-500">Faturação Total no Período</h2>
                        <p className="text-4xl font-bold text-green-600 mt-2">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportData.totalRevenue)}
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Faturação por Colaborador</h2>
                        {/* CORREÇÃO: Verifica se os dados existem antes de renderizar o gráfico */}
                        {reportData.revenueByStaff && reportData.revenueByStaff.length > 0 ? (
                            <BarChartComponent data={reportData.revenueByStaff} />
                        ) : (
                            <p className="text-gray-500 text-center py-4">Nenhum dado de faturação por colaborador neste período.</p>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Faturação por Serviço</h2>
                        {/* CORREÇÃO: Verifica se os dados existem antes de renderizar o gráfico */}
                        {reportData.revenueByService && reportData.revenueByService.length > 0 ? (
                            <PieChartComponent data={reportData.revenueByService} />
                        ) : (
                            <p className="text-gray-500 text-center py-4">Nenhum dado de faturação por serviço neste período.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;