import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ClientProtectedRoute = ({ children }) => {
    const clientToken = localStorage.getItem('clientToken');
    const location = useLocation();

    if (!clientToken) {
        // Se não houver token de cliente, redireciona para a página de login do portal
        // Nota: Precisamos de uma forma de saber o companyId aqui, por agora redirecionamos para a home.
        // Vamos melhorar isto no futuro.
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
};

export default ClientProtectedRoute;