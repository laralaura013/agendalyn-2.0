import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * Permite acesso somente se o usuário tiver uma das roles em `allowed`.
 * Busca o usuário em localStorage (keys: 'authUser', 'user', 'auth').
 * Aceita formatos: { role: 'ADMIN' } ou { user: { role: 'ADMIN' } }.
 */
function readUserFromStorage() {
  const keys = ['authUser', 'user', 'auth'];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.user && typeof parsed.user === 'object') return parsed.user;
        return parsed;
      }
    } catch {
      // ignora JSON inválido
    }
  }
  return null;
}

function getUserRole() {
  const u = readUserFromStorage();
  return u?.role || (Array.isArray(u?.roles) ? u.roles[0] : null);
}

export default function RequireRole({ allowed = [], fallback = '/dashboard' }) {
  const location = useLocation();

  if (!allowed || allowed.length === 0) {
    return <Outlet />;
  }

  const role = getUserRole();
  if (role && allowed.includes(role)) {
    return <Outlet />;
  }

  return <Navigate to={fallback} replace state={{ from: location }} />;
}
