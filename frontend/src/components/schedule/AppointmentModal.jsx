import React, { useState, useEffect } from 'react';
import Modal from '../dashboard/Modal';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AppointmentModal = ({ isOpen, onClose, event, slot, clients, services, staff, fetchAppointments }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    professionalId: '',
    start: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000),
    notes: '',
    status: 'SCHEDULED',
  });

  useEffect(() => {
    if (event) {
      setFormData({
        clientId: event.clientId || '',
        serviceId: event.serviceId || '',
        professionalId: event.professionalId || '',
        start: new Date(event.start),
        end: new Date(event.end),
        notes: event.notes || '',
        status: event.status || 'SCHEDULED',
      });
    } else if (slot) {
      const start = new Date(slot.start);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h depois
      setFormData(prev => ({ ...prev, start, end }));
    }
  }, [event, slot]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    const time = formData.start.toTimeString().split(' ')[0];
    const newStart = new Date(`${date}T${time}`);
    const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
    setFormData(prev => ({ ...prev, start: newStart, end: newEnd }));
  };

  const handleTimeChange = (e) => {
    const time = e.target.value;
    const date = formData.start.toISOString().split('T')[0];
    const newStart = new Date(`${date}T${time}`);
    const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
    setFormData(prev => ({ ...prev, start: newStart, end: newEnd }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      clientId: formData.clientId,
      serviceId: formData.serviceId,
      professionalId: formData.professionalId || null,
      start: formData.start.toISOString(),
      end: formData.end.toISOString(),
      notes: formData.notes || '',
    };

    try {
      if (event) {
        await api.put(`/appointments/${event.id}`, payload);
        toast.success('Agendamento atualizado com sucesso!');
      } else {
        await api.post('/appointments', payload);
        toast.success('Agendamento criado com sucesso!');
      }
      fetchAppointments?.();
      onClose();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Erro ao salvar agendamento.';
      const missing = e?.response?.data?.missing;
      toast.error(missing ? `${msg}: ${missing.join(', ')}` : msg);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/appointments/${id}`);
      toast.success('Agendamento excluído com sucesso!');
      fetchAppointments?.();
      onClose();
    } catch (e) {
      toast.error('Erro ao excluir agendamento.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <h2 className="text-xl font-bold text-gray-800">
          {event ? 'Editar Agendamento' : 'Novo Agendamento'}
        </h2>

        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <select
            name="clientId"
            value={formData.clientId}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Selecione um cliente</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Data e Hora */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={formData.start.toISOString().split('T')[0]}
              onChange={handleDateChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
            <input
              type="time"
              value={formData.start.toTimeString().substring(0, 5)}
              onChange={handleTimeChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        </div>

        {/* Serviço */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
          <select
            name="serviceId"
            value={formData.serviceId}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Selecione um serviço</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Profissional */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
          <select
            name="professionalId"
            value={formData.professionalId}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Selecione um profissional</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Status (visível apenas ao editar) */}
        {event && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="SCHEDULED">Agendado</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="COMPLETED">Finalizado</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>
        )}

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows="2"
          />
        </div>

        {/* Ações */}
        <div className="flex justify-between items-center pt-4">
          {event && (
            <button
              type="button"
              onClick={() => handleDelete(event.id)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Excluir
            </button>
          )}
          <div className="flex-grow" />
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800"
            >
              Salvar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AppointmentModal;
