import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ClientProtectedRoute = () => {
    const clientToken = localStorage.getItem('clientToken');

    // Se não houver token, redireciona para a página inicial.
    if (!clientToken) {
        return <Navigate to="/" replace />;
    }

    // Se houver token, renderiza a página filha (o <Outlet /> representa a página do painel).
    return <Outlet />;
};

export default ClientProtectedRoute;