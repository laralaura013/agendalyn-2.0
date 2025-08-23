// ✅ ARQUIVO: src/pages/WaitlistPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  PlusCircle, Filter, X, Bell, Pencil, Trash2, CheckCircle2, Users, UserPlus,
  Calendar as CalendarIcon, AlertTriangle, RefreshCw
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

import { asArray } from "../utils/asArray";
// 👉 Ajuste o caminho abaixo se necessário
import AppointmentModal from "../components/schedule/AppointmentModal";

/* ========================== Constantes ========================== */
const STATUS_OPTIONS = [
  { id: "WAITING", label: "Aguardando" },
  { id: "NOTIFIED", label: "Notificado" },
  { id: "SCHEDULED", label: "Agendado" },
  { id: "CANCELLED", label: "Cancelado" },
];
const DEFAULT_SLOT_MINUTES = 30;

/* ========================== Utils ========================== */
const pickItems = (data) =>
  Array.isArray(data) ? data : (data?.items || data?.results || data?.data || []);

const toSimpleList = (data) =>
  pickItems(data).map((x) => {
    const name =
      x.name ||
      x.fullName ||
      x.displayName ||
      x.title ||
      [x.firstName, x.lastName].filter(Boolean).join(" ") ||
      x.clientName ||
      "—";
    return {
      ...x,
      id: x.id || x._id || x.value || x.key,
      name,
    };
  });

