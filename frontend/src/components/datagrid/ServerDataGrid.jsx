// frontend/src/components/datagrid/ServerDataGrid.jsx
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown } from 'lucide-react';

function cls(...xs) {
  return xs.filter(Boolean).join(' ');
}

export default function ServerDataGrid({
  columns = [],
  rows = [],
  loading = false,
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortDir,
  onSortChange,
  emptyMessage = 'Nenhum registro encontrado.',
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleHeaderClick = (col) => {
    if (!col.sortable) return;
    const nextDir = sortBy === col.key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    onSortChange?.({ sortBy: col.key, sortDir: nextDir });
  };

  return (
    <div className="bg-white shadow rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col)}
                  className={cls(
                    'px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap',
                    col.sortable && 'cursor-pointer select-none'
                  )}
                >
                  <div className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortBy === col.key && (
                      sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={columns.length}>
                  Carregando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id || i} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-800">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Linhas por página:</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">
            {total > 0
              ? `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`
              : '—'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
            onClick={() => onPageChange?.(1)}
            disabled={page <= 1}
            title="Primeira página"
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
            title="Anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="px-2 text-sm text-gray-700">
            Página {page} de {totalPages}
          </span>

          <button
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            title="Próxima"
          >
            <ChevronRight size={18} />
          </button>
          <button
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
            onClick={() => onPageChange?.(totalPages)}
            disabled={page >= totalPages}
            title="Última página"
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
