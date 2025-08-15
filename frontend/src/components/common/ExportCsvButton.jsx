// frontend/src/components/common/ExportCsvButton.jsx
import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Exemplo de uso:
 * <ExportCsvButton entity="payables" />
 * <ExportCsvButton entity="receivables" label="Exportar Receber" fileName="receber.csv" params={{ status:'OPEN' }} />
 */
const ExportCsvButton = ({ entity, label = 'Exportar CSV', fileName, params }) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!entity) return;
    try {
      setLoading(true);
      const res = await api.get(`/exports/${entity}.csv`, {
        responseType: 'blob',
        params: params || {},
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `${entity}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Erro ao exportar CSV.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-60"
    >
      {loading ? 'Exportando...' : label}
    </button>
  );
};

export default ExportCsvButton;
