import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center">
          {/* Logo e Nome da Marca */}
          <div className="flex justify-center items-center mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-700">
                <path d="M8 7V6C8 4.34315 9.34315 3 11 3H13C14.6569 3 16 4.34315 16 6V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 10C4 8.34315 5.34315 7 7 7H17C18.6569 7 20 8.34315 20 10V18C20 19.6569 18.6569 21 17 21H7C5.34315 21 4 19.6569 4 18V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 14L11 16L15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="ml-3 text-3xl font-bold text-gray-800">Agendalyn</h1>
          </div>
          <h2 className="text-xl text-gray-700">Bem-vindo(a) de volta!</h2>
          <p className="mt-2 text-sm text-gray-500">Informe seus dados para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Campo de Email com Ícone */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="seu@email.com"
              required
            />
          </div>

          {/* Campo de Senha com Ícone */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Sua senha"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-purple-700 text-white font-semibold rounded-lg shadow-md hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-colors"
          >
            Entrar
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Não possui conta?{' '}
            <Link to="/register" className="font-medium text-purple-700 hover:text-purple-600">
              Crie sua conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;