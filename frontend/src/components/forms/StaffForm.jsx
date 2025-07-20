import React, { useState, useEffect } from 'react';

const StaffForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STAFF',
    password: '',
    showInBooking: true, // Novo campo
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        role: initialData.role || 'STAFF',
        password: '',
        showInBooking: typeof initialData.showInBooking === 'boolean' ? initialData.showInBooking : true, // Novo campo
      });
    } else {
      setFormData({ name: '', email: '', role: 'STAFF', password: '', showInBooking: true });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Lógica especial para lidar com o checkbox
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">{initialData ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Função</label>
        <select name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full p-2 border rounded">
          <option value="STAFF">Colaborador(a)</option>
          <option value="OWNER">Dono(a) / Admin</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Senha</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full p-2 border rounded" placeholder={initialData ? 'Deixe em branco para não alterar' : ''} required={!initialData} />
      </div>

      {/* --- NOVO CAMPO CHECKBOX --- */}
      <div className="flex items-center">
        <input
            id="showInBooking"
            name="showInBooking"
            type="checkbox"
            checked={formData.showInBooking}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
        <label htmlFor="showInBooking" className="ml-2 block text-sm text-gray-900">
            Visível na página de agendamento público
        </label>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-purple-700 text-white rounded-md">Salvar</button>
      </div>
    </form>
  );
};

export default StaffForm;