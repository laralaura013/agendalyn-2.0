// ✅ ARQUIVO: src/pages/WaitlistPage.jsx (UI moderna + mesma lógica)
// Mantém toda a lógica do waitlist antigo (fetch, filtros, CRUD, horários, AppointmentModal)
// Troca apenas a camada de apresentação para o visual moderno do seu painel.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  PlusCircle, Filter, X, Bell, Pencil, Trash2, CheckCircle2, Users, UserPlus,
  Calendar as CalendarIcon, Loader2
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

import { asArray } from "../utils/asArray";
import AppointmentModal from "../components/schedule/AppointmentModal";

const STATUS_OPTIONS = [
  { id: "WAITING", label: "Aguardando" },
  { id: "NOTIFIED", label: "Notificado" },
  { id: "SCHEDULED", label: "Agendado" },
  { id: "CANCELLED", label: "Cancelado" },
];

const DEFAULT_SLOT_MINUTES = 30;

/* ------------------ Utils ------------------ */
function Badge({ status }) {
  const map = {
    WAITING: "bg-yellow-100 text-yellow-800",
    NOTIFIED: "bg-blue-100 text-blue-800",
    SCHEDULED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  const label = STATUS_OPTIONS.find((s) => s.id === status)?.label || status;
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-800"}`}>
      {label}
    </span>
  );
}
function formatDate(d) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date)) return "—";
  return date.toLocaleDateString("pt-BR");
}
function toYMD(d) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatDateInput(d) {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

/* ------------------ Página ------------------ */
export default function WaitlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);

  // filtros
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // form (create/edit)
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Drawer de horários
  const [openSlots, setOpenSlots] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]); // ["07:00","07:30",...]
  const [slotDate, setSlotDate] = useState(() => new Date());
  const [slotPro, setSlotPro] = useState(""); // professionalId
  const [slotMinutes, setSlotMinutes] = useState(DEFAULT_SLOT_MINUTES);
  const [slotServiceId, setSlotServiceId] = useState("");
  const [activeWaitItem, setActiveWaitItem] = useState(null); // item da espera que está sendo agendado

  // Modal de agendamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // {start, end}
  const [selectedEvent, setSelectedEvent] = useState(null); // para edição (não usamos aqui)

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [w, c, s, st] = await Promise.all([
        api.get("/waitlist"),
        api.get("/clients"),
        api.get("/services"),
        api.get("/staff"),
      ]);
      setItems(w.data || []);
      setClients(c.data || []);
      setServices(s.data || []);
      setStaff(st.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar a lista de espera.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items || []).filter((it) => {
      const matchesText =
        !t ||
        (it.client?.name || "").toLowerCase().includes(t) ||
        (it.clientName || "").toLowerCase().includes(t) ||
        (it.phone || "").toLowerCase().includes(t) ||
        (it.pref || "").toLowerCase().includes(t) ||
        (it.notes || "").toLowerCase().includes(t);
      const matchesStatus = !statusFilter || it.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [items, q, statusFilter]);

  /* ------------------ CRUD Waitlist ------------------ */
  const onCreate = () => {
    setEditing(null);
    setOpenForm(true);
  };
  const onEdit = (item) => {
    setEditing(item);
    setOpenForm(true);
  };
  const onDelete = async (id) => {
    if (!window.confirm("Remover este registro da lista de espera?")) return;
    toast.promise(api.delete(`/waitlist/${id}`), {
      loading: "Removendo...",
      success: () => {
        setItems((prev) => prev.filter((x) => x.id !== id));
        return "Removido com sucesso.";
      },
      error: "Erro ao remover.",
    });
  };
  const onNotify = async (id) => {
    toast.promise(api.post(`/waitlist/${id}/notify`), {
      loading: "Notificando...",
      success: () => {
        setItems((prev) => asArray(prev).map((x) => (x.id === id ? { ...x, status: "NOTIFIED" } : x)));
        return "Cliente marcado como notificado.";
      },
      error: "Erro ao notificar.",
    });
  };
  const onStatus = async (id, next) => {
    toast.promise(api.put(`/waitlist/${id}`, { status: next }), {
      loading: "Atualizando status...",
      success: () => {
        setItems((prev) => asArray(prev).map((x) => (x.id === id ? { ...x, status: next } : x)));
        return "Status atualizado.";
      },
      error: "Erro ao atualizar status.",
    });
  };

  /* ------------------ Horários ------------------ */
  const fetchAvailableSlots = useCallback(
    async (targetDate = slotDate, proId = slotPro, minutes = slotMinutes) => {
      try {
        setSlotsLoading(true);

        const baseParams = { date: toYMD(targetDate) };
        if (proId) baseParams.professionalId = proId;

        // 1ª tentativa: com duration
        let res = await api.get("/public/available-slots", {
          params: { ...baseParams, duration: minutes },
        });

        let items = (res.data || [])
          .map((s) => (typeof s === "string" ? s : s?.time))
          .filter(Boolean);

        // 2ª tentativa: com serviceId
        const fallbackServiceId = activeWaitItem?.serviceId || slotServiceId || services?.[0]?.id;
        if ((!items || items.length === 0) && fallbackServiceId) {
          res = await api.get("/public/available-slots", {
            params: { ...baseParams, serviceId: fallbackServiceId },
          });
          items = (res.data || [])
            .map((s) => (typeof s === "string" ? s : s?.time))
            .filter(Boolean);
        }

        setAvailableSlots(items);
      } catch (e) {
        console.error("Erro ao carregar horários disponíveis:", e);
        toast.error("Erro ao carregar horários disponíveis.");
      } finally {
        setSlotsLoading(false);
      }
    },
    [slotDate, slotPro, slotMinutes, slotServiceId, activeWaitItem, services]
  );

  const openScheduleDrawer = (waitItem) => {
    setActiveWaitItem(waitItem || null);

    // Pré-seleciona filtros a partir do item
    const baseDate = waitItem?.preferredDate ? new Date(waitItem.preferredDate) : new Date();
    setSlotDate(baseDate);
    setSlotPro(waitItem?.professionalId || "");
    setSlotServiceId(waitItem?.serviceId || "");
    setSlotMinutes(DEFAULT_SLOT_MINUTES);

    setOpenSlots(true);
    setTimeout(() => fetchAvailableSlots(baseDate, waitItem?.professionalId || "", DEFAULT_SLOT_MINUTES), 0);
  };

  const handlePickSlot = (hhmm) => {
    const [h, m] = String(hhmm).split(":").map(Number);
    const start = new Date(slotDate);
    start.setHours(h, m, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (slotMinutes || DEFAULT_SLOT_MINUTES));

    setSelectedEvent(null);
    setSelectedSlot({ start, end });
    setOpenSlots(false);
    setIsModalOpen(true);
  };

  const handleSaveAppointment = async (formData) => {
    const isEditing = selectedEvent && selectedEvent.id;
    const p = isEditing
      ? api.put(`/appointments/${selectedEvent.id}`, formData)
      : api.post("/appointments", formData);

    await toast.promise(p, {
      loading: isEditing ? "Atualizando agendamento..." : "Criando agendamento...",
      success: async () => {
        if (activeWaitItem?.id) {
          try {
            await api.put(`/waitlist/${activeWaitItem.id}`, { status: "SCHEDULED" });
            setItems((prev) =>
              asArray(prev).map((x) => (x.id === activeWaitItem.id ? { ...x, status: "SCHEDULED" } : x))
            );
          } catch (e) {
            console.warn("Agendamento criado, mas não foi possível atualizar waitlist:", e);
          }
        }
        setIsModalOpen(false);
        setActiveWaitItem(null);
        setSelectedSlot(null);
        setSelectedEvent(null);
        return isEditing ? "Agendamento atualizado!" : "Agendamento criado com sucesso!";
      },
      error: "Erro ao salvar o agendamento.",
    });
  };

  const handleDeleteAppointment = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este agendamento?")) return;

    await toast.promise(api.delete(`/appointments/${id}`), {
      loading: "Excluindo agendamento...",
      success: () => {
        setIsModalOpen(false);
        setSelectedSlot(null);
        setSelectedEvent(null);
        return "Agendamento excluído com sucesso!";
      },
      error: "Erro ao excluir agendamento.",
    });
  };

  /* ------------------ Render ------------------ */
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header moderno */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-gray-800" /> Lista de Espera
            </h1>
            <p className="text-md text-gray-600 mt-1">
              Gerencie interessados e agende quando houver horário disponível.
            </p>
          </div>
          <button
            onClick={onCreate}
            className="mt-4 sm:mt-0 flex items-center gap-2 bg-[#8C7F8A] hover:bg-opacity-80 text-white font-semibold py-2 px-5 rounded-lg shadow-md"
          >
            <UserPlus className="w-5 h-5" /> Novo
          </button>
        </header>

        {/* Filtros em card */}
        <div className="bg-white rounded-xl shadow p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              className="w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50 md:col-span-2"
              placeholder="Buscar por nome, telefone, preferência, observações..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos os Status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchAll}
                className="flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                title="Recarregar"
              >
                <Filter className="w-4 h-4" /> Recarregar
              </button>
            </div>
          </div>
        </div>

        {/* Lista moderna (cards) */}
        {loading ? (
          <p className="text-center text-gray-500 py-10">Carregando...</p>
        ) : filtered.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {filtered.map((entry) => (
                <li key={entry.id} className="p-4 sm:p-6 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 flex-wrap">
                        <p className="text-lg font-bold text-gray-900">
                          {entry.client?.name || entry.clientName || "—"}
                        </p>
                        <Badge status={entry.status} />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {entry.client?.phone || entry.phone || "—"} • Criado em {formatDate(entry.createdAt)}
                      </p>
                      <div className="mt-3 text-sm text-gray-700 space-y-1">
                        <p><strong>Serviço:</strong> {entry.service?.name || "Qualquer"}</p>
                        <p><strong>Profissional:</strong> {entry.professional?.name || "Qualquer"}</p>
                        <p>
                          <strong>Preferência:</strong>{" "}
                          {entry.preferredDate ? `Dia ${formatDate(entry.preferredDate)}` : "Qualquer data"}
                          {entry.preferredTime ? ` • ${entry.preferredTime}` : ""}
                        </p>
                        {entry.pref && <p className="text-gray-600"><strong>Obs:</strong> {entry.pref}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-start flex-shrink-0">
                      <button
                        className="flex items-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700"
                        onClick={() => onNotify(entry.id)}
                        title="Notificar/Marcar como notificado"
                      >
                        <Bell className="w-4 h-4" /> Notificar
                      </button>

                      <button
                        className="flex items-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => openScheduleDrawer(entry)}
                        title="Agendar (escolher horário)"
                      >
                        <CalendarIcon className="w-4 h-4" /> Agendar
                      </button>

                      <select
                        className="px-2 py-2 text-sm border rounded-lg"
                        value={entry.status}
                        onChange={(e) => onStatus(entry.id, e.target.value)}
                        title="Alterar status"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>

                      <button
                        className="p-2 rounded-lg bg-white border hover:bg-gray-50"
                        onClick={() => onEdit(entry)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-lg bg-white border hover:bg-red-50 text-red-600"
                        onClick={() => onDelete(entry.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-200">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-xl font-semibold text-gray-800">Nenhum item na lista</h3>
            <p className="text-gray-500 mt-2">Use os filtros ou adicione um novo cliente à espera.</p>
          </div>
        )}

        {/* Formulário (criar/editar espera) - visual moderno */}
        {openForm && (
          <FormModal
            onClose={() => setOpenForm(false)}
            onSaved={(saved, isEdit) => {
              setOpenForm(false);
              setItems((prev) => {
                if (isEdit) return asArray(prev).map((x) => (x.id === saved.id ? saved : x));
                return [saved, ...prev];
              });
            }}
            editing={editing}
            clients={clients}
            services={services}
            staff={staff}
          />
        )}

        {/* Drawer de Horários (moderno) */}
        {openSlots && (
          <BaseModal onClose={() => setOpenSlots(false)} title="Horários disponíveis">
            <SlotsContent
              date={slotDate}
              setDate={setSlotDate}
              proId={slotPro}
              setProId={setSlotPro}
              serviceId={slotServiceId}
              setServiceId={setSlotServiceId}
              minutes={slotMinutes}
              setMinutes={setSlotMinutes}
              staff={staff}
              services={services}
              loading={slotsLoading}
              slots={availableSlots}
              onReload={() => fetchAvailableSlots(slotDate, slotPro, slotMinutes)}
              onPick={handlePickSlot}
            />
          </BaseModal>
        )}

        {/* AppointmentModal (pré-preenchido após escolher horário) */}
        {isModalOpen && (
          <AppointmentModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedSlot(null);
              setSelectedEvent(null);
              setActiveWaitItem(null);
            }}
            onSave={handleSaveAppointment}
            onDelete={handleDeleteAppointment}
            event={selectedEvent}
            slot={selectedSlot}
            clients={clients}
            services={services}
            staff={staff}
            // Se seu AppointmentModal aceitar initialData, descomente:
            // initialData={{
            //   clientId: activeWaitItem?.clientId ?? "",
            //   serviceId: activeWaitItem?.serviceId ?? "",
            //   professionalId: activeWaitItem?.professionalId ?? slotPro ?? "",
            // }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------ Form modal (create/edit) — moderno ------------------ */
function FormModal({ onClose, onSaved, editing, clients, services, staff }) {
  const [clientId, setClientId] = useState(editing?.clientId || "");
  const [clientName, setClientName] = useState(editing?.clientName || "");
  const [phone, setPhone] = useState(editing?.phone || "");

  const [serviceId, setServiceId] = useState(editing?.serviceId || "");
  const [professionalId, setProfessionalId] = useState(editing?.professionalId || "");

  const [preferredDate, setPreferredDate] = useState(
    editing?.preferredDate ? new Date(editing.preferredDate).toISOString().slice(0, 10) : ""
  );
  const [preferredTime, setPreferredTime] = useState(editing?.preferredTime || "");
  const [pref, setPref] = useState(editing?.pref || "");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [status, setStatus] = useState(editing?.status || "WAITING");

  const isEdit = !!editing?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      clientId: clientId || undefined,
      clientName: clientId ? undefined : clientName || undefined,
      phone: clientId ? undefined : phone || undefined,
      serviceId: serviceId || undefined,
      professionalId: professionalId || undefined,
      preferredDate: preferredDate || undefined, // YYYY-MM-DD
      preferredTime: preferredTime || undefined,
      pref: pref || undefined,
      notes: notes || undefined,
      status: status || undefined,
    };

    if (!payload.clientId && !payload.clientName && !payload.phone) {
      toast.error("Informe um cliente ou nome/telefone.");
      return;
    }

    if (isEdit) {
      toast.promise(api.put(`/waitlist/${editing.id}`, payload), {
        loading: "Salvando...",
        success: (res) => {
          onSaved?.(res.data, true);
          return "Registro atualizado.";
        },
        error: "Erro ao salvar.",
      });
    } else {
      toast.promise(api.post(`/waitlist`, payload), {
        loading: "Criando...",
        success: (res) => {
          onSaved?.(res.data, false);
          return "Registro criado.";
        },
        error: "Erro ao criar.",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[720px]">
        <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between pb-4 border-b">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              {isEdit ? "Editar na Espera" : "Novo na Espera"}
            </h3>
            <button className="p-2 rounded-full hover:bg-gray-100" onClick={onClose} aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form className="pt-4 space-y-6" onSubmit={handleSubmit}>
            {/* Cliente (ID OU nome/telefone) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cliente (cadastrado)</label>
              <select
                className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  if (e.target.value) {
                    setClientName("");
                    setPhone("");
                  }
                }}
              >
                <option value="">— Selecionar —</option>
                {asArray(clients).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {!clientId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome (se não tiver cadastro)</label>
                  <input
                    className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex.: Maria Silva"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                  <input
                    className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex.: (11) 99999-9999"
                  />
                </div>
              </div>
            )}

            {/* Preferências */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Serviço</label>
                <select
                  className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  <option value="">— Qualquer —</option>
                  {asArray(services).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profissional</label>
                <select
                  className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                  value={professionalId}
                  onChange={(e) => setProfessionalId(e.target.value)}
                >
                  <option value="">— Qualquer —</option>
                  {asArray(staff).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data preferida</label>
                <input
                  type="date"
                  className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hora preferida</label>
                <input
                  type="time"
                  className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferência (livre)</label>
                <input
                  className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                  value={pref}
                  onChange={(e) => setPref(e.target.value)}
                  placeholder="Ex.: Manhã / Sábado / Após as 18h"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
              <input
                className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais importantes"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {asArray(STATUS_OPTIONS).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="rounded-lg bg-white border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" className="rounded-lg bg-[#4A544A] px-8 py-2.5 font-medium text-white hover:bg-opacity-80 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {isEdit ? "Salvar alterações" : "Adicionar à espera"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Drawer/Modal de Horários — moderno ------------------ */
function BaseModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[640px]">
        <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between pb-4 border-b">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <button className="p-2 rounded-full hover:bg-gray-100" onClick={onClose} aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="pt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SlotsContent({
  date, setDate,
  proId, setProId,
  serviceId, setServiceId,
  minutes, setMinutes,
  staff, services,
  loading, slots = [],
  onReload, onPick
}) {
  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
          <input
            type="date"
            className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
            value={formatDateInput(date)}
            onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : new Date())}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Profissional</label>
          <select
            className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
            value={proId || ""}
            onChange={(e) => setProId(e.target.value)}
          >
            <option value="">— Qualquer —</option>
            {asArray(staff).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Serviço (fallback)</label>
          <select
            className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
            value={serviceId || ""}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">— Não usar —</option>
            {asArray(services).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duração (min)</label>
          <input
            type="number"
            min={10}
            step={5}
            className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value) || DEFAULT_SLOT_MINUTES)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(date)}
        </div>
        <button
          onClick={onReload}
          className="rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          title="Recarregar"
        >
          <Filter className="w-4 h-4" /> Recarregar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando horários...
        </div>
      ) : slots.length === 0 ? (
        <div className="text-sm text-gray-500">Sem horários disponíveis para os filtros selecionados.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {asArray(slots).map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500">
        Profissional: <span className="font-medium">{proId || "—"}</span> • Duração:{" "}
        <span className="font-medium">{minutes} min</span>
      </div>
    </div>
  );
}
