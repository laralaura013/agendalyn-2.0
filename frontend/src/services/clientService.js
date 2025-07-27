import api from './api';

// Obter token do cliente logado
const getAuthHeader = () => {
  const token = localStorage.getItem('clientToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// Buscar agendamentos do cliente
export const getMyAppointments = async () => {
  const response = await api.get('/portal/my-appointments', getAuthHeader());
  return response.data;
};

// Buscar pacotes ativos do cliente
export const getMyPackages = async () => {
  const response = await api.get('/portal/my-packages', getAuthHeader());
  return response.data;
};

// Cancelar um agendamento do cliente
export const cancelAppointment = async (appointmentId) => {
  const response = await api.delete(`/client/appointments/${appointmentId}`, getAuthHeader());
  return response.data;
};

// Atualizar perfil do cliente
export const updateClientProfile = async (formData) => {
  const response = await api.put('/portal/me', formData, getAuthHeader());
  return response.data;
};
