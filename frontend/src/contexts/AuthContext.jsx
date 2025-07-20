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
    if (token) {
      api.defaults.headers.Authorization = `Bearer ${token}`;
      // Futuramente, podemos adicionar uma chamada para buscar os dados do usuário
      // e confirmar se o token ainda é válido no servidor.
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
      alert('Email ou senha inválidos.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.Authorization; // Garante a remoção do cabeçalho
    setToken(null);
    setUser(null);
    navigate('/login'); // Redireciona para a página de login
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};