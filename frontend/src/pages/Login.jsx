import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      // Guarda os dados da sessão no contexto
      login(token, user);

      // Também salva o userData no localStorage para uso no SettingsPage
      localStorage.setItem('userData', JSON.stringify(user));

      toast.success('Login bem-sucedido!');

      // Redireciona para o painel
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Bem-vindo(a) de volta!</h1>
          <p className="text-gray-500 mt-2">Faça login para continuar.</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full p-3 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
        <div className="text-center mt-6">
          <p className="text-sm">
            Não tem uma conta?{' '}
            <Link to="/register" className="font-medium text-purple-600 hover:underline">
              Registe-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
