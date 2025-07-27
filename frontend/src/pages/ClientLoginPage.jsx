import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const ClientLoginPage = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
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
      const response = await api.post('/portal/login', formData);
      const { token, client } = response.data;

      localStorage.setItem('clientToken', token);
      localStorage.setItem('clientData', JSON.stringify(client));

      toast.success('Login bem-sucedido!');
      navigate('/portal/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Portal do Cliente</h1>
          <p className="text-gray-500">Acesse seus agendamentos e pacotes.</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
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
                {loading ? 'A entrar...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm">
            Não tem uma conta?{' '}
            <Link to={`/portal/register/${companyId}`} className="font-medium text-purple-600 hover:underline">
              Crie uma agora
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientLoginPage;
