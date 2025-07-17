import React, { useState, useEffect } from 'react';

const ServiceForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        price: initialData.price || '',
        duration: initialData.duration || '',
      });
    } else {
      setFormData({ name: '', price: '', duration: '' });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
        ...formData,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration, 10)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">{initialData ? 'Editar Serviço' : 'Novo Serviço'}</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome do Serviço</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
        <input type="number" name="price" value={formData.price} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded" placeholder="Ex: 50.00" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Duração (em minutos)</label>
        <input type="number" name="duration" value={formData.duration} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded" placeholder="Ex: 30" required />
      </div>

      {/* Futuramente: adicionar um multi-select para vincular colaboradores */}

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar</button>
      </div>
    </form>
  );
};

export default ServiceForm;