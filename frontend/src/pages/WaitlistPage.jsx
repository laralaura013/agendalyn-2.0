// ✅ ARQUIVO: src/pages/WaitlistPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  PlusCircle, Filter, X, Bell, Pencil, Trash2, CheckCircle2, Users, UserPlus,
  Calendar as CalendarIcon
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";


import { asArray } from '../utils/asArray';
// 👉 Ajuste o caminho abaixo se necessário
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
    WAITING: "bg-amber-50 text-amber-700 border-amber-200",
    NOTIFIED: "bg-sky-50 text-sky-700 border-sky-200",
    SCHEDULED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const label = STATUS_OPTIONS.find((s) => s.id === status)?.label || status;
  return <span className={`text-xs px-2 py-1 rounded border ${map[status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>{label}</span>;
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
function WaitlistPage() {
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

  /* ------------------ Drawer de horários ------------------ */

  // Versão localizada + fallback por serviceId quando necessário
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

        const items = (res.data || [])
          .map((s) => (typeof s === "string" ? s : s?.time))
          .filter(Boolean);

        // 2ª tentativa: com serviceId
        const fallbackServiceId = activeWaitItem?.serviceId || slotServiceId || services?.[0]?.id;
        if ((!items || items.length === 0) && fallbackServiceId) {
          res = await api.get("/public/available-slots", {
            params: { ...baseParams, serviceId: fallbackServiceId },
            
          });
          const items2 = (res.data || [])
            .map((s) => (typeof s === "string" ? s : s?.time))
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

  // Quando o usuário escolhe um horário no drawer:
  // -> calcula start/end
  // -> abre AppointmentModal pré-preenchido (em vez de salvar direto)
  const handlePickSlot = (hhmm) => {
    const [h, m] = String(hhmm).split(":"asArray()).map(Number);
    const start = new Date(slotDate);
    start.setHours(h, m, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + (slotMinutes || DEFAULT_SLOT_MINUTES));

    setSelectedEvent(null);
    setSelectedSlot({ start, end });
    setOpenSlots(false);
    setIsModalOpen(true);
  };

  // Salvar do AppointmentModal: cria agendamento e atualiza waitlist
  const handleSaveAppointment = async (formData) => {
    const isEditing = selectedEvent && selectedEvent.id;
    const p = isEditing
      ? api.put(`/appointments/${selectedEvent.id}`, formData)
      : api.post("/appointments", formData);

    await toast.promise(p, {
      loading: isEditing ? "Atualizando agendamento..." : "Criando agendamento...",
      success: async (res) => {
        // se veio de waitlist, marca o item como SCHEDULED
        if (activeWaitItem?.id) {
          try {
            await api.put(`/waitlist/${activeWaitItem.id}`, { status: "SCHEDULED" });
            setItems((prev) => asArray(prev).map((x) => (x.id === activeWaitItem.id ? { ...x, status: "SCHEDULED" } : x)));
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
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
            <Users className="w-6 h-6" /> Lista de Espera
          </h1>
          <p className="text-sm text-gray-500">
            Gerencie interessados e agende diretamente quando houver horário disponível.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Novo
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border rounded p-3 mb-4">
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-600">Busca</label>
            <input
              className="border rounded px-2 py-2 w-full"
              placeholder="Nome, telefone, preferência, observações..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="w-full md:w-56">
            <label className="text-xs text-gray-600">Status</label>
            <select
              className="border rounded px-2 py-2 w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {asArray(STATUS_OPTIONS).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchAll}
            className="px-3 py-2 rounded border bg-white hover:bg-gray-50 flex items-center gap-2"
            title="Recarregar"
          >
            <Filter className="w-4 h-4" /> Aplicar / Recarregar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Cliente</th>
                <th className="text-left px-3 py-2">Contato</th>
                <th className="text-left px-3 py-2">Serviço</th>
                <th className="text-left px-3 py-2">Profissional</th>
                <th className="text-left px-3 py-2">Preferência</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-gray-500">
                    Nenhum item encontrado.
                  </td>
                </tr>
              )}
              {!loading &&
                asArray(filtered).map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium">{it.client?.name || it.clientName || "—"}</div>
                      <div className="text-gray-500 text-xs">Criado em {formatDate(it.createdAt)}</div>
                    </td>
                    <td className="px-3 py-2">{it.client?.phone || it.phone || "—"}</td>
                    <td className="px-3 py-2">{it.service?.name || "—"}</td>
                    <td className="px-3 py-2">{it.professional?.name || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-gray-600">
                        {it.preferredDate ? `Dia ${formatDate(it.preferredDate)}` : "—"}
                        {it.preferredTime ? ` • ${it.preferredTime}` : ""}
                      </div>
                      {it.pref && <div className="text-xs text-gray-500">{it.pref}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <Badge status={it.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
                          onClick={() => onNotify(it.id)}
                          title="Notificar/Marcar como notificado"
                        >
                          <Bell className="w-4 h-4" />
                        </button>

                        {/* ✅ Agendar → abre drawer de horários */}
                        <button
                          className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
                          onClick={() => openScheduleDrawer(it)}
                          title="Agendar (escolher horário)"
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </button>

                        <select
                          className="px-2 py-1 text-xs border rounded"
                          value={it.status}
                          onChange={(e) => onStatus(it.id, e.target.value)}
                          title="Alterar status"
                        >
                          {asArray(STATUS_OPTIONS).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
                          onClick={() => onEdit(it)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 text-rose-600"
                          onClick={() => onDelete(it.id)}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulário (criar/editar espera) */}
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

      {/* Drawer de Horários */}
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

      {/* ✅ AppointmentModal (pré-preenchido ao escolher um horário) */}
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
          // Dica: se seu AppointmentModal aceitar "initialData", você pode passar:
          // initialData={{
          //   clientId: activeWaitItem?.clientId ?? "",
          //   serviceId: activeWaitItem?.serviceId ?? "",
          //   professionalId: activeWaitItem?.professionalId ?? slotPro ?? "",
          // }}
        />
      )}
    </div>
  );
}

/* ------------------ Form modal (create/edit) ------------------ */
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[620px]">
        <div className="bg-white rounded-t-2xl md:rounded-xl shadow-lg border p-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              {isEdit ? "Editar Espera" : "Novo na Espera"}
            </h3>
            <button className="p-1 rounded hover:bg-gray-100" onClick={onClose} aria-label="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form className="pt-3 space-y-3" onSubmit={handleSubmit}>
            {/* Cliente (ID OU nome/telefone) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Cliente (cadastrado)</label>
                <select
                  className="border rounded px-2 py-2 w-full"
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
                  {(clients || [asArray(])).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div />
              {!clientId && (
                <>
                  <div>
                    <label className="text-xs text-gray-600">Nome (se não tiver cadastro)</label>
                    <input
                      className="border rounded px-2 py-2 w-full"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex.: Maria Silva"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Telefone</label>
                    <input
                      className="border rounded px-2 py-2 w-full"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex.: (11) 99999-9999"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Preferências */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Serviço</label>
                <select
                  className="border rounded px-2 py-2 w-full"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  <option value="">— Qualquer —</option>
                  {(services || [asArray(])).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Profissional</label>
                <select
                  className="border rounded px-2 py-2 w-full"
                  value={professionalId}
                  onChange={(e) => setProfessionalId(e.target.value)}
                >
                  <option value="">— Qualquer —</option>
                  {(staff || [asArray(])).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600">Data preferida</label>
                <input
                  type="date"
                  className="border rounded px-2 py-2 w-full"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Hora preferida</label>
                <input
                  type="time"
                  className="border rounded px-2 py-2 w-full"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Preferência (livre)</label>
                <input
                  className="border rounded px-2 py-2 w-full"
                  value={pref}
                  onChange={(e) => setPref(e.target.value)}
                  placeholder="Ex.: Manhã / Sábado / Após as 18h"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600">Observações</label>
              <input
                className="border rounded px-2 py-2 w-full"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais importantes"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Status</label>
                <select className="border rounded px-2 py-2 w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {asArray(STATUS_OPTIONS).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" className="px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-black flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {isEdit ? "Salvar alterações" : "Adicionar à espera"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Drawer/Modal de Horários ------------------ */
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
    <div className="space-y-3">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-600">Data</label>
          <input
            type="date"
            className="border rounded px-2 py-2 w-full"
            value={formatDateInput(date)}
            onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : new Date())}
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Profissional</label>
          <select
            className="border rounded px-2 py-2 w-full"
            value={proId || ""}
            onChange={(e) => setProId(e.target.value)}
          >
            <option value="">— Qualquer —</option>
            {(staff || [asArray(])).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Serviço (fallback)</label>
          <select
            className="border rounded px-2 py-2 w-full"
            value={serviceId || ""}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">— Não usar —</option>
            {(services || [asArray(])).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-600">Duração (min)</label>
          <input
            type="number"
            min={10}
            step={5}
            className="border rounded px-2 py-2 w-full"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value) || DEFAULT_SLOT_MINUTES)}
          />
        </div>
      </div>

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
        <div className="text-sm text-gray-500">Sem horários disponíveis para os filtros selecionados.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {asArray(slots).map((s) => (
            <button key={s} onClick={() => onPick(s)} className="px-3 py-2 rounded border bg-white hover:bg-gray-50">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500">
        Profissional: <span className="font-medium">{proId || "—"}</span> • Duração: <span className="font-medium">{minutes} min</span>
      </div>
    </div>
  );
}

export default WaitlistPage;

