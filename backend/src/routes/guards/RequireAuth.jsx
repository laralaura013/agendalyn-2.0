import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * Bloqueia rotas quando não há token no localStorage.
 * Aceita os keys: 'authToken' ou 'token'.
 * redireciona para /login (configurável via prop).
 */
const getToken = () =>
  localStorage.getItem('authToken') || localStorage.getItem('token') || '';

export default function RequireAuth({ redirectTo = '/login', allowWhen = () => true }) {
  const location = useLocation();
  const token = getToken();
  const ok = Boolean(token) && allowWhen();

  if (!ok) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  return <Outlet />;
}
