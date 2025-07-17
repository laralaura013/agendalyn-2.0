import React, { useState, useEffect } from 'react';

const StaffForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STAFF',
    password: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        role: initialData.role || 'STAFF',
        password: '', // Senha não é preenchida na edição por segurança
      });
    } else {
      setFormData({ name: '', email: '', role: 'STAFF', password: '' });
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
      <h2 className="text-2xl font-bold mb-4">{initialData ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Função</label>
        <select name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded">
          <option value="STAFF">Colaborador(a)</option>
          <option value="OWNER">Dono(a) / Admin</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Senha</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded" placeholder={initialData ? 'Deixe em branco para não alterar' : ''} required={!initialData} />
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar</button>
      </div>
    </form>
  );
};

export default StaffForm; // A linha mais importante que estava faltando!
