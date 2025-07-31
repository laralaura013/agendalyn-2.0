import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../layouts/AdminLayout';

const ProtectedRoute = () => {
  const { token, loading } = useAuth();

  if (loading) return <div>A carregar sessão...</div>;
  if (!token) return <Navigate to="/login" replace />;

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
};

export default ProtectedRoute;
