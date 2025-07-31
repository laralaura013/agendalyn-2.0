import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../dashboard/DashboardLayout'; // Importa o Layout aqui

const ProtectedRoute = () => {
    const { token, loading } = useAuth();

    if (loading) {
        return <div>A carregar sessão...</div>;
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Se o utilizador estiver autenticado, renderiza o Layout Principal.
    // O Layout, por sua vez, irá renderizar a página correta (ex: /dashboard).
    return <DashboardLayout />;
};

export default ProtectedRoute;
