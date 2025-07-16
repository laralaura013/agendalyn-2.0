import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  // Enquanto verifica a autenticação, pode-se mostrar um spinner/loading
  if (loading) {
    return <div>Carregando...</div>;
  }

  // Se estiver autenticado, renderiza o conteúdo da rota (usando o Outlet)
  // Se não, redireciona para a página de login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;