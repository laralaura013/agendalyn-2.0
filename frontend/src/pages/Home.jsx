import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
      
      {/* Seção do Logo e Marca */}
      <div className="flex flex-col justify-center items-center mb-6">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-700">
            <path d="M8 7V6C8 4.34315 9.34315 3 11 3H13C14.6569 3 16 4.34315 16 6V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 10C4 8.34315 5.34315 7 7 7H17C18.6569 7 20 8.34315 20 10V18C20 19.6569 18.6569 21 17 21H7C5.34315 21 4 19.6569 4 18V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 14L11 16L15 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h1 className="mt-4 text-5xl font-bold text-gray-800">Agendalyn</h1>
        <p className="text-lg text-gray-500">sistema de agendamento</p>
      </div>

      {/* Seção do Título e Descrição */}
      <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight max-w-3xl">
        Organize seu negócio. <span className="text-purple-700">Encante seus clientes.</span>
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-gray-600">
        A plataforma completa para barbearias, salões de beleza e clínicas de estética. Agendamentos, controle financeiro, e muito mais, tudo em um só lugar.
      </p>

      {/* Botões de Ação */}
      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        <Link
          to="/register"
          className="px-8 py-3 bg-purple-700 text-white font-semibold rounded-lg shadow-md hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-colors duration-300"
        >
          Cadastre-se Grátis
        </Link>
        <Link
          to="/login"
          className="px-8 py-3 bg-white text-purple-700 font-semibold rounded-lg shadow-md ring-1 ring-inset ring-gray-300 hover:bg-gray-100 transition-colors duration-300"
        >
          Acessar Plataforma
        </Link>
      </div>
    </div>
  );
};

export default Home;