import React, { useState, useEffect } from 'react';

const ClientForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '', // CAMPO ADICIONADO
    birthDate: '',
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        phone: initialData.phone || '',
        email: initialData.email || '', // CAMPO ADICIONADO
        birthDate: initialData.birthDate ? initialData.birthDate.split('T')[0] : '',
        notes: initialData.notes || '',
      });
    } else {
      // Reseta o formulário para um novo cliente
      setFormData({ name: '', phone: '', email: '', birthDate: '', notes: '' });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = { ...formData };
    if (!dataToSend.birthDate) {
      delete dataToSend.birthDate; // Envia null se a data estiver vazia
    }
    onSave(dataToSend);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">{initialData ? 'Editar Cliente' : 'Novo Cliente'}</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefone</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
        <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Observações</label>
        <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className="mt-1 block w-full p-2 border rounded"></textarea>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-purple-700 text-white rounded-md">Salvar</button>
      </div>
    </form>
  );
};

export default ClientForm;