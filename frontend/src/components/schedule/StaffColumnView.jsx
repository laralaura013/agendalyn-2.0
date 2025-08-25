// src/components/schedule/StaffColumnView.jsx
import React, { useMemo, useRef, useEffect } from "react";
import { format, setHours, setMinutes, startOfDay, differenceInMinutes, isSameDay, parseISO } from "date-fns";

/**
 * StaffColumnView
 * - Mostra uma grade do DIA dividida em colunas por profissional.
 * - Topo com avatar + nome (sticky).
 * - Blocos de agendamento posicionados por horário.
 *
 * Props:
 *  - date: Date do dia atual
 *  - staff: [{ id, name, avatarUrl }]
 *  - appointments: [{ id, clientName, serviceName, startsAt, endsAt, staffId, color? }]
 *  - slotMinutes: número de minutos por linha (ex: 30)
 *  - workStartHour: hora de início (ex: 7)
 *  - workEndHour: hora de término (ex: 20)
 *  - onEmptySlotClick?: (staff, dateStart, dateEnd) => void
 *  - onAppointmentClick?: (appointment) => void
 */

const toDateSafe = (value) => (value instanceof Date ? value : parseISO(String(value)));

const hoursRange = (startHour, endHour) => {
  const list = [];
  for (let h = startHour; h <= endHour; h++) list.push(h);
  return list;
};

export default function StaffColumnView({
  date,
  staff,
  appointments,
  slotMinutes = 30,
  workStartHour = 7,
  workEndHour = 20,
  onEmptySlotClick,
  onAppointmentClick,
}) {
  const containerRef = useRef(null);

  const dayStart = useMemo(() => setMinutes(setHours(startOfDay(date), workStartHour), 0), [date, workStartHour]);
  const dayEnd = useMemo(() => setMinutes(setHours(startOfDay(date), workEndHour), 0), [date, workEndHour]);

  const totalMinutes = useMemo(() => differenceInMinutes(dayEnd, dayStart), [dayStart, dayEnd]);
  const totalRows = useMemo(() => Math.ceil(totalMinutes / slotMinutes), [totalMinutes, slotMinutes]);

  const timeLabels = useMemo(() => {
    const out = [];
    for (let i = 0; i <= totalRows; i++) {
      const mins = i * slotMinutes;
      const d = new Date(dayStart.getTime() + mins * 60000);
      out.push(format(d, "HH:mm"));
    }
    return out;
  }, [dayStart, totalRows, slotMinutes]);

  const apptsByStaff = useMemo(() => {
    const map = {};
    for (const s of staff) map[s.id] = [];
    for (const a of appointments || []) {
      if (!a.staffId || !map.hasOwnProperty(a.staffId)) continue;
      const sAt = toDateSafe(a.startsAt);
      if (!isSameDay(sAt, date)) continue;
      map[a.staffId].push(a);
    }
    return map;
  }, [appointments, staff, date]);

  // rolagem inicial para por volta de 09:00
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const nine = setHours(startOfDay(date), 9);
    const y = (differenceInMinutes(nine, dayStart) / totalMinutes) * el.scrollHeight;
    el.scrollTop = Math.max(0, y - 60);
  }, [containerRef, date, dayStart, totalMinutes]);

  const getTopFromDate = (d) => {
    const mins = differenceInMinutes(toDateSafe(d), dayStart);
    return Math.max(0, (mins / totalMinutes) * 100);
  };

  const getHeightFromRange = (start, end) => {
    const mins = Math.max(5, differenceInMinutes(toDateSafe(end), toDateSafe(start)));
    return Math.max(2.5, (mins / totalMinutes) * 100);
  };

  const handleColumnClick = (e, s) => {
    // calcula horário a partir da posição do clique
    const colEl = e.currentTarget;
    const rect = colEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = y / rect.height;
    const minsFromStart = Math.round((pct * totalMinutes) / slotMinutes) * slotMinutes;
    const start = new Date(dayStart.getTime() + minsFromStart * 60000);
    const end = new Date(start.getTime() + slotMinutes * 60000);
    onEmptySlotClick?.(s, start, end);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Cabeçalho com avatares/nome */}
      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${staff.length}, minmax(220px, 1fr))` }}>
        {/* coluna vazia para labels de hora */}
        <div />
        {staff.map((s) => (
          <div key={s.id} className="sticky top-0 z-20 bg-white/80 backdrop-blur rounded-xl px-3 py-3 flex items-center gap-3 border shadow-sm">
            <img
              src={s.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=9333ea&color=fff`}
              alt={s.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-violet-300"
            />
            <div className="leading-tight">
              <div className="font-medium text-gray-800">{s.name}</div>
              <div className="text-xs text-gray-500">Próx. livre automático</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grade principal */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto rounded-2xl border bg-white shadow-inner"
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: `120px repeat(${staff.length}, minmax(220px, 1fr))`, height: "1800px" }}
        >
          {/* Coluna de horas (fixa) */}
          <div className="relative border-r">
            {timeLabels.map((t, idx) => (
              <div
                key={idx}
                className="absolute left-0 w-full pr-2 text-right text-xs text-gray-400"
                style={{ top: `${(idx / timeLabels.length) * 100}%` }}
              >
                {t}
                <div className="h-px bg-gray-100 mt-2" />
              </div>
            ))}
          </div>

          {/* Colunas por staff */}
          {staff.map((s) => (
            <div
              key={s.id}
              className="relative border-r cursor-crosshair"
              onClick={(e) => handleColumnClick(e, s)}
            >
              {/* linhas de fundo */}
              {timeLabels.map((_, idx) => (
                <div
                  key={idx}
                  className="absolute left-0 w-full h-px bg-gray-100"
                  style={{ top: `${(idx / timeLabels.length) * 100}%` }}
                />
              ))}

              {/* agendamentos */}
              {(apptsByStaff[s.id] || []).map((a) => {
                const top = getTopFromDate(a.startsAt);
                const height = getHeightFromRange(a.startsAt, a.endsAt);
                const color = a.color || "#9333ea22";
                return (
                  <div
                    key={a.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick?.(a);
                    }}
                    className="absolute left-2 right-2 rounded-xl shadow-sm border hover:shadow-md transition"
                    style={{ top: `${top}%`, height: `${height}%`, background: color }}
                  >
                    <div className="text-[11px] font-medium px-2 pt-1 text-gray-800 truncate">
                      {a.clientName || "Cliente"}
                    </div>
                    <div className="text-[10px] px-2 text-gray-600 truncate">
                      {a.serviceName || "Serviço"}
                    </div>
                    <div className="text-[10px] px-2 pb-1 text-gray-500">
                      {format(toDateSafe(a.startsAt), "HH:mm")}–{format(toDateSafe(a.endsAt), "HH:mm")}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
