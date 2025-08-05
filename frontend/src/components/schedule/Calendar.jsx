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

// Paleta base para colorir por profissional
const COLORS = [
  '#9333ea', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#6366f1', '#ec4899', '#14b8a6', '#8b5cf6', '#f43f5e'
];

export default function Calendar({
  events = [],
  onSelectSlot,
  onSelectEvent,
  // novos props para sincronizar com Schedule.jsx
  view,          // 'day' | 'week' | 'month'
  date,          // Date
  onView,        // (v) => void
  onNavigate,    // (d) => void
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg" style={{ height: '75vh' }}>
      <BigCalendar
        localizer={localizer}
        culture="pt-BR"
        events={events}
        startAccessor="start"
        endAccessor="end"
        selectable
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        // sincronização com o contêiner (Schedule.jsx)
        view={view}
        date={date}
        onView={onView}
        onNavigate={onNavigate}
        // UX
        popup
        views={['day', 'week', 'month']}
        step={30}
        timeslots={2}
        min={new Date(1970, 0, 1, 7, 0)}
        max={new Date(1970, 0, 1, 21, 0)}
        longPressThreshold={250}
        // Texto em PT-BR
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
        // Tooltip: mostra cliente e serviço quando existir
        tooltipAccessor={(event) => {
          const r = event?.resource || {};
          if (r?.type === 'BLOCK') {
            return r.reason ? `Bloqueado - ${r.reason}` : 'Bloqueado';
          }
          const client = r?.client?.name ?? '';
          const service = r?.service?.name ?? '';
          return [client, service].filter(Boolean).join(' - ') || event?.title || '';
        }}
        // Estilização por evento
        eventPropGetter={(event) => {
          // bloqueios em azul
          if (event?.resource?.type === 'BLOCK') {
            return {
              style: {
                backgroundColor: '#60a5fa',
                borderColor: '#60a5fa',
                color: '#0b1324',
                borderRadius: '6px',
                opacity: 0.95,
                fontWeight: 600,
              },
            };
          }

          // demais eventos: cor por profissional
          const staffId =
            event?.resource?.user?.id ??
            event?.resource?.userId ??
            0;
          const idx = Math.abs(String(staffId).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length;
          const color = COLORS[idx];

          return {
            style: {
              backgroundColor: color,
              borderRadius: '6px',
              opacity: 0.95,
              color: 'white',
              border: 0,
              fontWeight: 500,
            },
          };
        }}
      />
    </div>
  );
}
