// src/pages/Schedule.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { parseISO } from "date-fns";
import toast from "react-hot-toast";
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
  Users as UsersIcon,
  CalendarDays,
} from "lucide-react";
import api from "../services/api";
import Calendar from "../components/schedule/Calendar";
import AppointmentModal from "../components/schedule/AppointmentModal";
import { asArray } from "../utils/asArray";
import NeuCard from "../components/ui/NeuCard";
import NeuButton from "../components/ui/NeuButton";
import "../styles/neumorphism.css";

const DEFAULT_SLOT_MINUTES = 30;

/* ====================== Helpers ====================== */
const isAbort = (err) =>
  err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || err?.message === "canceled";

const toYMD = (d) => {
  if (!(d instanceof Date)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDateInput = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;

/** início/fim de períodos (para as visões) */
const startOfWeek = (d) => {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};
const endOfWeek = (d) => {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
};
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

/** Normaliza respostas que podem vir como array direto ou {items|results: []} */
function firstArray(res) {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.results)) return d.results;
  if (Array.isArray(d?.rows)) return d.rows;
  return [];
}

/** Tenta múltiplos caminhos, útil quando há variações (/api/...) */
async function tryGet(paths = [], config) {
  let lastErr;
  for (const p of paths) {
    try {
      return await api.get(p, config);
    } catch (e) {
      lastErr = e;
      if (e?.response?.status === 404) continue;
    }
  }
  throw lastErr;
}

