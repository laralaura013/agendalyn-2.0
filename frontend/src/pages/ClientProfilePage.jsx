import React, { useState, useEffect } from 'react';
import ClientLayout from '../components/layouts/ClientLayout';
import api from '../services/api';
import toast from 'react-hot-toast';

const ClientProfilePage = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientProfile();
  }, []);

  const fetchClientProfile = async () => {
    try {
      const res = await api.get('/portal/me');
      setFormData({ name: res.data.name, phone: res.data.phone, password: '' });
    } catch (err) {
      toast.error('Erro ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put('/portal/me', formData);
      toast.success('Perfil atualizado com sucesso!');
      setFormData(prev => ({ ...prev, password: '' })); // limpa campo senha
    } catch (err) {
      toast.error('Erro ao atualizar perfil.');
    }
  };

  return (
    <ClientLayout>
      <h1 className="text-2xl font-bold mb-4 text-purple-700">Editar Perfil</h1>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2 border rounded"
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
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-purple-700 text-white py-2 px-4 rounded hover:bg-purple-800 transition"
          >
            Salvar Alterações
          </button>
        </form>
      )}
    </ClientLayout>
  );
};

export default ClientProfilePage;
