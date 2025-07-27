import api from './api';

// Buscar agendamentos do cliente
export const getMyAppointments = async () => {
  const response = await api.get('/portal/my-appointments');
  return response.data;
};

// Buscar pacotes ativos do cliente
export const getMyPackages = async () => {
  const response = await api.get('/portal/my-packages');
  return response.data;
};

// Cancelar um agendamento do cliente
export const cancelAppointment = async (appointmentId) => {
  const response = await api.delete(`/portal/appointments/${appointmentId}`);
  return response.data;
};
