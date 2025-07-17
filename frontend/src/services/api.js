import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // A URL do seu backend
});

// Interceptor para adicionar o token JWT no cabeçalho de cada requisição
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // --- LINHA DE DEPURAÇÃO ADICIONADA ---
  // Isso vai nos mostrar no console do navegador o que está sendo enviado.
  console.log('Enviando requisição com os seguintes cabeçalhos:', config.headers);
  // ------------------------------------

  return config;
});

export default api;