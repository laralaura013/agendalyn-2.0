import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { token, loading } = useAuth();
    const location = useLocation();

    // Enquanto a aplicação está a verificar se existe um token guardado,
    // mostramos uma mensagem de "A carregar..." para evitar o "loop".
    if (loading) {
        return <div>A carregar sessão...</div>;
    }

    // Se o carregamento terminou e NÃO existe um token,
    // redirecionamos para a página de login.
    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Se o carregamento terminou e EXISTE um token,
    // mostramos a página que o utilizador queria aceder.
    return children;
};

export default ProtectedRoute;