import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Se houver um token, tentamos validar e buscar os dados do usuário
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      // Você pode criar uma rota no backend para buscar o perfil do usuário logado
      // Ex: api.get('/company/profile').then(response => setUser(response.data.user));
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user: userData } = response.data;

      localStorage.setItem('token', accessToken);
      api.defaults.headers.Authorization = `Bearer ${accessToken}`;
      
      setToken(accessToken);
      setUser(userData);
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro no login:', error);
      // Aqui você pode exibir uma mensagem de erro para o usuário
      alert('Email ou senha inválidos.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    api.defaults.headers.Authorization = null;
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook customizado para facilitar o uso do contexto
export const useAuth = () => {
  return useContext(AuthContext);
};
