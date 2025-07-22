import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ClientProtectedRoute = ({ children }) => {
    const clientToken = localStorage.getItem('clientToken');
    const location = useLocation();

    if (!clientToken) {
        // Se não houver token, redireciona para a página inicial, pois não sabemos o ID da empresa.
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Se houver token, permite o acesso.
    return children;
};

export default ClientProtectedRoute;