import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const PackageForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    sessions: '',
    validityDays: '',
    serviceIds: [],
  });
  
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Busca os serviços disponíveis para preencher a checklist
  useEffect(() => {
    api.get('/services')
      .then(response => {
        setAvailableServices(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao buscar serviços para o formulário:", error);
        alert("Não foi possível carregar a lista de serviços.");
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceToggle = (serviceId) => {
    setFormData(prev => {
      const newServiceIds = prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter(id => id !== serviceId)
        : [...prev.serviceIds, serviceId];
      return { ...prev, serviceIds: newServiceIds };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  
  if (loading) return <p>Carregando serviços...</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Novo Pacote de Serviços</h2>
      <div>
        <label className="block text-sm font-medium">Nome do Pacote</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium">Preço (R$)</label>
          <input type="number" name="price" value={formData.price} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">Nº de Sessões</label>
          <input type="number" name="sessions" value={formData.sessions} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">Validade (em dias)</label>
        <input type="number" name="validityDays" value={formData.validityDays} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" placeholder="Ex: 90" required />
      </div>
      <div>
        <label className="block text-sm font-medium">Serviços Incluídos no Pacote</label>
        <div className="mt-2 p-3 border rounded-md max-h-40 overflow-y-auto space-y-2 bg-gray-50">
          {availableServices.length > 0 ? availableServices.map(service => (
            <div key={service.id} className="flex items-center">
              <input
                type="checkbox"
                id={`service-${service.id}`}
                checked={formData.serviceIds.includes(service.id)}
                onChange={() => handleServiceToggle(service.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`service-${service.id}`} className="ml-2 block text-sm text-gray-900">{service.name}</label>
            </div>
          )) : <p className="text-sm text-gray-500">Nenhum serviço cadastrado.</p>}
        </div>
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Salvar Pacote</button>
      </div>
    </form>
  );
};

export default PackageForm;