function Badge({ status }) {
  const map = {
    WAITING: "bg-amber-50 text-amber-700 border-amber-200",
    NOTIFIED: "bg-sky-50 text-sky-700 border-sky-200",
    SCHEDULED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const label = STATUS_OPTIONS.find((s) => s.id === status)?.label || status;
  return (
    <span className={`text-xs px-2 py-1 rounded border ${map[status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
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

/* ========================== Fetch Inteligente ========================== */
async function smartFetchList(kind, setDiag) {
  const attempts = [];
  const pushAttempt = (a) => {
    attempts.push(a);
    setDiag((prev) => ({
      ...prev,
      [kind]: { ...(prev?.[kind] || {}), attempts: [...attempts] },
    }));
  };

  const tryGet = async (url, params) => {
    try {
      const res = await api.get(url, { params });
      const rows = toSimpleList(res.data);
      pushAttempt({ url, params, ok: true, status: res.status, count: rows.length });
      if (rows.length > 0) return rows;
      return null;
    } catch (e) {
      pushAttempt({
        url,
        params,
        ok: false,
        status: e?.response?.status,
        error: e?.response?.data?.message || e?.message,
      });
      return null;
    }
  };

  let candidates = [];
  if (kind === "clients") {
    candidates = [
      ["/clients/min", { q: "", take: 200, skip: 0 }],
      ["/clients", { page: 1, pageSize: 200 }],
      ["/clients", { take: 200, skip: 0 }],
      ["/clients", { limit: 200 }],
      ["/clients/list", {}],
      ["/clients/all", {}],
      ["/clients", {}],
    ];
  } else if (kind === "services") {
    candidates = [
      ["/services/select", { q: "", take: 200, skip: 0 }],
      ["/services/min", { q: "", take: 200, skip: 0 }],
      ["/services", { page: 1, pageSize: 200 }],
      ["/services", { take: 200, skip: 0 }],
      ["/services/list", {}],
      ["/services/all", {}],
      ["/services", {}],
    ];
  } else if (kind === "staff") {
    candidates = [
      ["/staff/select", { q: "", take: 200, skip: 0 }],
      ["/staff/min", { q: "", take: 200, skip: 0 }],
      ["/staff", { page: 1, pageSize: 200 }],
      ["/staff", { take: 200, skip: 0 }],
      ["/staff/list", {}],
      ["/staff/all", {}],
      ["/staff", {}],
    ];
  }

  for (const [url, params] of candidates) {
    const rows = await tryGet(url, params);
    if (rows && rows.length) {
      setDiag((prev) => ({
        ...prev,
        [kind]: { ...(prev?.[kind] || {}), ok: true, used: { url, params }, count: rows.length },
      }));
      return rows;
    }
  }

  setDiag((prev) => ({
    ...prev,
    [kind]: { ...(prev?.[kind] || {}), ok: false, used: null, count: 0 },
  }));
  return [];
}

/* ========================== Página ========================== */
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

  // Diagnóstico de endpoints testados
  const [diag, setDiag] = useState({
    clients: { attempts: [] },
    services: { attempts: [] },
    staff: { attempts: [] },
  });

  /* ----------- Carregamento com fetch inteligente ----------- */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const w = await api.get("/waitlist").catch((e) => {
        toast.error(e?.response?.data?.message || "Erro ao carregar a lista de espera.");
        return { data: [] };
      });

      const [c, s, st] = await Promise.all([
        smartFetchList("clients", setDiag),
        smartFetchList("services", setDiag),
        smartFetchList("staff", setDiag),
      ]);

      setItems(pickItems(w.data));
      setClients(c);
      setServices(s);
      setStaff(st);

      // Fallback: extrai “catálogo mínimo” da própria lista
      if (c.length === 0) {
        const fromWait = asArray(w.data).map((it) => it.client).filter(Boolean);
        if (fromWait.length) setClients(toSimpleList(fromWait));
      }
      if (s.length === 0) {
        const fromWait = asArray(w.data).map((it) => it.service).filter(Boolean);
        if (fromWait.length) setServices(toSimpleList(fromWait));
      }
      if (st.length === 0) {
        const fromWait = asArray(w.data).map((it) => it.professional).filter(Boolean);
        if (fromWait.length) setStaff(toSimpleList(fromWait));
      }
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

  /* ------------------ Horários / Agendamento ------------------ */
  const fetchAvailableSlots = useCallback(
    async (targetDate = slotDate, proId = slotPro, minutes = DEFAULT_SLOT_MINUTES) => {
      try {
        setSlotsLoading(true);

        const baseParams = { date: toYMD(targetDate) };
        if (proId) baseParams.professionalId = proId;

        // 1ª tentativa: duration
        let res = await api.get("/public/available-slots", { params: { ...baseParams, duration: minutes } });
        let items = (res.data || []).map((s) => (typeof s === "string" ? s : s?.time)).filter(Boolean);

        // 2ª tentativa: serviceId
        const fallbackServiceId = activeWaitItem?.serviceId || slotServiceId || services?.[0]?.id;
        if ((!items || items.length === 0) && fallbackServiceId) {
          res = await api.get("/public/available-slots", { params: { ...baseParams, serviceId: fallbackServiceId } });
          items = (res.data || []).map((s) => (typeof s === "string" ? s : s?.time)).filter(Boolean);
        }

        setAvailableSlots(items);
      } catch (e) {
        toast.error("Erro ao carregar horários disponíveis.");
      } finally {
        setSlotsLoading(false);
      }
    },
    [slotDate, slotPro, slotServiceId, activeWaitItem, services]
  );

  const openScheduleDrawer = (waitItem) => {
    setActiveWaitItem(waitItem || null);
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

  /* ========================== Render ========================== */
  const showDiag =
    (clients.length === 0 && (diag.clients?.attempts?.length || 0) > 0) ||
    (services.length === 0 && (diag.services?.attempts?.length || 0) > 0) ||
    (staff.length === 0 && (diag.staff?.attempts?.length || 0) > 0);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7" /> Lista de Espera
            </h1>
            <p className="text-md text-gray-600 mt-1">
              Gerencie interessados e agende diretamente quando houver horário disponível.
            </p>
          </div>
          <button
            onClick={onCreate}
            className="mt-4 sm:mt-0 flex items-center gap-2 bg-[#8C7F8A] hover:bg-opacity-80 text-white font-semibold py-2 px-5 rounded-lg shadow-md"
          >
            <UserPlus className="w-5 h-5" /> Novo
          </button>
        </header>

        {/* Painel de diagnóstico */}
        {showDiag && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <AlertTriangle className="w-5 h-5" />
              Diagnóstico: não encontrei dados para {clients.length === 0 ? "clientes" : ""} {services.length === 0 ? "serviços" : ""} {staff.length === 0 ? "profissionais" : ""}.
            </div>
            <p className="text-sm mb-3">
              Garanta que há um <b>token no localStorage</b> e um <b>companyId</b> (ex.: <code>localStorage.companyId = "SEU_ID"</code>).
              Abaixo estão as tentativas e respostas:
            </p>
            <div className="grid md:grid-cols-3 gap-3 text-xs">
              {["clients", "services", "staff"].map((k) => (
                <div key={k} className="rounded-lg border bg-white p-2">
                  <div className="font-semibold mb-1 uppercase">{k}</div>
                  {(diag[k]?.attempts || []).map((a, i) => (
                    <div key={i} className="mb-1">
                      <div className="font-mono break-all">
                        {a.url}
                        {a.params && Object.keys(a.params).length ? ` ${JSON.stringify(a.params)}` : ""}
                      </div>
                      <div>
                        {a.ok ? (
                          <span className="text-emerald-700">OK</span>
                        ) : (
                          <span className="text-rose-700">ERRO</span>
                        )}
                        {" • "}
                        status: <b>{a.status || "—"}</b>
                        {typeof a.count === "number" ? <> • itens: <b>{a.count}</b></> : null}
                        {a.error ? <> • msg: <span className="italic">{a.error}</span></> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button
              onClick={fetchAll}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </div>
        )}

        {/* Filtros */}
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
                {asArray(STATUS_OPTIONS).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchAll}
                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 flex items-center gap-2"
                title="Recarregar"
              >
                <Filter className="w-4 h-4" /> Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Lista (tabela) */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Contato</th>
                  <th className="text-left px-4 py-3">Serviço</th>
                  <th className="text-left px-4 py-3">Profissional</th>
                  <th className="text-left px-4 py-3">Preferência</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-gray-500">
                      Nenhum item encontrado.
                    </td>
                  </tr>
                )}
                {!loading &&
                  asArray(filtered).map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          {it.client?.name || it.clientName || "—"}
                        </div>
                        <div className="text-gray-500 text-xs">
                          Criado em {formatDate(it.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">{it.client?.phone || it.phone || "—"}</td>
                      <td className="px-4 py-3">{it.service?.name || "—"}</td>
                      <td className="px-4 py-3">{it.professional?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">
                          {it.preferredDate ? `Dia ${formatDate(it.preferredDate)}` : "—"}
                          {it.preferredTime ? ` • ${it.preferredTime}` : ""}
                        </div>
                        {it.pref && <div className="text-xs text-gray-500">{it.pref}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={it.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            className="px-2 py-1 text-xs rounded-lg border bg-white hover:bg-gray-50"
                            onClick={() => onNotify(it.id)}
                            title="Notificar/Marcar como notificado"
                          >
                            <Bell className="w-4 h-4" />
                          </button>

                          {/* ✅ Agendar → abre drawer de horários */}
                          <button
                            className="px-2 py-1 text-xs rounded-lg border bg-white hover:bg-gray-50"
                            onClick={() => openScheduleDrawer(it)}
                            title="Agendar (escolher horário)"
                          >
                            <CalendarIcon className="w-4 h-4" />
                          </button>

                          <select
                            className="px-2 py-1 text-xs border rounded-lg"
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
                            className="px-2 py-1 text-xs rounded-lg border bg-white hover:bg-gray-50"
                            onClick={() => onEdit(it)}
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            className="px-2 py-1 text-xs rounded-lg border bg-white hover:bg-gray-50 text-rose-600"
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
          />
        )}
      </div>
    </div>
  );
}

/* ========================== Form modal (create/edit) ========================== */
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
      preferredDate: preferredDate || undefined,
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
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[640px]">
        <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border p-5">
          <div className="flex items-center justify-between pb-3 border-b">
            <h3 className="font-semibold flex items-center gap-2 text-lg">
              <PlusCircle className="w-5 h-5" />
              {isEdit ? "Editar Espera" : "Novo na Espera"}
            </h3>
            <button className="p-1 rounded hover:bg-gray-100" onClick={onClose} aria-label="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form className="pt-4 space-y-4" onSubmit={handleSubmit}>
            {/* Cliente (ID OU nome/telefone) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">Cliente (cadastrado)</label>
                <select
                  className="border rounded-lg px-3 py-2 w-full focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/30"
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
                      {c.name}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <div className="text-[11px] text-amber-700 mt-1">
                    Nenhum cliente listado. Verifique o painel de diagnóstico acima.
                  </div>
                )}
              </div>
              <div />
              {!clientId && (
                <>
                  <div>
                    <label className="text-xs text-gray-600">Nome (se não tiver cadastro)</label>
                    <input
                      className="border rounded-lg px-3 py-2 w-full focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/30"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex.: Maria Silva"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Telefone</label>
                    <input
                      className="border rounded-lg px-3 py-2 w-full focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/30"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex.: (11) 99999-9999"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Preferências */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">Serviço</label>
                <select
                  className="border rounded-lg px-3 py-2 w-full focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/30"
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
                {services.length === 0 && (
                  <div className="text-[11px] text-amber-700 mt-1">
                    Nenhum serviço listado. Verifique o painel de diagnóstico acima.
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-600">Profissional</label>
                <select
                  className="border rounded-lg px-3 py-2 w-full focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/30"
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
                {staff.length === 0 && (
                  <div className="text-[11px] text-amber-700 mt-1">
                    Nenhum profissional listado. Verifique o painel de diagnóstico acima.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-600">Data preferida</label>
                <input
                  type="date"
                  className="border rounded-lg px-3 py-2 w-full focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/30"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Hora preferida</label>
                <input
                  type="time"
                  className="border rounded-lg px-3 py-2 w-full focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/30"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Preferência (livre)</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/30"
                  value={pref}
                  onChange={(e) => setPref(e.target.value)}
                  placeholder="Ex.: Manhã / Sábado / Após as 18h"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600">Observações</label>
              <input
                className="border rounded-lg px-3 py-2 w-full focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/30"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais importantes"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">Status</label>
                <select
                  className="border rounded-lg px-3 py-2 w-full focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/30"
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
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black flex items-center gap-2"
              >
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

/* ========================== Drawer/Modal de Horários ========================== */
function BaseModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[560px]">
        <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border p-5">
          <div className="flex items-center justify-between pb-3 border-b">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600">Data</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2 w-full"
            value={formatDateInput(date)}
            onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : new Date())}
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Profissional</label>
          <select
            className="border rounded-lg px-3 py-2 w-full"
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
          <label className="text-xs text-gray-600">Serviço (fallback)</label>
          <select
            className="border rounded-lg px-3 py-2 w-full"
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
          <label className="text-xs text-gray-600">Duração (min)</label>
          <input
            type="number"
            min={10}
            step={5}
            className="border rounded-lg px-3 py-2 w-full"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value) || DEFAULT_SLOT_MINUTES)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(date)}
        </div>
        <button onClick={onReload} className="px-3 py-2 text-xs rounded-lg border bg-white hover:bg-gray-50" title="Recarregar">
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
            <button key={s} onClick={() => onPick(s)} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">
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
