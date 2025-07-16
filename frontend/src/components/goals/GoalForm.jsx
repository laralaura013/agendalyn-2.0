import React, { useState, useEffect } from 'react';

const GoalForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    type: 'TOTAL',
    targetValue: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    userId: '',
    serviceId: '',
  });

  // Mock de dados - substituir por dados da API
  const availableStaff = [
    { id: 'user1', name: 'Carlos Pereira' },
    { id: 'user2', name: 'Ana Souza' },
  ];
  const availableServices = [
    { id: 'service1', name: 'Corte Masculino' },
    { id: 'service2', name: 'Manicure' },
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type || 'TOTAL',
        targetValue: initialData.targetValue || '',
        month: initialData.month || new Date().getMonth() + 1,
        year: initialData.year || new Date().getFullYear(),
        userId: initialData.userId || '',
        serviceId: initialData.serviceId || '',
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">{initialData ? 'Editar Meta' : 'Nova Meta'}</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700">Tipo de Meta</label>
        <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full p-2 border rounded">
          <option value="TOTAL">Faturamento Total</option>
          <option value="BY_USER">Por Colaborador</option>
          <option value="BY_SERVICE">Por Serviço</option>
        </select>
      </div>

      {formData.type === 'BY_USER' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Colaborador</label>
          <select name="userId" value={formData.userId} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required>
            <option value="">Selecione um colaborador</option>
            {availableStaff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      )}

      {formData.type === 'BY_SERVICE' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Serviço</label>
          <select name="serviceId" value={formData.serviceId} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required>
            <option value="">Selecione um serviço</option>
            {availableServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Valor da Meta (R$)</label>
        <input type="number" name="targetValue" value={formData.targetValue} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Mês</label>
          <input type="number" name="month" value={formData.month} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" min="1" max="12" required />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Ano</label>
          <input type="number" name="year" value={formData.year} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" min="2020" required />
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar Meta</button>
      </div>
    </form>
  );
};

export default GoalForm;
