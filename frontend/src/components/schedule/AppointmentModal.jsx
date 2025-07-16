import React, { useState, useEffect } from 'react';

const AppointmentModal = ({ isOpen, onClose, onSave, event, slot, services, staff }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: '',
    userId: '',
    notes: ''
  });

  useEffect(() => {
    if (event) {
      setFormData({
        clientName: event.clientName || '',
        clientPhone: event.clientPhone || '',
        serviceId: event.serviceId || '',
        userId: event.userId || '',
        notes: event.notes || ''
      });
    } else if (slot) {
      // Reset form for new appointment
      setFormData({ clientName: '', clientPhone: '', serviceId: '', userId: '', notes: '' });
    }
  }, [event, slot]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalData = { ...formData, start: slot?.start || event.start };
    onSave(finalData);
  };

  const title = event ? 'Editar Agendamento' : 'Novo Agendamento';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome do Cliente</label>
            <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} className="w-full p-2 border rounded" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone do Cliente</label>
            <input type="tel" name="clientPhone" value={formData.clientPhone} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Serviço</label>
            <select name="serviceId" value={formData.serviceId} onChange={handleChange} className="w-full p-2 border rounded" required>
              <option value="">Selecione um serviço</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Colaborador</label>
            <select name="userId" value={formData.userId} onChange={handleChange} className="w-full p-2 border rounded" required>
              <option value="">Selecione um colaborador</option>
              {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notas</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full p-2 border rounded" rows="2"></textarea>
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentModal;
