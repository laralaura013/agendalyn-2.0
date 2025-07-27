import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateClientProfile } from '../services/clientService';
import toast from 'react-hot-toast';

const ClientProfilePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    const clientInfo = JSON.parse(localStorage.getItem('clientData'));
    if (!clientInfo) {
      navigate('/portal/login');
      return;
    }

    setFormData({
      name: clientInfo.name || '',
      phone: clientInfo.phone || '',
      password: '',
    });
  }, [navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateClientProfile(formData);
      localStorage.setItem('clientData', JSON.stringify(res.client));
      toast.success('Perfil atualizado com sucesso!');
      setFormData((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar perfil.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center text-purple-700">Editar Perfil</h1>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nova Senha (opcional)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md"
              placeholder="Deixe em branco para manter a atual"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2 px-4 rounded-md"
          >
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientProfilePage;
