import React, { useState, useEffect } from 'react';

const PackageForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    sessions: '',
    validityDays: '',
    serviceIds: [],
  });

  // Mock de dados - substituir por dados da API
  const availableServices = [
    { id: 'service1', name: 'Corte Masculino' },
    { id: 'service2', name: 'Manicure' },
    { id: 'service3', name: 'Massagem Relaxante' },
    { id: 'service4', name: 'Limpeza de Pele' },
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        price: initialData.price || '',
        sessions: initialData.sessions || '',
        validityDays: initialData.validityDays || '',
        serviceIds: initialData.serviceIds || [],
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceToggle = (serviceId) => {
    setFormData(prev => {
      const serviceIds = prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter(id => id !== serviceId)
        : [...prev.serviceIds, serviceId];
      return { ...prev, serviceIds };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">{initialData ? 'Editar Pacote' : 'Novo Pacote'}</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700">Nome do Pacote</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
          <input type="number" name="price" value={formData.price} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Nº de Sessões</label>
          <input type="number" name="sessions" value={formData.sessions} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
        </div>
      </div>

      <div>
          <label className="block text-sm font-medium text-gray-700">Validade (em dias)</label>
          <input type="number" name="validityDays" value={formData.validityDays} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" placeholder="Ex: 90" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Serviços Incluídos</label>
        <div className="mt-2 p-2 border rounded-md max-h-40 overflow-y-auto">
            {availableServices.map(service => (
                <div key={service.id} className="flex items-center">
                    <input
                        type="checkbox"
                        id={`service-${service.id}`}
                        checked={formData.serviceIds.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className="h-4 w-4 rounded"
                    />
                    <label htmlFor={`service-${service.id}`} className="ml-2 text-sm text-gray-600">{service.name}</label>
                </div>
            ))}
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar Pacote</button>
      </div>
    </form>
  );
};

export default PackageForm;
