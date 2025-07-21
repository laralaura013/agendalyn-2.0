import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Building, User, Mail, Lock } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    userName: '',
    userEmail: '',
    password: '',
  });

  // IMPORTANTE: Este é o ID do seu plano no Stripe.
  // Vá ao seu painel do Stripe -> Produtos -> Seu Plano -> Preços -> Copie o ID do Preço
  const stripePriceId = "price_1RmO42Ru0UQiqSF4YzX9jB4O"; // Substitua se for diferente

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const registrationPromise = api.post('/auth/register-checkout', { ...formData, priceId: stripePriceId })
      .then(response => {
        // Redireciona o utilizador para a página de pagamento do Stripe
        if (response.data.url) {
          window.location.href = response.data.url;
        }
      });

    toast.promise(registrationPromise, {
      loading: 'A preparar o seu ambiente seguro...',
      success: 'A redirecionar para o portal de pagamento!',
      error: (err) => err.response?.data?.message || 'Não foi possível iniciar o cadastro. Tente novamente.',
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Crie a sua Conta</h1>
          <p className="mt-2 text-sm text-gray-500">Comece a organizar o seu negócio hoje mesmo.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building className="h-5 w-5 text-gray-400" />
            </div>
            <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Nome do seu Negócio" required />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input type="text" name="userName" value={formData.userName} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Seu nome completo" required />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input type="email" name="userEmail" value={formData.userEmail} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Seu melhor email" required />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Crie uma senha forte" required />
          </div>
          <button type="submit" className="w-full py-3 px-4 bg-purple-700 text-white font-semibold rounded-lg shadow-md hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors">
            Continuar para Pagamento
          </button>
        </form>
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Já tem uma conta?{' '}
            <Link to="/login" className="font-medium text-purple-700 hover:text-purple-600">
              Faça o login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;