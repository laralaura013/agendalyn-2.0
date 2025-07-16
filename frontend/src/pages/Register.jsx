import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api'; // Nosso serviço de API centralizado

const Register = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    userName: '',
    userEmail: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/register', formData);
      setSuccess('Cadastro realizado com sucesso! Você será redirecionado para o login.');
      
      // Redireciona para o login após 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Ocorreu um erro ao realizar o cadastro. Tente novamente.');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Crie sua Conta</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
          {success && <div className="p-3 bg-green-100 text-green-700 rounded">{success}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Nome do seu Negócio</label>
            <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Seu Nome</label>
            <input type="text" name="userName" value={formData.userName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Seu Email de Acesso</label>
            <input type="email" name="userEmail" value={formData.userEmail} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Crie uma Senha</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" required />
          </div>

          <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
            Cadastrar
          </button>
        </form>
        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-blue-600 hover:underline">
            Já tem uma conta? Faça o login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
