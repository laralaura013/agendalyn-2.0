import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center bg-gray-50">
      <h1 className="text-5xl font-bold mb-4 text-gray-800">Bem-vindo ao Agendalyn 2.0</h1>
      <p className="text-xl text-gray-600 mb-8">A solução completa para o seu negócio.</p>
      <div>
        <Link to="/login" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
          Acessar Plataforma
        </Link>
        <Link to="/register" className="ml-4 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors">
          Cadastre-se
        </Link>
      </div>
    </div>
  );
};
export default Home;