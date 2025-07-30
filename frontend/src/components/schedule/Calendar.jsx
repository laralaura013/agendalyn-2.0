import React from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'pt-BR': ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Cores fixas para até 10 colaboradores diferentes
const COLORS = [
  '#9333ea', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#6366f1', '#ec4899', '#14b8a6', '#8b5cf6', '#f43f5e'
];

const Calendar = ({ events, onSelectSlot, onSelectEvent }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg" style={{ height: '75vh' }}>
      <BigCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="pt-BR"
        selectable
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        messages={{
          next: "Próximo",
          previous: "Anterior",
          today: "Hoje",
          month: "Mês",
          week: "Semana",
          day: "Dia",
          agenda: "Agenda",
          date: "Data",
          time: "Hora",
          event: "Evento",
          noEventsInRange: "Não há eventos neste período.",
          showMore: total => `+ Ver mais (${total})`
        }}
        tooltipAccessor={(event) =>
          `${event.resource.client?.name ?? ''} - ${event.resource.service?.name ?? ''}`
        }
        eventPropGetter={(event) => {
          const staffId = event.resource?.user?.id || 0;
          const color = COLORS[staffId % COLORS.length];
          const style = {
            backgroundColor: color,
            borderRadius: '6px',
            opacity: 0.9,
            color: 'white',
            border: 0,
            fontWeight: '500',
          };
          return { style };
        }}
      />
    </div>
  );
};

export default Calendar;
