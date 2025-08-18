import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// O AdminLayout foi removido daqui, pois não é responsabilidade deste componente.
// import AdminLayout from '../layouts/AdminLayout';

const ProtectedRoute = () => {
  const { token, loading } = useAuth();

  // Enquanto verifica a autenticação, mostra uma mensagem de carregamento.
  if (loading) {
    return <div>A carregar sessão...</div>;
  }

  // Se não houver token, redireciona para a página de login.
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Se o usuário estiver autenticado, simplesmente renderiza a página solicitada.
  // O App.jsx já está cuidando de colocar o AdminLayout em volta desta página.
  return <Outlet />;
};

export default ProtectedRoute;
