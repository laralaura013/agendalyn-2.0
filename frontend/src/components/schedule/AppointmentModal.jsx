import React, { useState, useEffect } from 'react';
import Modal from '../dashboard/Modal';

const AppointmentModal = ({ isOpen, onClose, onSave, onDelete, event, slot, clients, services, staff }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    userId: '',
    start: new Date(),
    notes: '',
    status: 'SCHEDULED',
  });

  useEffect(() => {
    if (event) {
      setFormData({
        clientId: event.clientId || '',
        serviceId: event.serviceId || '',
        userId: event.userId || '',
        start: new Date(event.start),
        notes: event.notes || '',
        status: event.status || 'SCHEDULED',
      });
    } else if (slot) {
      setFormData(prev => ({ ...prev, start: new Date(slot.start) }));
    }
  }, [event, slot]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    const time = formData.start.toTimeString().split(' ')[0];
    setFormData(prev => ({ ...prev, start: new Date(`${date}T${time}`) }));
  };
  
  const handleTimeChange = (e) => {
    const time = e.target.value;
    const date = formData.start.toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, start: new Date(`${date}T${time}`) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, start: formData.start.toISOString() });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-2xl font-bold">{event ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
        
        <div>
          <label className="block text-sm">Cliente</label>
          <select name="clientId" value={formData.clientId} onChange={handleChange} className="w-full p-2 border rounded" required>
            <option value="">Selecione um cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Data</label>
            <input type="date" value={formData.start.toISOString().split('T')[0]} onChange={handleDateChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm">Hora</label>
            <input type="time" value={formData.start.toTimeString().split(' ')[0].substring(0,5)} onChange={handleTimeChange} className="w-full p-2 border rounded" />
          </div>
        </div>

        <div>
          <label className="block text-sm">Serviço</label>
          <select name="serviceId" value={formData.serviceId} onChange={handleChange} className="w-full p-2 border rounded" required>
            <option value="">Selecione um serviço</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm">Colaborador</label>
          <select name="userId" value={formData.userId} onChange={handleChange} className="w-full p-2 border rounded" required>
            <option value="">Selecione um colaborador</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm">Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded">
            <option value="SCHEDULED">Agendado</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="COMPLETED">Finalizado</option>
            <option value="CANCELED">Cancelado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm">Observações</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full p-2 border rounded" rows="2"></textarea>
        </div>

        <div className="flex justify-between items-center pt-4">
            {event && (
                <button type="button" onClick={() => onDelete(event.id)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    Excluir
                </button>
            )}
            <div className="flex-grow"></div>
            <div className="flex justify-end gap-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-purple-700 text-white rounded-md">Salvar</button>
            </div>
        </div>
      </form>
    </Modal>
  );
};

export default AppointmentModal;