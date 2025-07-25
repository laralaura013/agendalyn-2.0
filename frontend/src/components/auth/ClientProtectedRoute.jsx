import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ClientProtectedRoute = () => {
    const clientToken = localStorage.getItem('clientToken');
    const clientData = JSON.parse(localStorage.getItem('clientData'));
    const companyId = clientData?.companyId || 'empresa'; // fallback

    if (!clientToken) {
        return <Navigate to={`/portal/login/${companyId}`} replace />;
    }

    return <Outlet />;
};

export default ClientProtectedRoute;
