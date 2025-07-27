import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const ClientRegisterPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    companyId,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/portal/register', formData);

      const { token, client } = response.data;
      localStorage.setItem('clientToken', token);
      localStorage.setItem('clientData', JSON.stringify(client));

      toast.success('Conta criada com sucesso!');
      navigate('/portal/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Crie sua Conta no Portal</h1>
          <p className="text-gray-500">Acesse seus agendamentos e pacotes com facilidade.</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full p-3 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full p-3 border rounded-md"
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
                className="mt-1 block w-full p-3 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full p-3 border rounded-md"
                required
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 disabled:bg-gray-400"
              >
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm">
            Já tem uma conta?{' '}
            <Link to={`/portal/login/${companyId}`} className="font-medium text-purple-600 hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientRegisterPage;
