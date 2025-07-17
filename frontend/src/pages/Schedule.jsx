import React, { useState, useEffect, useCallback } from 'react';
import Calendar from '../components/schedule/Calendar';
import AppointmentModal from '../components/schedule/AppointmentModal';
import api from '../services/api';
import { parseISO } from 'date-fns';

const Schedule = () => {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    try {
      const response = await api.get('/appointments');
      const formattedEvents = response.data.map(apt => ({
        id: apt.id,
        title: `${apt.clientName} - ${apt.service.name}`,
        start: parseISO(apt.start),
        end: parseISO(apt.end),
        resource: apt, // Guarda o objeto original completo
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
    }
  }, []);

  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchAppointments(),
          api.get('/services').then(res => setServices(res.data)),
          api.get('/staff').then(res => setStaff(res.data))
        ]);
      } catch (error) {
        console.error("Erro ao carregar dados da página:", error);
        alert("Não foi possível carregar os dados necessários para a agenda.");
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

  // FUNÇÃO CORRIGIDA
  const handleSelectEvent = useCallback((event) => {
    // A propriedade com os dados originais se chama 'resource'
    const originalAppointment = event.resource;
    setSelectedSlot(null);
    setSelectedEvent(originalAppointment);
    setIsModalOpen(true);
  }, []);

  const handleSave = async (formData) => {
    try {
      const dataToSend = {
        ...formData,
        start: formData.start.toISOString(),
      };
      if (selectedEvent) {
        await api.put(`/appointments/${selectedEvent.id}`, dataToSend);
      } else {
        await api.post('/appointments', dataToSend);
      }
      setIsModalOpen(false);
      fetchAppointments();
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      alert("Não foi possível salvar o agendamento.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este agendamento?")) {
      try {
        await api.delete(`/appointments/${id}`);
        setIsModalOpen(false);
        fetchAppointments();
      } catch (error) {
        console.error("Erro ao deletar agendamento:", error);
        alert("Não foi possível excluir o agendamento.");
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Agenda</h1>
      {loading ? <p>Carregando dados da agenda...</p> : (
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
          services={services}
          staff={staff}
        />
      )}
    </div>
  );
};

export default Schedule;