// ✅ ARQUIVO: src/pages/Schedule.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Calendar from "../components/schedule/Calendar";
import AppointmentModal from "../components/schedule/AppointmentModal";
import api from "../services/api";
import toast from "react-hot-toast";
import { parseISO } from "date-fns";
import {
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Calendar as CalendarIcon,
  List,
  ClipboardList,
  Filter,
  X,
  CheckCircle2,
} from "lucide-react";

/**
 * Rotas usadas:
 * - GET  /appointments?professionalId&date | date_from&date_to
 * - POST /appointments
 * - PUT  /appointments/:id
 * - DELETE /appointments/:id
 *
 * - GET  /agenda/blocks?professionalId&date | date_from&date_to
 * - POST /agenda/blocks  { professionalId, date:'YYYY-MM-DD', startTime:'HH:mm', endTime:'HH:mm', reason }
 * - DELETE /agenda/blocks/:id
 *
 * - GET  /public/available-slots?professionalId&date&duration=30  (retorna ["HH:mm"] ou [{formatted:"HH:mm"}] ou {time:"HH:mm"})
 * - GET  /waitlist
 */

const DEFAULT_SLOT_MINUTES = 30;

const Schedule = () => {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [blocks, setBlocks] = useState([]);
  const [view, setView] = useState("day");
  const [date, setDate] = useState(() => new Date());
  const [selectedPro, setSelectedPro] = useState(null);
  const [blockEnabled, setBlockEnabled] = useState(false);

  const [openSlots, setOpenSlots] = useState(false);
  const [openApptList, setOpenApptList] = useState(false);
  const [openWaitlist, setOpenWaitlist] = useState(false);
  const [openBlockTime, setOpenBlockTime] = useState(false);
  const [openProducts, setOpenProducts] = useState(true);
  const [openLegend, setOpenLegend] = useState(true);

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]); // ["07:00",...]
  const [waitlist, setWaitlist] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // ====== APIs ======

  const fetchAppointments = useCallback(async () => {
    try {
      const params = {};
      if (selectedPro) params.professionalId = selectedPro;

      if (view === "day") {
        params.date = toYMD(date);
      } else if (view === "week") {
        params.date_from = toYMD(startOfWeek(date));
        params.date_to = toYMD(endOfWeek(date));
      } else {
        params.date_from = toYMD(startOfMonth(date));
        params.date_to = toYMD(endOfMonth(date));
      }

      const response = await api.get("/appointments", { params: { ...params, _: Date.now() } });

      const rows = (response.data || []).filter((apt) => {
        const st = String(apt.status || "").toUpperCase();
        return !["CANCELED", "DELETED", "REMOVED"].includes(st);
      });

      const formatted = rows.map((apt) => ({
        id: apt.id,
        title: `${apt.client?.name ?? "Cliente"} - ${apt.service?.name ?? "Serviço"}`,
        start: typeof apt.start === "string" ? parseISO(apt.start) : new Date(apt.start),
        end: typeof apt.end === "string" ? parseISO(apt.end) : new Date(apt.end),
        resource: apt,
      }));
      setEvents(formatted);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      toast.error("Erro ao carregar os agendamentos.");
    }
  }, [date, view, selectedPro]);

  const fetchBlocks = useCallback(async () => {
    try {
      const params = {};
      if (selectedPro) params.professionalId = selectedPro;

      if (view === "day") {
        params.date = toYMD(date);
      } else if (view === "week") {
        params.date_from = toYMD(startOfWeek(date));
        params.date_to = toYMD(endOfWeek(date));
      } else {
        params.date_from = toYMD(startOfMonth(date));
        params.date_to = toYMD(endOfMonth(date));
      }

      const res = await api.get("/agenda/blocks", { params: { ...params, _: Date.now() } });
      setBlocks(res.data || []);
    } catch (e) {
      console.error("Erro ao carregar bloqueios:", e);
      toast.error("Erro ao carregar bloqueios.");
    }
  }, [date, view, selectedPro]);

  // >>> HORÁRIOS DISPONÍVEIS (robusto p/ formatted|time e com fallback serviceId)
  const fetchAvailableSlots = useCallback(
    async (targetDate = date, proId = selectedPro, minutes = DEFAULT_SLOT_MINUTES) => {
      try {
        setSlotsLoading(true);

        const baseParams = { date: toYMD(targetDate), _: Date.now() };
        if (proId) baseParams.professionalId = proId;

        // 1ª tentativa: usando duration
        let res = await api.get("/public/available-slots", {
          params: { ...baseParams, duration: minutes },
          headers: { "X-Public": "1" },
        });

        const items = (res.data || [])
          .map((s) => (typeof s === "string" ? s : s?.formatted || s?.time))
          .filter(Boolean);

        // 2ª tentativa: usar serviceId caso tenha vindo vazio
        if ((!items || items.length === 0) && services?.[0]?.id) {
          res = await api.get("/public/available-slots", {
            params: { ...baseParams, serviceId: services[0].id },
            headers: { "X-Public": "1" },
          });
          const items2 = (res.data || [])
            .map((s) => (typeof s === "string" ? s : s?.formatted || s?.time))
            .filter(Boolean);
          setAvailableSlots(items2);
        } else {
          setAvailableSlots(items);
        }
      } catch (e) {
        console.error("Erro ao carregar horários disponíveis:", e);
        toast.error("Erro ao carregar horários disponíveis.");
      } finally {
        setSlotsLoading(false);
      }
    },
    [date, selectedPro, services]
  );

  const fetchWaitlist = useCallback(async () => {
    try {
      setWaitlistLoading(true);
      const res = await api.get("/waitlist", { params: { _: Date.now() } });
      setWaitlist(res.data || []);
    } catch (e) {
      console.error("Erro ao carregar lista de espera:", e);
      toast.error("Erro ao carregar a lista de espera.");
    } finally {
      setWaitlistLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchAppointments(),
          fetchBlocks(),
          api.get("/clients", { params: { _: Date.now() } }).then((r) => setClients(r.data || [])),
          api.get("/services", { params: { _: Date.now() } }).then((r) => setServices(r.data || [])),
          api.get("/staff", { params: { _: Date.now() } }).then((r) => setStaff(r.data || [])),
        ]);
      } catch {
        toast.error("Erro ao carregar dados da agenda.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchAppointments, fetchBlocks]);

  useEffect(() => {
    if (!selectedPro && staff?.length) setSelectedPro(staff[0]?.id);
  }, [staff, selectedPro]);

  useEffect(() => {
    fetchBlocks();
    fetchAppointments();
  }, [fetchBlocks, fetchAppointments]);

  const handleSelectSlot = useCallback(
    (slotInfo) => {
      const { start, end } = slotInfo;

      const conflito = (blocks || []).some((b) => {
        const base = new Date(b.date);
        const [sh, sm] = (b.startTime || "00:00").split(":").map(Number);
        const [eh, em] = (b.endTime || "00:00").split(":").map(Number);
        const bStart = new Date(base);
        bStart.setHours(sh, sm, 0, 0);
        const bEnd = new Date(base);
        bEnd.setHours(eh, em, 0, 0);
        return start < bEnd && end > bStart;
      });
      if (conflito) {
        toast.error("Horário bloqueado. Escolha outro horário.");
        return;
      }

      setSelectedEvent(null);
      setSelectedSlot(slotInfo);
      setIsModalOpen(true);
    },
    [blocks]
  );

  const handleSelectEvent = useCallback(
    (event) => {
      const data = event.resource;

      if (data?.type === "BLOCK") {
        if (window.confirm("Deseja remover este bloqueio?")) {
          api
            .delete(`/agenda/blocks/${data.id}`)
            .then(() => {
              toast.success("Bloqueio removido.");
              fetchBlocks();
            })
            .catch(() => toast.error("Erro ao remover bloqueio."));
        }
        return;
      }

      setSelectedSlot(null);
      setSelectedEvent(data);
      setIsModalOpen(true);
    },
    [fetchBlocks]
  );

  const handleSave = async (payload) => {
    const isEditing = !!(selectedEvent && selectedEvent.id);

    const p = isEditing
      ? api.put(`/appointments/${selectedEvent.id}`, payload)
      : api.post("/appointments", payload);

    toast.promise(p, {
      loading: "Salvando agendamento...",
      success: () => {
        fetchAppointments();
        setIsModalOpen(false);
        return `Agendamento ${isEditing ? "atualizado" : "criado"} com sucesso!`;
      },
      error: (e) => e?.response?.data?.message || "Erro ao salvar o agendamento.",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este agendamento?")) return;

    // Remoção otimista
    setEvents((prev) => prev.filter((ev) => ev.id !== id));

    toast.promise(api.delete(`/appointments/${id}`), {
      loading: "Excluindo agendamento...",
      success: () => {
        fetchAppointments();
        setIsModalOpen(false);
        return "Agendamento excluído com sucesso!";
      },
      error: (e) => {
        fetchAppointments();
        return e?.response?.data?.message || "Erro ao excluir agendamento.";
      },
    });
  };

  const openEmptyModal = () => {
    setSelectedEvent(null);
    setSelectedSlot(null);
    setIsModalOpen(true);
  };

  const goToday = () => setDate(new Date());
  const goPrev = () => {
    const d = new Date(date);
    if (view === "day") d.setDate(d.getDate() - 1);
    if (view === "week") d.setDate(d.getDate() - 7);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    setDate(d);
  };
  const goNext = () => {
    const d = new Date(date);
    if (view === "day") d.setDate(d.getDate() + 1);
    if (view === "week") d.setDate(d.getDate() + 7);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    setDate(d);
  };

  const pageTitle = useMemo(() => {
    const formatter =
      view === "month"
        ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
        : new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
    return formatter.format(date);
  }, [date, view]);

  const blockEvents = useMemo(() => {
    return (blocks || []).map((b) => {
      const base = new Date(b.date);
      const [sh, sm] = (b.startTime || "00:00").split(":").map(Number);
      const [eh, em] = (b.endTime || "00:00").split(":").map(Number);

      const start = new Date(base);
      start.setHours(sh, sm, 0, 0);

      const end = new Date(base);
      end.setHours(eh, em, 0, 0);

      return {
        id: `block_${b.id}`,
        title: b.reason ? `Bloqueado - ${b.reason}` : "Bloqueado",
        start,
        end,
        resource: { ...b, type: "BLOCK" },
        backgroundColor: "#60a5fa",
        borderColor: "#60a5fa",
        textColor: "#0b1324",
      };
    });
  }, [blocks]);

  const combinedEvents = useMemo(() => [...events, ...blockEvents], [events, blockEvents]);

  const handlePickAvailableSlot = useCallback(
    (hhmm) => {
      const [h, m] = String(hhmm).split(":").map(Number);
      const s = new Date(date);
      s.setHours(h, m, 0, 0);
      const e = new Date(s);
      e.setMinutes(e.getMinutes() + DEFAULT_SLOT_MINUTES);
      setSelectedEvent(null);
      setSelectedSlot({ start: s, end: e });
      setIsModalOpen(true);
    },
    [date]
  );

  const handleOpenEventFromList = useCallback(
    (id) => {
      const ev = events.find((x) => x.id === id);
      if (!ev) return;
      setSelectedEvent(ev.resource);
      setSelectedSlot(null);
      setIsModalOpen(true);
    },
    [events]
  );

  const handleWaitlistAgendar = useCallback(() => {
    setOpenSlots(true);
    fetchAvailableSlots(date, selectedPro);
  }, [date, selectedPro, fetchAvailableSlots]);

  return (
    <div className="relative animate-fade-in-up p-4 max-w-7xl mx-auto">
      {/* toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex items-center gap-2">
          <ProfessionalsSelect
            value={selectedPro || ""}
            onChange={setSelectedPro}
            options={staff?.map((s) => ({ id: s.id, name: s.name })) || []}
          />
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="px-2 py-1.5 border rounded hover:bg-gray-50" title="Anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToday} className="px-3 py-1.5 border rounded hover:bg-gray-50">
              Hoje
            </button>
            <button onClick={goNext} className="px-2 py-1.5 border rounded hover:bg-gray-50" title="Próximo">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <button
            onClick={() => {
              setOpenSlots(true);
              fetchAvailableSlots(date, selectedPro);
            }}
            className="px-3 py-2 rounded bg-white border hover:bg-gray-50 flex items-center gap-2"
            title="Horários disponíveis"
          >
            <CalendarIcon className="w-4 h-4" />
            Horários
          </button>
          <button
            onClick={openEmptyModal}
            className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Encaixe
          </button>
        </div>
      </div>

      {/* header data */}
      <div className="w-full bg-white border rounded px-4 py-2 text-sm md:text-base flex items-center justify-between mb-4">
        <span className="font-medium capitalize">{pageTitle}</span>
        <span className="text-gray-500">{staff?.find((p) => p.id === selectedPro)?.name ?? ""}</span>
      </div>

      {/* grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[70vh]">
        <div className="lg:col-span-8 xl:col-span-9 bg-white border rounded overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-500 p-4">Carregando dados da agenda...</p>
          ) : (
            <Calendar
              events={combinedEvents}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              view={view}
              date={date}
              onView={(v) => setView(v)}
              onNavigate={(d) => setDate(d)}
            />
          )}
        </div>

        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="bg-white border rounded p-3 md:p-4 space-y-4">
            <div className="flex items-start justify-between">
              <label className="flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={blockEnabled}
                  onChange={(e) => setBlockEnabled(e.target.checked)}
                />
                <span className="text-sm font-medium">Bloquear horário</span>
              </label>
              <button
                onClick={() => setOpenBlockTime(true)}
                disabled={!blockEnabled}
                className="px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-40 flex items-center gap-2"
                title="Bloquear intervalo"
              >
                <Lock className="w-4 h-4" /> Bloquear
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="border rounded px-2 py-1.5 text-sm w-full"
                  value={formatDateInput(date)}
                  onChange={(e) => {
                    const d = e.target.value ? new Date(e.target.value) : new Date();
                    setDate(d);
                  }}
                />
                <button className="px-3 py-1.5 border rounded hover:bg-gray-50" onClick={goToday} title="Ir para hoje">
                  Hoje
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    setOpenSlots(true);
                    fetchAvailableSlots(date, selectedPro);
                  }}
                  className="px-3 py-2 rounded bg-white border hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Horários disponíveis
                </button>

                <button
                  onClick={() => setOpenApptList(true)}
                  className="px-3 py-2 rounded bg-white border hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  Lista de Agendamentos
                </button>

                <button
                  onClick={() => {
                    setOpenWaitlist(true);
                    fetchWaitlist();
                  }}
                  className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
                >
                  <List className="w-4 h-4" />
                  Lista de Espera
                </button>
              </div>
            </div>

            <Accordion title="Produtos / Serviços" open={openProducts} onToggle={() => setOpenProducts((v) => !v)}>
              <div className="space-y-2">
                <input type="text" placeholder="Buscar produto/serviço" className="border rounded px-2 py-1.5 text-sm w-full" />
                <div className="max-h-40 overflow-auto border rounded divide-y text-sm">
                  {["Corte Masculino", "Barba", "Sobrancelha", "Hidratação"].map((item) => (
                    <div key={item} className="px-3 py-2 flex items-center justify-between hover:bg-gray-50">
                      <span>{item}</span>
                      <button className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50">Adicionar</button>
                    </div>
                  ))}
                </div>
              </div>
            </Accordion>

            <Accordion title="Legenda" open={openLegend} onToggle={() => setOpenLegend((v) => !v)}>
              <Legend />
            </Accordion>
          </div>
        </aside>
      </div>

      <button
        onClick={openEmptyModal}
        className="fixed bottom-6 right-6 bg-purple-700 text-white rounded-full p-3 shadow-lg hover:bg-purple-800 transition btn-animated"
        title="Novo agendamento"
      >
        <PlusCircle size={28} />
      </button>

      {isModalOpen && (
        <AppointmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          event={selectedEvent}
          slot={selectedSlot}
          clients={clients}
          services={services}
          staff={staff}
          onSave={handleSave}
          onDelete={handleDelete}
          fetchAppointments={fetchAppointments}
        />
      )}

      {openSlots && (
        <BaseModal onClose={() => setOpenSlots(false)} title="Horários disponíveis">
          <SlotsModalContent
            date={date}
            proId={selectedPro}
            loading={slotsLoading}
            slots={availableSlots}
            onReload={() => fetchAvailableSlots(date, selectedPro)}
            onPick={handlePickAvailableSlot}
          />
        </BaseModal>
      )}

      {openApptList && (
        <SideDrawer title="Lista de Agendamentos" onClose={() => setOpenApptList(false)}>
          <AppointmentsListContent events={events} onOpen={handleOpenEventFromList} onRefresh={fetchAppointments} />
        </SideDrawer>
      )}

      {openWaitlist && (
        <SideDrawer title="Lista de Espera" onClose={() => setOpenWaitlist(false)}>
          <WaitlistContent items={waitlist} loading={waitlistLoading} onRefresh={fetchWaitlist} onAgendar={handleWaitlistAgendar} />
        </SideDrawer>
      )}

      {openBlockTime && (
        <BaseModal onClose={() => setOpenBlockTime(false)} title="Bloquear Horário">
          <BlockTimeForm
            date={date}
            proId={selectedPro}
            onCancel={() => setOpenBlockTime(false)}
            onSubmit={async (payload) => {
              try {
                await api.post("/agenda/blocks", {
                  professionalId: payload.professionalId || null,
                  date: payload.date,
                  startTime: payload.start,
                  endTime: payload.end,
                  reason: payload.reason || "",
                });
                toast.success("Bloqueio criado com sucesso!");
                setOpenBlockTime(false);
                fetchBlocks();
              } catch (err) {
                console.error(err);
                toast.error("Erro ao criar bloqueio.");
              }
            }}
          />
        </BaseModal>
      )}
    </div>
  );
};

export default Schedule;

/* ===== Auxiliares ===== */
function formatDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfWeek(d) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function toYMD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ====== UI auxiliares (Accordion, etc.) ===== */
function ProfessionalsSelect({ value, onChange, options }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden md:block text-sm text-gray-600">Profissionais:</span>
      <select className="border rounded px-2 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {(options || []).map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
function ViewToggle({ value, onChange }) {
  const opts = [
    { id: "day", label: "Dia" },
    { id: "week", label: "Semana" },
    { id: "month", label: "Mês" },
  ];
  return (
    <div className="flex items-center rounded overflow-hidden border bg-white">
      {opts.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1.5 text-sm ${value === opt.id ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
function Accordion({ title, open, onToggle, children }) {
  return (
    <div className="border rounded">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2">
        <span className="text-sm font-medium">{title}</span>
        <ChevronRightIcon open={open} />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
function ChevronRightIcon({ open }) {
  return (
    <svg className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function Legend() {
  const items = [
    { color: "bg-emerald-500", label: "Confirmado" },
    { color: "bg-amber-500", label: "Aguardando" },
    { color: "bg-rose-500", label: "Cancelado" },
    { color: "bg-sky-500", label: "Bloqueado" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-sm ${it.color}`} />
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  );
}
function BaseModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[560px]">
        <div className="bg-white rounded-t-2xl md:rounded-xl shadow-lg border p-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <h3 className="font-semibold">{title}</h3>
            <button className="p-1 rounded hover:bg-gray-100" onClick={onClose} aria-label="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
function SideDrawer({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-xl border-l flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button className="p-1 rounded hover:bg-gray-100" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
function SlotsModalContent({ date, proId, loading, slots = [], onReload, onPick }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(date)}
        </div>
        <button onClick={onReload} className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50" title="Recarregar">
          Recarregar
        </button>
      </div>
      {loading ? (
        <div className="text-sm text-gray-500">Carregando horários...</div>
      ) : slots.length === 0 ? (
        <div className="text-sm text-gray-500">Sem horários disponíveis para este dia.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.map((s) => (
            <button key={s} onClick={() => onPick(s)} className="px-3 py-2 rounded border bg-white hover:bg-gray-50">
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="text-xs text-gray-500">Profissional: <span className="font-medium">{proId || "—"}</span></div>
    </div>
  );
}
function AppointmentsListContent({ events = [], onOpen, onRefresh }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return events;
    return events.filter((ev) => (ev.title || "").toLowerCase().includes(t));
  }, [events, q]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          className="border rounded px-2 py-1.5 text-sm flex-1"
          placeholder="Buscar cliente/serviço"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="px-2 py-1.5 border rounded hover:bg-gray-50" onClick={onRefresh} title="Recarregar">
          <Filter className="w-4 h-4" />
        </button>
      </div>
      <div className="divide-y border rounded">
        {filtered.length === 0 && <div className="p-3 text-sm text-gray-500">Nenhum agendamento.</div>}
        {filtered.map((ev) => (
          <button key={ev.id} onClick={() => onOpen?.(ev.id)} className="p-3 w-full text-left flex items-center justify-between hover:bg-gray-50">
            <div className="text-sm">
              <div className="font-medium">{ev.title}</div>
              <div className="text-gray-500">
                {ev.start?.toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" })} —{" "}
                {ev.end?.toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700">Abrir</span>
          </button>
        ))}
      </div>
    </div>
  );
}
function WaitlistContent({ items = [], loading, onRefresh, onAgendar }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Pessoas na espera</div>
        <button className="px-2 py-1.5 border rounded hover:bg-gray-50" onClick={onRefresh} title="Recarregar">
          Recarregar
        </button>
      </div>
      {loading ? (
        <div className="text-sm text-gray-500">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">Ninguém na lista de espera.</div>
      ) : (
        <div className="divide-y border rounded">
          {items.map((it) => (
            <div key={it.id} className="p-3">
              <div className="text-sm font-medium">{it.client?.name ?? it.clientName ?? "Cliente"}</div>
              <div className="text-xs text-gray-500">
                {(it.client?.phone ?? it.phone) || ""} {it.pref ? `• Preferência: ${it.pref}` : ""}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700" onClick={onAgendar}>
                  Agendar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function BlockTimeForm({ date, proId, onSubmit, onCancel }) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [reason, setReason] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.({
          professionalId: proId || null,
          date: date.toISOString().slice(0, 10),
          start,
          end,
          reason,
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600">Data</label>
          <input type="date" className="border rounded px-2 py-1.5 text-sm w-full" value={formatDateInput(date)} readOnly />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600">Início</label>
            <input type="time" className="border rounded px-2 py-1.5 text-sm w-full" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Término</label>
            <input type="time" className="border rounded px-2 py-1.5 text-sm w-full" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-600">Motivo (opcional)</label>
        <input type="text" className="border rounded px-2 py-1.5 text-sm w-full" placeholder="Ex.: Reunião, almoço..." value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">Cancelar</button>
        <button type="submit" className="px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-black flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Confirmar bloqueio
        </button>
      </div>
    </form>
  );
}
