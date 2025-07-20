import React, { useState, useEffect } from 'react';

const weekDays = [
    { key: 'sunday', label: 'Dom' },
    { key: 'monday', label: 'Seg' },
    { key: 'tuesday', label: 'Ter' },
    { key: 'wednesday', label: 'Qua' },
    { key: 'thursday', label: 'Qui' },
    { key: 'friday', label: 'Sex' },
    { key: 'saturday', label: 'Sáb' },
];

const StaffForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', role: 'STAFF', password: '', showInBooking: true,
  });
  const [workSchedule, setWorkSchedule] = useState(() => {
    const initialSchedule = {};
    weekDays.forEach(day => {
        initialSchedule[day.key] = { active: true, start: '09:00', end: '18:00' };
    });
    return initialSchedule;
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        role: initialData.role || 'STAFF',
        password: '',
        showInBooking: typeof initialData.showInBooking === 'boolean' ? initialData.showInBooking : true,
      });
      if (initialData.workSchedule && Object.keys(initialData.workSchedule).length > 0) {
        setWorkSchedule(initialData.workSchedule);
      }
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleScheduleChange = (dayKey, field, value) => {
    setWorkSchedule(prev => ({
        ...prev,
        [dayKey]: { ...prev[dayKey], [field]: value }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, workSchedule });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">{initialData ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
      
      {/* ... (campos existentes: Nome, Email, Função, Senha, Checkbox de Visibilidade) ... */}
      
      {/* --- NOVA SECÇÃO DE HORÁRIOS --- */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Trabalho</label>
        <div className="space-y-3">
            {weekDays.map(day => (
                <div key={day.key} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3 flex items-center">
                        <input
                            type="checkbox"
                            id={`active-${day.key}`}
                            checked={workSchedule[day.key]?.active || false}
                            onChange={(e) => handleScheduleChange(day.key, 'active', e.target.checked)}
                            className="h-4 w-4 rounded"
                        />
                        <label htmlFor={`active-${day.key}`} className="ml-2 text-sm">{day.label}</label>
                    </div>
                    {workSchedule[day.key]?.active ? (
                        <>
                            <div className="col-span-4">
                                <input type="time" value={workSchedule[day.key]?.start} onChange={(e) => handleScheduleChange(day.key, 'start', e.target.value)} className="w-full p-1 border rounded-md text-sm" />
                            </div>
                            <div className="col-span-1 text-center">-</div>
                            <div className="col-span-4">
                                <input type="time" value={workSchedule[day.key]?.end} onChange={(e) => handleScheduleChange(day.key, 'end', e.target.value)} className="w-full p-1 border rounded-md text-sm" />
                            </div>
                        </>
                    ) : (
                        <div className="col-span-9 text-sm text-gray-400">Fechado</div>
                    )}
                </div>
            ))}
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-purple-700 text-white rounded-md">Salvar</button>
      </div>
    </form>
  );
};

export default StaffForm;