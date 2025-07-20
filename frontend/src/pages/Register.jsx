import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Building, User, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    userName: '',
    userEmail: '',
    password: '',
  });

  // --- PASSO MAIS IMPORTANTE ---
  // Substitua o valor abaixo pelo seu ID do Preço de PRODUÇÃO do Stripe
  const stripePriceId = "COLE_AQUI_O_SEU_ID_DO_PREÇO_REAL_price_...";

  const [searchParams] = useSearchParams();
  const registrationStatus = searchParams.get('registration');


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripePriceId || stripePriceId.includes('...')) {
        toast.error("Erro de configuração do sistema. Por favor, contacte o suporte.");
        return;
    }

    const registrationPromise = api.post('/auth/register-checkout', { ...formData, priceId: stripePriceId })
      .then(response => {
        window.location.href = response.data.url;
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
          <div className="flex justify-center items-center mb-4">
             <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-700">
                <path d="M8 7V6C8 4.34315 9.34315 3 11 3H13C14.6569 3 16 4.34315 16 6V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 10C4 8.34315 5.34315 7 7 7H17C18.6569 7 20 8.34315 20 10V18C20 19.6569 18.6569 21 17 21H7C5.34315 21 4 19.6569 4 18V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 14L11 16L15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="ml-3 text-3xl font-bold text-gray-800">Agendalyn</h1>
          </div>
          <h2 className="text-xl text-gray-700">Crie sua conta</h2>
          <p className="mt-2 text-sm text-gray-500">Comece a organizar seu negócio hoje mesmo</p>
        </div>
        
        {registrationStatus === 'canceled' && (
          <div className="p-3 bg-yellow-100 text-yellow-800 rounded-md text-sm text-center">
            O processo de pagamento foi cancelado. Pode tentar novamente quando quiser.
          </div>
        )}

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