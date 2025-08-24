import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import RequireAuth from './guards/RequireAuth';
import RequireRole from './guards/RequireRole';

// Páginas existentes no seu projeto:
import Clients from '../pages/Clients';
import Staff from '../pages/Staff';
import Orders from '../pages/Orders';
import Cashier from '../pages/Cashier';

/**
 * Placeholder simples de Login
 * (evita quebra caso você ainda não tenha uma tela de login).
 * Troque quando sua auth real estiver pronta.
 */
function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from?.pathname || '/dashboard';

  const fakeLogin = () => {
    // grava um token fake e um usuário com role ADMIN
    localStorage.setItem('authToken', 'demo-token');
    localStorage.setItem('authUser', JSON.stringify({ id: '1', name: 'Admin', role: 'ADMIN' }));
    nav(from, { replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-sm w-full border rounded-xl p-5 bg-white shadow">
        <h1 className="text-xl font-semibold mb-2">Login</h1>
        <p className="text-sm text-gray-600 mb-4">
          Este é apenas um placeholder. Clique abaixo para simular o login.
        </p>
        <button
          onClick={fakeLogin}
          className="w-full px-4 py-2 rounded-lg bg-purple-700 text-white hover:bg-purple-800"
        >
          Entrar (demo)
        </button>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Raiz → dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Login (placeholder) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Área protegida por autenticação */}
        <Route element={<RequireAuth redirectTo="/login" />}>
          {/* Home do dashboard */}
          <Route path="/dashboard" element={<Navigate to="/dashboard/clients" replace />} />

          {/* Rotas protegidas por role */}
          <Route element={<RequireRole allowed={['OWNER', 'ADMIN', 'MANAGER']} fallback="/dashboard" />}>
            <Route path="/dashboard/staff" element={<Staff />} />
          </Route>

          {/* Rotas autenticadas (sem restrição de role) */}
          <Route path="/dashboard/clients" element={<Clients />} />
          <Route path="/dashboard/orders" element={<Orders />} />
          <Route path="/dashboard/cashier" element={<Cashier />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
