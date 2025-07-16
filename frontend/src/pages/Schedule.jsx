import React, { useState, useEffect, useCallback } from 'react';
import Calendar from '../components/schedule/Calendar';
import AppointmentModal from '../components/schedule/AppointmentModal';
// import axios from 'axios';

const Schedule = () => {
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Mock de dados - Substituir com chamadas de API
  const [services, setServices] = useState([
      {id: 'service1', name: 'Corte de Cabelo'},
      {id: 'service2', name: 'Barba'}
  ]);
  const [staff, setStaff] = useState([
      {id: 'user1', name: 'João'},
      {id: 'user2', name: 'Maria'}
  ]);

  const fetchAppointments = useCallback(async () => {
    try {
      // Exemplo de chamada API - ajuste a URL e o token
      // const response = await axios.get('/api/appointments');
      // const formattedEvents = response.data.map(apt => ({
      //   ...apt,
      //   title: `${apt.clientName} - ${apt.service.name}`,
      //   start: new Date(apt.start),
      //   end: new Date(apt.end),
      // }));
      // setEvents(formattedEvents);
      console.log("Buscando agendamentos...");
    } catch (error) {
      console.error("Erro ao buscar agendamentos", error);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleSelectSlot = useCallback((slotInfo) => {
    setSelectedSlot(slotInfo);
    setSelectedEvent(null);
    setModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setSelectedSlot(null);
    setModalOpen(true);
  }, []);

  const handleSave = async (appointmentData) => {
    console.log("Salvando agendamento:", appointmentData);
    // Lógica para salvar (criar ou atualizar) via API
    // if(selectedEvent) { // Atualizar
    //   await axios.put(`/api/appointments/${selectedEvent.id}`, appointmentData);
    // } else { // Criar
    //   await axios.post('/api/appointments', appointmentData);
    // }
    fetchAppointments(); // Re-buscar eventos
    setModalOpen(false);
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Agenda</h1>
      <Calendar
        events={events}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
      />
      {modalOpen && (
        <AppointmentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
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
