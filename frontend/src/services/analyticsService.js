// src/services/analyticsService.js
import api from './api';

export async function fetchPerformance(params) {
  const { data } = await api.get('/analytics/performance', { params });
  return data;
}
export async function fetchProjection(params) {
  const { data } = await api.get('/analytics/projection', { params });
  return data;
}
export async function fetchBarbers(params) {
  const { data } = await api.get('/analytics/barbers', { params });
  return data;
}
