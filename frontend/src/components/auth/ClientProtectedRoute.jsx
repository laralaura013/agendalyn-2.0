import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ClientProtectedRoute = ({ children }) => {
    // --- LOG DE DEPURAÇÃO ---
    console.log("ClientProtectedRoute: A verificar o token de cliente...");

    const clientToken = localStorage.getItem('clientToken');
    const location = useLocation();

    if (!clientToken) {
        console.log("ClientProtectedRoute: Token não encontrado. A redirecionar...");
        // Vamos redirecionar para a home, pois não sabemos o companyId aqui.
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    console.log("ClientProtectedRoute: Token encontrado. A permitir o acesso.");
    return children;
};

export default ClientProtectedRoute;