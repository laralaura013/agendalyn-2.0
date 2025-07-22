import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = () => {
    const { token, loading } = useAuth();

    // Enquanto a aplicação está a verificar se existe um token guardado,
    // mostramos uma mensagem de "A carregar..." para evitar o "loop".
    if (loading) {
        return <div>A carregar sessão...</div>;
    }

    // Se o carregamento terminou e NÃO existe um token,
    // redirecionamos para a página de login.
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Se o carregamento terminou e EXISTE um token,
    // renderiza a página filha (o DashboardLayout com o seu conteúdo).
    return <Outlet />;
};

export default ProtectedRoute;