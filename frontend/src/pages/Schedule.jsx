import React, { useState, useEffect, useCallback } from 'react';
import Calendar from '../components/schedule/Calendar';
import AppointmentModal from '../components/schedule/AppointmentModal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { parseISO } from 'date-fns';

const Schedule = () => {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    try {
      const response = await api.get('/appointments');
      const formattedEvents = response.data.map(apt => ({
        id: apt.id,
        title: `${apt.client.name} - ${apt.service.name}`,
        start: parseISO(apt.start),
        end: parseISO(apt.end),
        resource: apt,
      }));
      setEvents(formattedEvents);
    } catch (error) {
      toast.error("Não foi possível carregar os agendamentos.");
    }
  }, []);

  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchAppointments(),
          api.get('/clients/admin').then(res => setClients(res.data)), // ✅ Corrigido
          api.get('/services').then(res => setServices(res.data)),
          api.get('/staff').then(res => setStaff(res.data))
        ]);
      } catch (error) {
        toast.error("Não foi possível carregar os dados da página.");
      } finally {
        setLoading(false);
      }
    };
    loadPageData();
  }, [fetchAppointments]);

  const handleSelectSlot = useCallback((slotInfo) => {
    setSelectedEvent(null);
    setSelectedSlot(slotInfo);
    setIsModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setSelectedSlot(null);
    setSelectedEvent(event.resource);
    setIsModalOpen(true);
  }, []);

  const handleSave = async (formData) => {
    const isEditing = selectedEvent && selectedEvent.id;
    const savePromise = isEditing
      ? api.put(`/appointments/${selectedEvent.id}`, formData)
      : api.post('/appointments', formData);
    
    toast.promise(savePromise, {
      loading: 'A salvar agendamento...',
      success: () => {
        fetchAppointments();
        setIsModalOpen(false);
        return `Agendamento ${isEditing ? 'atualizado' : 'criado'} com sucesso!`;
      },
      error: "Não foi possível salvar o agendamento."
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este agendamento?")) {
      const deletePromise = api.delete(`/appointments/${id}`);
      toast.promise(deletePromise, {
        loading: 'A excluir...',
        success: () => {
          fetchAppointments();
          setIsModalOpen(false);
          return 'Agendamento excluído com sucesso!';
        },
        error: "Não foi possível excluir o agendamento."
      });
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Agenda</h1>
      {loading ? <p>A carregar dados da agenda...</p> : (
        <Calendar
          events={events}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
        />
      )}
      {isModalOpen && (
        <AppointmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
          event={selectedEvent}
          slot={selectedSlot}
          clients={clients}
          services={services}
          staff={staff}
        />
      )}
    </div>
  );
};

export default Schedule;
