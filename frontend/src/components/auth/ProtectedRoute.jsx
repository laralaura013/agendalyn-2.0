import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Alteração: Agora ele recebe 'children' como propriedade
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  // Se estiver autenticado, renderiza os 'children' (que serão nossas rotas)
  // Se não, redireciona para a página de login
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;