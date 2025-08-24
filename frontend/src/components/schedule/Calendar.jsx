// src/components/schedule/Calendar.jsx
import React, { useMemo } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import ptBR from "date-fns/locale/pt-BR";
import "react-big-calendar/lib/css/react-big-calendar.css";

/** Localização (pt-BR) */
const locales = { "pt-BR": ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (d) => startOfWeek(d, { locale: ptBR }),
  getDay,
  locales,
});

/** Paleta base para colorir por profissional */
const COLORS = [
  "#9333ea", // purple
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#6366f1", // indigo
  "#ec4899", // pink
  "#14b8a6", // teal
  "#8b5cf6", // violet
  "#f43f5e", // rose
];

/** Hash simples determinístico pra escolher a cor a partir do professionalId */
function colorFromStaffId(staffId) {
  if (!staffId) return COLORS[0];
  const key = String(staffId);
  const sum = [...key].reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLORS[sum % COLORS.length];
}

export default function Calendar({
  events = [],
  onSelectSlot,
  onSelectEvent,
  // controlado pelo container (Schedule.jsx)
  view,          // "day" | "week" | "month"
  date,          // Date
  onView,        // (v) => void
  onNavigate,    // (d) => void
}) {
  /** Mensagens em PT-BR */
  const messages = useMemo(
    () => ({
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
      showMore: (total) => `+ Ver mais (${total})`,
    }),
    []
  );

  /** Formatos 24h */
  const formats = useMemo(
    () => ({
      dayHeaderFormat: (d, culture, lz) => lz.format(d, "EEEE, dd 'de' MMMM", culture),
      dayRangeHeaderFormat: ({ start, end }, culture, lz) =>
        `${lz.format(start, "dd/MM", culture)} — ${lz.format(end, "dd/MM", culture)}`,
      agendaHeaderFormat: ({ start, end }, culture, lz) =>
        `${lz.format(start, "dd/MM", culture)} — ${lz.format(end, "dd/MM", culture)}`,
      timeGutterFormat: (d, culture, lz) => lz.format(d, "HH:mm", culture),
      eventTimeRangeFormat: ({ start, end }, culture, lz) =>
        `${lz.format(start, "HH:mm", culture)} — ${lz.format(end, "HH:mm", culture)}`,
      agendaTimeRangeFormat: ({ start, end }, culture, lz) =>
        `${lz.format(start, "HH:mm", culture)} — ${lz.format(end, "HH:mm", culture)}`,
      agendaTimeFormat: (d, culture, lz) => lz.format(d, "HH:mm", culture),
    }),
    []
  );

  /** Estilo dos eventos (bloqueio x agendamento por profissional) */
  const eventPropGetter = (event) => {
    if (event?.resource?.type === "BLOCK") {
      return {
        style: {
          backgroundColor: "#60a5fa", // sky-400
          borderColor: "#60a5fa",
          color: "#0b1324",
          borderRadius: "10px",
          border: 0,
          padding: "2px 6px",
          fontWeight: 600,
          boxShadow:
            "inset 6px 6px 12px var(--dark-shadow), inset -6px -6px 12px var(--light-shadow)",
        },
      };
    }
    const staffId = event?.resource?.user?.id ?? event?.resource?.userId ?? null;
    const color = colorFromStaffId(staffId);
    return {
      style: {
        backgroundColor: color,
        color: "#fff",
        borderRadius: "10px",
        border: 0,
        padding: "2px 6px",
        fontWeight: 500,
        boxShadow: "4px 4px 10px rgba(0,0,0,0.08)",
      },
    };
  };

  /** Leve feedback sobre slots/células */
  const slotPropGetter = () => ({
    className: "rbc-slot-neu",
    style: { transition: "background 0.12s ease" },
  });

  return (
    <div className="rbc-neu-wrapper" style={{ minHeight: 520 }}>
      <BigCalendar
        localizer={localizer}
        culture="pt-BR"
        events={events}
        startAccessor="start"
        endAccessor="end"
        selectable
        popup
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        // controlado pelo contêiner
        view={view}
        date={date}
        onView={onView}
        onNavigate={onNavigate}
        // UX
        views={["day", "week", "month"]}
        step={30}
        timeslots={2}
        min={new Date(1970, 0, 1, 7, 0)}
        max={new Date(1970, 0, 1, 21, 0)}
        longPressThreshold={250}
        messages={messages}
        formats={formats}
        dayLayoutAlgorithm="no-overlap"
        tooltipAccessor={(event) => {
          const r = event?.resource || {};
          if (r?.type === "BLOCK") {
            return r.reason ? `Bloqueado - ${r.reason}` : "Bloqueado";
          }
          const client = r?.client?.name ?? "";
          const service = r?.service?.name ?? "";
          return [client, service].filter(Boolean).join(" - ") || event?.title || "";
        }}
        eventPropGetter={eventPropGetter}
        slotPropGetter={slotPropGetter}
      />

      {/* Ajustes visuais p/ tema neumórfico + dark (usa variáveis do seu neumorphism.css) */}
      <style>{`
        .rbc-neu-wrapper .rbc-calendar {
          background: transparent;
          color: var(--text-color);
        }
        /* toolbar do react-big-calendar não é usada (você tem toolbar própria) */
        .rbc-neu-wrapper .rbc-toolbar { display: none; }

        /* Cabeçalhos, grades e bordas suaves */
        .rbc-neu-wrapper .rbc-time-view,
        .rbc-neu-wrapper .rbc-month-view,
        .rbc-neu-wrapper .rbc-agenda-view {
          background: var(--bg-color);
          border-radius: 16px;
        }
        .rbc-neu-wrapper .rbc-header {
          color: var(--text-color);
          background: transparent;
          border-bottom: none;
          font-weight: 600;
        }
        .rbc-neu-wrapper .rbc-time-header,
        .rbc-neu-wrapper .rbc-time-content,
        .rbc-neu-wrapper .rbc-month-row,
        .rbc-neu-wrapper .rbc-agenda-table {
          background: var(--bg-color);
        }
        .rbc-neu-wrapper .rbc-time-content > * + *,
        .rbc-neu-wrapper .rbc-day-slot .rbc-time-slot,
        .rbc-neu-wrapper .rbc-month-row + .rbc-month-row,
        .rbc-neu-wrapper .rbc-day-bg + .rbc-day-bg,
        .rbc-neu-wrapper .rbc-agenda-table tr + tr {
          border-color: rgba(163, 177, 198, 0.35); /* var(--dark-shadow) translúcida */
        }

        /* Gutter (coluna de horas) */
        .rbc-neu-wrapper .rbc-time-gutter .rbc-timeslot-group {
          color: var(--text-color);
        }

        /* Hoje destacado sutilmente */
        .rbc-neu-wrapper .rbc-today {
          background: radial-gradient(120% 120% at 10% 10%, rgba(255,255,255,0.7), transparent 70%);
        }

        /* Hover nas células (efeito 'levemente pressionado') */
        .rbc-neu-wrapper .rbc-day-slot .rbc-time-slot:hover,
        .rbc-neu-wrapper .rbc-month-row .rbc-date-cell:hover {
          background: linear-gradient(145deg, var(--light-shadow), var(--bg-color));
          opacity: .85;
        }

        /* Seleção */
        .rbc-neu-wrapper .rbc-slot-selection {
          background-color: rgba(124, 58, 237, 0.15);
          border: 1px dashed rgba(124,58,237,.6);
        }

        /* Agenda view */
        .rbc-neu-wrapper .rbc-agenda-view table.rbc-agenda-table {
          box-shadow:
            inset 8px 8px 16px var(--dark-shadow),
            inset -8px -8px 16px var(--light-shadow);
          border-radius: 16px;
        }
      `}</style>
    </div>
  );
}