/* ====================== Componente ====================== */
export default function Schedule() {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);

  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState([]);

  const [view, setView] = useState("day"); // dia/semana/mês (Calendar)
  const [layout, setLayout] = useState("agenda"); // "agenda" | "profissionais"  ← NOVO MODO
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
  const [availableSlots, setAvailableSlots] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const loadedOnceRef = useRef(false);

  /* --------- Params por visão --------- */
  const buildRangeParams = useCallback(
    (baseDate) => {
      const params = {};
      if (view === "day") {
        params.date = toYMD(baseDate);
      } else if (view === "week") {
        params.date_from = toYMD(startOfWeek(baseDate));
        params.date_to = toYMD(endOfWeek(baseDate));
      } else {
        params.date_from = toYMD(startOfMonth(baseDate));
        params.date_to = toYMD(endOfMonth(baseDate));
      }
      if (selectedPro) params.professionalId = selectedPro;
      return params;
    },
    [view, selectedPro]
  );

  /* --------- Normalizador de serviços --------- */
  const normalizeServices = (rawList) =>
    asArray(rawList).map((s) => ({
      id: s.id,
      name: s.name,
      duration: s.duration ?? s.durationMinutes ?? null,
      price: s.price ?? 0,
      active: s.active ?? true,
    }));

  /* --------- Loads --------- */
  const loadShared = useCallback(async (signal) => {
    const [cRes, sRes, stRes] = await Promise.all([
      tryGet(["/clients/min", "/clients"], { params: { take: 100 }, signal }),
      tryGet(["/services", "/api/services", "/dashboard/services"], { params: { take: 200 }, signal }),
      tryGet(["/staff", "/api/staff"], { params: { take: 200 }, signal }),
    ]);

    setClients(firstArray(cRes));
    setServices(normalizeServices(firstArray(sRes)));
    setStaff(firstArray(stRes));
  }, []);

  const fetchAppointments = useCallback(
    async (signal) => {
      try {
        const params = buildRangeParams(date);
        const response = await api.get("/appointments", { params, signal });
        const rows = asArray(response.data).filter((apt) => {
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
        if (isAbort(error)) return;
        console.error("Erro ao buscar agendamentos:", error);
        toast.error("Erro ao carregar os agendamentos.");
      }
    },
    [date, buildRangeParams]
  );

  const fetchBlocks = useCallback(
    async (signal) => {
      try {
        const params = buildRangeParams(date);
        const res = await api.get("/agenda/blocks", { params, signal });
        setBlocks(res.data || []);
      } catch (e) {
        if (isAbort(e)) return;
        console.error("Erro ao carregar bloqueios:", e);
        toast.error("Erro ao carregar bloqueios.");
      }
    },
    [date, buildRangeParams]
  );

  const fetchAvailableSlots = useCallback(
    async (targetDate = date, proId = selectedPro, minutes = DEFAULT_SLOT_MINUTES, signal) => {
      try {
        setSlotsLoading(true);
        const baseParams = { date: toYMD(targetDate) };
        if (proId) baseParams.staffId = proId;

        let res = await api.get("/public/available-slots", {
          params: { ...baseParams, duration: minutes },
          signal,
        });

        let items = asArray(res.data)
          .map((s) => (typeof s === "string" ? s : s?.formatted || s?.time))
          .filter(Boolean);

        // fallback: algumas APIs só retornam slot com serviceId
        if (items.length === 0 && services?.[0]?.id) {
          res = await api.get("/public/available-slots", {
            params: { ...baseParams, serviceId: services[0].id },
            signal,
          });
          items = asArray(res.data)
            .map((s) => (typeof s === "string" ? s : s?.formatted || s?.time))
            .filter(Boolean);
        }

        setAvailableSlots(items);
      } catch (e) {
        if (isAbort(e)) return;
        console.error("Erro ao carregar horários disponíveis:", e);
        toast.error("Erro ao carregar horários disponíveis.");
      } finally {
        setSlotsLoading(false);
      }
    },
    [date, selectedPro, services]
  );

  const fetchWaitlist = useCallback(async (signal) => {
    try {
      setWaitlistLoading(true);
      const res = await api.get("/waitlist", { signal });
      setWaitlist(res.data || []);
    } catch (e) {
      if (isAbort(e)) return;
      console.error("Erro ao carregar lista de espera:", e);
      toast.error("Erro ao carregar a lista de espera.");
    } finally {
      setWaitlistLoading(false);
    }
  }, []);

  /* --------- Effects --------- */
  useEffect(() => {
    if (loadedOnceRef.current) return;
    loadedOnceRef.current = true;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      try {
        await loadShared(ac.signal);
      } catch (e) {
        if (!isAbort(e)) toast.error("Erro ao carregar dados iniciais.");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [loadShared]);

  useEffect(() => {
    if (!selectedPro && staff?.length) setSelectedPro(staff[0]?.id);
  }, [staff, selectedPro]);

  useEffect(() => {
    if (!loadedOnceRef.current) return;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      try {
        await Promise.all([fetchAppointments(ac.signal), fetchBlocks(ac.signal)]);
      } catch (e) {
        if (!isAbort(e)) toast.error("Erro ao carregar dados da agenda.");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [view, date, selectedPro, fetchAppointments, fetchBlocks]);

  /* --------- Handlers --------- */
  const handleSelectSlot = useCallback(
    (slotInfo) => {
      const { start, end } = slotInfo;
      const conflito = asArray(blocks).some((b) => {
        const base = new Date(b.date);
        const [sh, sm] = String(b.startTime || "00:00").split(":").map((x) => parseInt(x, 10));
        const [eh, em] = String(b.endTime || "00:00").split(":").map((x) => parseInt(x, 10));
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
              const ac = new AbortController();
              fetchBlocks(ac.signal);
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
        const ac = new AbortController();
        fetchAppointments(ac.signal);
        setIsModalOpen(false);
        return `Agendamento ${isEditing ? "atualizado" : "criado"} com sucesso!`;
      },
      error: (e) => e?.response?.data?.message || "Erro ao salvar o agendamento.",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este agendamento?")) return;
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
    toast.promise(api.delete(`/appointments/${id}`), {
      loading: "Excluindo agendamento...",
      success: () => {
        const ac = new AbortController();
        fetchAppointments(ac.signal);
        setIsModalOpen(false);
        return "Agendamento excluído com sucesso!";
      },
      error: (e) => {
        const ac = new AbortController();
        fetchAppointments(ac.signal);
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
    return asArray(blocks).map((b) => {
      const base = new Date(b.date);
      const [sh, sm] = String(b.startTime || "00:00").split(":").map((x) => parseInt(x, 10));
      const [eh, em] = String(b.endTime || "00:00").split(":").map((x) => parseInt(x, 10));
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

  // → Apontamentos em formato para o modo "Profissionais"
  const staffAppointments = useMemo(() => {
    return asArray(events)
      .map((ev) => ev?.resource)
      .filter(Boolean)
      .map((apt) => ({
        id: apt.id,
        clientName: apt.client?.name ?? "Cliente",
        serviceName: apt.service?.name ?? "Serviço",
        startsAt: typeof apt.start === "string" ? parseISO(apt.start) : new Date(apt.start),
        endsAt: typeof apt.end === "string" ? parseISO(apt.end) : new Date(apt.end),
        staffId: apt.professionalId ?? apt.staffId ?? apt.userId ?? null,
        color: "#9333ea22",
      }))
      .filter((a) => a.staffId);
  }, [events]);

  const handlePickAvailableSlot = useCallback(
    (hhmm) => {
      const [h, m] = String(hhmm || "").split(":").map((x) => parseInt(x, 10));
      const s = new Date(date);
      s.setHours(h || 0, m || 0, 0, 0);
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
    const ac = new AbortController();
    fetchAvailableSlots(date, selectedPro, DEFAULT_SLOT_MINUTES, ac.signal);
  }, [date, selectedPro, fetchAvailableSlots]);

  // Clique em coluna no modo "Profissionais"
  const handleCreateOnColumn = useCallback((pro, start, end) => {
    setSelectedPro(pro?.id || pro); // pré-seleciona o barbeiro
    setSelectedEvent(null);
    setSelectedSlot({ start, end });
    setIsModalOpen(true);
  }, []);

  /* ---------- Recebe o clique do FAB global ---------- */
  useEffect(() => {
    const handler = () => openEmptyModal();
    window.addEventListener("openEmptyAppointment", handler);
    return () => window.removeEventListener("openEmptyAppointment", handler);
  }, []);

  /* ---------- Esconde/mostra o FAB global quando modais/sidebars abrem ---------- */
  useEffect(() => {
    const anyOverlayOpen =
      isModalOpen || openSlots || openApptList || openWaitlist || openBlockTime;
    try {
      window.dispatchEvent(new CustomEvent("fab:toggle", { detail: !anyOverlayOpen }));
    } catch {}
  }, [isModalOpen, openSlots, openApptList, openWaitlist, openBlockTime]);

  /* ====================== UI ====================== */
  return (
    <div className="space-y-4 neu-surface">
      {/* ====== TOPO MOBILE ====== */}
      <NeuCard className="p-0 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <NeuButton onClick={goPrev} className="!px-2 !py-2" aria-label="Anterior">
            <ChevronLeft className="w-5 h-5" />
          </NeuButton>
          <div className="text-base font-semibold capitalize text-[var(--text-color)]">
            {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date)}
          </div>
          <NeuButton onClick={goNext} className="!px-2 !py-2" aria-label="Próximo">
            <ChevronRight className="w-5 h-5" />
          </NeuButton>
        </div>
        <div className="p-2 pt-0">
          <MobileDaysStrip date={date} onChangeDate={(d) => { setDate(d); setView("day"); }} />
        </div>
      </NeuCard>

      {/* ====== TOOLBAR DESKTOP ====== */}
      <NeuCard className="hidden md:block p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <ProfessionalsSelect
              value={selectedPro || ""}
              onChange={setSelectedPro}
              options={asArray(staff).map((s) => ({ id: s.id, name: s.name }))}
            />
            <div className="flex items-center gap-1">
              <NeuButton onClick={goPrev} className="!px-2 !py-1.5" title="Anterior">
                <ChevronLeft className="w-4 h-4" />
              </NeuButton>
              <NeuButton onClick={goToday} className="!px-3 !py-1.5">
                Hoje
              </NeuButton>
              <NeuButton onClick={goNext} className="!px-2 !py-1.5" title="Próximo">
                <ChevronRight className="w-4 h-4" />
              </NeuButton>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            {/* Toggle do layout (NÃO altera seu design; só troca o componente renderizado) */}
            <LayoutToggle value={layout} onChange={setLayout} />
            <NeuButton
              onClick={() => {
                setOpenSlots(true);
                const ac = new AbortController();
                fetchAvailableSlots(date, selectedPro, DEFAULT_SLOT_MINUTES, ac.signal);
              }}
              className="flex items-center gap-2"
              title="Horários disponíveis"
            >
              <CalendarIcon className="w-4 h-4" />
              Horários
            </NeuButton>
            <NeuButton variant="primary" onClick={openEmptyModal} className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Encaixe
            </NeuButton>
          </div>
        </div>
      </NeuCard>

      {/* ====== Header data (desktop) ====== */}
      <NeuCard className="hidden md:flex items-center justify-between px-4 py-2">
        <span className="font-medium capitalize text-[var(--text-color)]">{pageTitle}</span>
        <span className="opacity-80 text-[var(--text-color)]">
          {layout === "profissionais"
            ? "Visão por profissionais"
            : asArray(staff).find((p) => p.id === selectedPro)?.name ?? ""}
        </span>
      </NeuCard>

      {/* ====== grid ====== */}
      <div className="grid grid-cols-12 gap-4">
        {/* Calendário / Staff view */}
        <div className="col-span-12 xl:col-span-9 2xl:col-span-10">
          <NeuCard className="p-3 md:p-4">
            {loading ? (
              <p className="text-sm text-[var(--text-color)] opacity-80 p-2">Carregando dados da agenda...</p>
            ) : (
              <div className="neu-card-inset rounded-2xl p-2 md:p-3">
                {layout === "profissionais" ? (
                  <StaffColumnView
                    date={date}
                    staff={asArray(staff).map((s) => ({
                      id: s.id,
                      name: s.name,
                      avatarUrl: s.avatarUrl || s.photoUrl || s.avatar,
                    }))}
                    appointments={staffAppointments}
                    slotMinutes={DEFAULT_SLOT_MINUTES}
                    workStartHour={7}
                    workEndHour={20}
                    onEmptySlotClick={handleCreateOnColumn}
                    onAppointmentClick={(apt) => {
                      const found = events.find((ev) => ev?.resource?.id === apt.id);
                      if (found) {
                        setSelectedEvent(found.resource);
                        setSelectedSlot(null);
                        setIsModalOpen(true);
                      }
                    }}
                  />
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
            )}
          </NeuCard>
        </div>

        {/* Sidebar desktop only */}
        <aside className="hidden xl:block col-span-12 xl:col-span-3 2xl:col-span-2 space-y-4">
          {/* Bloqueio */}
          <NeuCard className="p-4">
            <div className="flex items-start justify-between">
              <label className="flex items-center gap-2 select-none text-[var(--text-color)]">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={blockEnabled}
                  onChange={(e) => setBlockEnabled(e.target.checked)}
                />
                <span className="text-sm font-medium">Bloquear horário</span>
              </label>
              <NeuButton
                onClick={() => setOpenBlockTime(true)}
                disabled={!blockEnabled}
                className="flex items-center gap-2 disabled:opacity-40"
                title="Bloquear intervalo"
              >
                <Lock className="w-4 h-4" /> Bloquear
              </NeuButton>
            </div>
          </NeuCard>

          {/* Data + ações rápidas */}
          <NeuCard className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="border rounded px-2 py-1.5 text-sm w-full"
                value={formatDateInput(date)}
                onChange={(e) => {
                  const d = e.target.value ? new Date(e.target.valueAsNumber) : new Date();
                  setDate(d);
                }}
                style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
              />
              <NeuButton className="!px-3 !py-1.5" onClick={goToday} title="Ir para hoje">
                Hoje
              </NeuButton>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <NeuButton
                onClick={() => {
                  setOpenSlots(true);
                  const ac = new AbortController();
                  fetchAvailableSlots(date, selectedPro, DEFAULT_SLOT_MINUTES, ac.signal);
                }}
                className="flex items-center justify-center gap-2"
              >
                <CalendarIcon className="w-4 h-4" />
                Horários disponíveis
              </NeuButton>

              <NeuButton onClick={() => setOpenApptList(true)} className="flex items-center justify-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Lista de Agendamentos
              </NeuButton>

              <NeuButton
                variant="primary"
                onClick={() => {
                  setOpenWaitlist(true);
                  const ac = new AbortController();
                  fetchWaitlist(ac.signal);
                }}
                className="flex items-center justify-center gap-2"
              >
                <List className="w-4 h-4" />
                Lista de Espera
              </NeuButton>
            </div>
          </NeuCard>

          {/* Produtos/Serviços (dummy visual) */}
          <NeuCard className="p-0">
            <Accordion title="Produtos / Serviços" open={openProducts} onToggle={() => setOpenProducts((v) => !v)}>
              <div className="space-y-2 mt-2">
                <input
                  type="text"
                  placeholder="Buscar produto/serviço"
                  className="border rounded px-2 py-1.5 text-sm w-full"
                  style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
                />
                <div className="max-h-40 overflow-auto rounded text-sm neu-card-inset divide-y">
                  {["Corte Masculino", "Barba", "Sobrancelha", "Hidratação"].map((item) => (
                    <div
                      key={item}
                      className="px-3 py-2 flex items-center justify-between neumorphic-interactive rounded"
                    >
                      <span className="text-[var(--text-color)]">{item}</span>
                      <button className="neu-btn !px-2 !py-1 text-xs">Adicionar</button>
                    </div>
                  ))}
                </div>
              </div>
            </Accordion>
          </NeuCard>

          {/* Legenda */}
          <NeuCard className="p-0">
            <Accordion title="Legenda" open={openLegend} onToggle={() => setOpenLegend((v) => !v)}>
              <div className="mt-2">
                <Legend />
              </div>
            </Accordion>
          </NeuCard>
        </aside>
      </div>

      {/* ====== MODAIS ====== */}
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
          // dica: se seu AppointmentModal permitir valor inicial de profissional,
          // use selectedPro como default (já está sendo setado ao clicar em coluna).
        />
      )}

      {openSlots && (
        <BaseModal onClose={() => setOpenSlots(false)} title="Horários disponíveis">
          <SlotsModalContent
            date={date}
            proId={selectedPro}
            loading={slotsLoading}
            slots={availableSlots}
            onReload={() => {
              const ac = new AbortController();
              fetchAvailableSlots(date, selectedPro, DEFAULT_SLOT_MINUTES, ac.signal);
            }}
            onPick={handlePickAvailableSlot}
          />
        </BaseModal>
      )}

      {openApptList && (
        <SideDrawer title="Lista de Agendamentos" onClose={() => setOpenApptList(false)}>
          <AppointmentsListContent
            events={events}
            onOpen={handleOpenEventFromList}
            onRefresh={() => {
              const ac = new AbortController();
              fetchAppointments(ac.signal);
            }}
          />
        </SideDrawer>
      )}

      {openWaitlist && (
        <SideDrawer title="Lista de Espera" onClose={() => setOpenWaitlist(false)}>
          <WaitlistContent
            items={waitlist}
            loading={waitlistLoading}
            onRefresh={() => {
              const ac = new AbortController();
              fetchWaitlist(ac.signal);
            }}
            onAgendar={handleWaitlistAgendar}
          />
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
                const ac = new AbortController();
                fetchBlocks(ac.signal);
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
}

/* =============== Sub-componentes UI =============== */
function ProfessionalsSelect({ value, onChange, options }) {
  return (
    <select
      className="border rounded px-2 py-1.5 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
    >
      {asArray(options).map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
function ViewToggle({ value, onChange }) {
  const opts = [
    { id: "day", label: "Dia" },
    { id: "week", label: "Semana" },
    { id: "month", label: "Mês" },
  ];
  return (
    <div className="inline-flex items-center rounded overflow-hidden">
      {asArray(opts).map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1.5 text-sm ${value === opt.id ? "neu-btn neu-btn-primary" : "neu-btn"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
function LayoutToggle({ value, onChange }) {
  const opts = [
    { id: "agenda", label: "Agenda", icon: CalendarDays },
    { id: "profissionais", label: "Profissionais", icon: UsersIcon },
  ];
  return (
    <div className="inline-flex items-center rounded overflow-hidden">
      {opts.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`px-3 py-1.5 text-sm flex items-center gap-1 ${
            value === id ? "neu-btn neu-btn-primary" : "neu-btn"
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
function Accordion({ title, open, onToggle, children }) {
  return (
    <div className="rounded-2xl">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 neu-btn rounded-2xl">
        <span className="text-sm font-medium text-[var(--text-color)]">{title}</span>
        <ChevronRightIcon open={open} />
      </button>
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
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
      {asArray(items).map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-sm ${it.color}`} />
          <span className="text-[var(--text-color)]">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
function BaseModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative neu-card rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-[var(--text-color)]">{title}</h3>
          <button className="p-1 rounded-full hover:opacity-80" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
function SideDrawer({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-sm neu-card flex flex-col rounded-l-2xl">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-[var(--text-color)]">{title}</h3>
          <button className="p-1 rounded-full hover:opacity-80" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
function SlotsModalContent({ date, loading, slots = [], onReload, onPick }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--text-color)] opacity-80">
          {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(date)}
        </div>
        <NeuButton onClick={onReload} className="!px-2 !py-1 text-xs" title="Recarregar">
          Recarregar
        </NeuButton>
      </div>
      {loading ? (
        <div className="text-sm text-[var(--text-color)] opacity-80">Carregando horários...</div>
      ) : slots.length === 0 ? (
        <div className="text-sm text-[var(--text-color)] opacity-80">Sem horários disponíveis para este dia.</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {asArray(slots).map((s) => (
            <NeuButton key={s} onClick={() => onPick(s)} className="!px-3 !py-2">
              {s}
            </NeuButton>
          ))}
        </div>
      )}
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
          style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
        />
        <NeuButton className="!px-2 !py-2" onClick={onRefresh} title="Recarregar">
          <Filter className="w-4 h-4" />
        </NeuButton>
      </div>
      <div className="divide-y rounded neu-card">
        {filtered.length === 0 && (
          <div className="p-3 text-sm text-[var(--text-color)] opacity-80">Nenhum agendamento.</div>
        )}
        {asArray(filtered).map((ev) => (
          <button
            key={ev.id}
            onClick={() => onOpen?.(ev.id)}
            className="p-3 w-full text-left flex items-center justify-between neumorphic-interactive rounded"
          >
            <div className="text-sm">
              <div className="font-medium text-[var(--text-color)]">{ev.title}</div>
              <div className="opacity-80 text-[var(--text-color)]">
                {ev.start?.toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" })} —{" "}
                {ev.end?.toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded neu-btn">Abrir</span>
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
        <div className="font-medium text-[var(--text-color)]">Pessoas na espera</div>
        <NeuButton className="!px-3 !py-1.5" onClick={onRefresh} title="Recarregar">
          Recarregar
        </NeuButton>
      </div>
      {loading ? (
        <div className="text-sm text-[var(--text-color)] opacity-80">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-[var(--text-color)] opacity-80">Ninguém na lista de espera.</div>
      ) : (
        <div className="divide-y neu-card rounded">
          {asArray(items).map((it) => (
            <div key={it.id} className="p-3">
              <div className="text-sm font-medium text-[var(--text-color)]">
                {it.client?.name ?? it.clientName ?? "Cliente"}
              </div>
              <div className="text-xs opacity-80 text-[var(--text-color)]">
                {(it.client?.phone ?? it.phone) || ""} {it.pref ? `• Preferência: ${it.pref}` : ""}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <NeuButton variant="primary" className="!px-2 !py-1 text-xs" onClick={onAgendar}>
                  Agendar
                </NeuButton>
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
          date: toYMD(date),
          start,
          end,
          reason,
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-[var(--text-color)] opacity-80">Data</label>
          <input
            type="date"
            className="border rounded px-2 py-1.5 text-sm w-full"
            value={formatDateInput(date)}
            readOnly
            style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--text-color)] opacity-80">Início</label>
            <input
              type="time"
              className="border rounded px-2 py-1.5 text-sm w-full"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-color)] opacity-80">Término</label>
            <input
              type="time"
              className="border rounded px-2 py-1.5 text-sm w-full"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
            />
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs text-[var(--text-color)] opacity-80">Motivo (opcional)</label>
        <input
          type="text"
          className="border rounded px-2 py-1.5 text-sm w-full"
          placeholder="Ex.: Reunião, almoço..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <NeuButton onClick={onCancel}>Cancelar</NeuButton>
        <NeuButton variant="primary" type="submit" className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Confirmar bloqueio
        </NeuButton>
      </div>
    </form>
  );
}

/* ====== Faixa de dias (mobile) ====== */
function MobileDaysStrip({ date, onChangeDate }) {
  const start = startOfWeek(date);
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const isSameDay = (a, b) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  return (
    <div className="pt-2">
      <div className="flex gap-2 px-1 pb-2 overflow-x-auto no-scrollbar">
        {asArray(days).map((d) => {
          const active = isSameDay(d, date);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onChangeDate?.(d)}
              className={`flex flex-col items-center justify-center min-w-[44px] px-2 py-1 rounded-2xl ${
                active ? "neu-btn neu-btn-primary" : "neu-btn"
              }`}
            >
              <span className="text-[11px] uppercase">
                {new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d)}
              </span>
              <span className="text-sm font-semibold">{String(d.getDate()).padStart(2, "0")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
 * StaffColumnView (visão em colunas por profissional)
 * Mantido aqui dentro para facilitar colar 1 arquivo só.
 * =======================================================*/
function StaffColumnView({
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

  const dayStart = useMemo(() => {
    const d = new Date(date);
    d.setHours(workStartHour, 0, 0, 0);
    return d;
  }, [date, workStartHour]);

  const dayEnd = useMemo(() => {
    const d = new Date(date);
    d.setHours(workEndHour, 0, 0, 0);
    return d;
  }, [date, workEndHour]);

  const totalMinutes = useMemo(() => (dayEnd - dayStart) / 60000, [dayStart, dayEnd]);
  const rows = useMemo(() => Math.ceil(totalMinutes / slotMinutes), [totalMinutes, slotMinutes]);

  const timeLabels = useMemo(() => {
    const out = [];
    for (let i = 0; i <= rows; i++) {
      const mins = i * slotMinutes;
      const d = new Date(dayStart.getTime() + mins * 60000);
      out.push(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
    return out;
  }, [dayStart, rows, slotMinutes]);

  const apptsByStaff = useMemo(() => {
    const map = {};
    for (const s of asArray(staff)) map[s.id] = [];
    for (const a of asArray(appointments)) {
      if (a.staffId && map[a.staffId]) map[a.staffId].push(a);
    }
    return map;
  }, [appointments, staff]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // scroll inicial ~09:00
    const target = new Date(dayStart);
    target.setHours(9, 0, 0, 0);
    const pct = (target - dayStart) / (dayEnd - dayStart);
    el.scrollTop = Math.max(0, pct * el.scrollHeight - 80);
  }, [dayStart, dayEnd]);

  const topPct = (d) => {
    const mins = (d - dayStart) / 60000;
    return Math.max(0, (mins / totalMinutes) * 100);
  };
  const heightPct = (start, end) => {
    const mins = Math.max(5, (end - start) / 60000);
    return Math.max(2.5, (mins / totalMinutes) * 100);
  };

  const handleColumnClick = (e, s) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pct = y / rect.height;
    const minsFromStart = Math.round((pct * totalMinutes) / slotMinutes) * slotMinutes;
    const start = new Date(dayStart.getTime() + minsFromStart * 60000);
    const end = new Date(start.getTime() + slotMinutes * 60000);
    onEmptySlotClick?.(s, start, end);
  };

  return (
    <div className="w-full h-[72vh] md:h-[78vh] flex flex-col">
      {/* Cabeçalho com avatares (sticky) */}
      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${asArray(staff).length}, minmax(220px, 1fr))` }}>
        <div />
        {asArray(staff).map((s) => (
          <div key={s.id} className="sticky top-0 z-20 bg-white/80 backdrop-blur rounded-xl px-3 py-3 flex items-center gap-3 border shadow-sm">
            <img
              src={s.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=9333ea&color=fff`}
              alt={s.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-violet-300"
            />
            <div className="leading-tight">
              <div className="font-medium text-gray-800">{s.name}</div>
              <div className="text-xs text-gray-500">Agenda do dia</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grade */}
      <div ref={containerRef} className="relative flex-1 overflow-auto rounded-2xl border bg-white shadow-inner">
        <div
          className="grid"
          style={{ gridTemplateColumns: `120px repeat(${asArray(staff).length}, minmax(220px, 1fr))`, height: "1800px" }}
        >
          {/* Coluna de horários */}
          <div className="relative border-r">
            {timeLabels.map((t, i) => (
              <div key={i} className="absolute left-0 w-full pr-2 text-right text-xs text-gray-400" style={{ top: `${(i / timeLabels.length) * 100}%` }}>
                {t}
                <div className="h-px bg-gray-100 mt-2" />
              </div>
            ))}
          </div>

          {/* Colunas dos profissionais */}
          {asArray(staff).map((s) => (
            <div key={s.id} className="relative border-r cursor-crosshair" onClick={(e) => handleColumnClick(e, s)}>
              {/* linhas de fundo */}
              {timeLabels.map((_, i) => (
                <div key={i} className="absolute left-0 w-full h-px bg-gray-100" style={{ top: `${(i / timeLabels.length) * 100}%` }} />
              ))}

              {/* agendamentos */}
              {asArray(apptsByStaff[s.id]).map((a) => {
                const start = new Date(a.startsAt);
                const end = new Date(a.endsAt);
                const top = topPct(start);
                const height = heightPct(start, end);
                return (
                  <div
                    key={a.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onAppointmentClick?.(a);
                    }}
                    className="absolute left-2 right-2 rounded-xl shadow-sm border hover:shadow-md transition"
                    style={{ top: `${top}%`, height: `${height}%`, background: a.color || "#9333ea22" }}
                  >
                    <div className="text-[11px] font-medium px-2 pt-1 text-gray-800 truncate">
                      {a.clientName}
                    </div>
                    <div className="text-[10px] px-2 text-gray-600 truncate">
                      {a.serviceName}
                    </div>
                    <div className="text-[10px] px-2 pb-1 text-gray-500">
                      {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–{end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
