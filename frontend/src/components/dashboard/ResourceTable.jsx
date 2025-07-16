import React from 'react';

const ResourceTable = ({ columns, data, onEdit, onDelete }) => {
  if (!data || data.length === 0) {
    return <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">Nenhum item encontrado.</div>;
  }

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col.header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {columns.map((col) => {
                  const value = getNestedValue(item, col.accessor);
                  return (
                    <td key={col.accessor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {col.render ? col.render(value, item) : value}
                    </td>
                  );
                })}
                {(onEdit || onDelete) && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {onEdit && (
                      <button onClick={() => onEdit(item)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        Editar
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900">
                        Excluir
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResourceTable;