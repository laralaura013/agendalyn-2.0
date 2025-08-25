// src/components/schedule/AppointmentModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../dashboard/Modal";
import api from "../../services/api";
import toast from "react-hot-toast";
import NeuButton from "../ui/NeuButton";
import { asArray } from "../../utils/asArray";

/* ================== Helpers de Data/Hora (LOCAL, sem Z) ================== */
// Remove "Z" ou offset final e interpreta como local
const parseApiDateAsLocal = (value) => {
  if (value instanceof Date) return new Date(value);
  if (typeof value !== "string") return new Date(value);
  const cleaned = value.replace(/(Z|[+\-]\d{2}:\d{2})$/, "");
  // new Date('YYYY-MM-DDTHH:mm:ss') é interpretado como local pelo JS
  return new Date(cleaned);
};

// YYYY-MM-DD (local)
const toYMDLocal = (d) => {
  if (!(d instanceof Date)) d = new Date(d);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// HH:mm (local)
const toHM = (d) => {
  if (!(d instanceof Date)) d = new Date(d);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// YYYY-MM-DDTHH:mm:ss (LOCAL, sem Z)
const toLocalISOStringNoZ = (d) => {
  if (!(d instanceof Date)) d = new Date(d);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
};

// Soma minutos
const addMinutes = (d, mins) => new Date(d.getTime() + mins * 60000);

/** =================== ClientSelect (com busca e paginação leve) =================== */
function ClientSelect({ value, onChange, initialClients = [] }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(asArray(initialClients));
  const [pagination, setPagination] = useState({ skip: 0, take: 20, total: 0, hasMore: false });
  const abortRef = useRef();

  const fetchClients = async ({ q = "", skip = 0, take = 20, append = false } = {}) => {
    try {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      const res = await api.get("/clients/min", { params: { q, skip, take }, signal: ctrl.signal });
      const data = res.data || {};
      setOptions((prev) => (append ? [...prev, ...asArray(data.items)] : asArray(data.items)));
      setPagination({
        skip,
        take,
        total: Number(data.total || 0),
        hasMore: Boolean(data.hasMore),
      });
    } catch (e) {
      if (e.name !== "CanceledError" && e.code !== "ERR_CANCELED") {
        console.error("Erro ao carregar clientes (min):", e);
        toast.error("Não foi possível carregar clientes.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (asArray(initialClients).length) {
      setOptions(asArray(initialClients));
      setPagination((p) => ({ ...p, total: asArray(initialClients).length, hasMore: false }));
    } else {
      fetchClients({ q: "", skip: 0, take: 20, append: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchClients({ q: query, skip: 0, take: 20, append: false });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const onLoadMore = () => {
    if (!pagination.hasMore || loading) return;
    const nextSkip = pagination.skip + pagination.take;
    fetchClients({ q: query, skip: nextSkip, take: pagination.take, append: true });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar por nome, telefone, e-mail..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-md"
          style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
        />
      </div>

      <select
        name="clientId"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border rounded-md"
        required
        style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
      >
        <option value="">Selecione um cliente</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.phone ? `— ${c.phone}` : c.email ? `— ${c.email}` : ""}
          </option>
        ))}
      </select>

      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "var(--text-color)" }}>
          {loading ? "Carregando..." : `${options.length} de ${pagination.total}`}
        </span>
        {pagination.hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            className="px-3 py-1 border rounded hover:opacity-90"
            style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
            disabled={loading}
          >
            Carregar mais
          </button>
        )}
      </div>
    </div>
  );
}

/** =================== AppointmentModal =================== */
const AppointmentModal = ({
  isOpen,
  onClose,
  event,
  slot,
  clients = [],
  services = [],
  staff = [],
  fetchAppointments,    // opcional
  onSave,               // opcional (Schedule pode controlar salvar)
  onDelete,             // opcional (Schedule pode controlar excluir)
}) => {
  const DEFAULT_DURATION = 60; // minutos caso serviço não tenha duração

  const [formData, setFormData] = useState({
    clientId: "",
    serviceId: "",
    professionalId: "",
    start: new Date(),
    end: addMinutes(new Date(), DEFAULT_DURATION),
    notes: "",
    status: "SCHEDULED",
  });

  // mapa de serviços por id (para pegar duração)
  const serviceById = useMemo(() => {
    const m = {};
    asArray(services).forEach((s) => (m[s.id] = s));
    return m;
  }, [services]);

  // Pré-preenche ao abrir
  useEffect(() => {
    if (event) {
      setFormData({
        clientId: event.clientId || "",
        serviceId: event.serviceId || "",
        professionalId: event.userId || "", // backend usa userId
        start: parseApiDateAsLocal(event.start),
        end: parseApiDateAsLocal(event.end),
        notes: event.notes || "",
        status: event.status || "SCHEDULED",
      });
    } else {
      const start = slot?.start ? new Date(slot.start) : new Date();
      // se já tem serviço escolhido, usa sua duração; senão default
      const dur =
        (slot?.durationMinutes ||
          serviceById?.[formData.serviceId]?.duration ||
          DEFAULT_DURATION) | 0;
      const end = addMinutes(start, dur || DEFAULT_DURATION);
      setFormData((prev) => ({ ...prev, start, end }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, slot]);

  // Quando trocar serviço, recalcula "end" usando a duração
  useEffect(() => {
    const s = serviceById[formData.serviceId];
    if (!s) return;
    const dur = Number(s.duration || DEFAULT_DURATION);
    setFormData((p) => ({ ...p, end: addMinutes(p.start, dur) }));
  }, [formData.serviceId, serviceById]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleClientChange = (clientId) => setFormData((p) => ({ ...p, clientId }));

  const handleDateChange = (e) => {
    const date = e.target.value; // YYYY-MM-DD
    const time = toHM(formData.start); // HH:mm
    const newStart = new Date(`${date}T${time}`);
    const dur =
      Number(serviceById?.[formData.serviceId]?.duration) || DEFAULT_DURATION;
    const newEnd = addMinutes(newStart, dur);
    setFormData((p) => ({ ...p, start: newStart, end: newEnd }));
  };

  const handleTimeChange = (e) => {
    const time = e.target.value; // HH:mm
    const date = toYMDLocal(formData.start); // YYYY-MM-DD
    const newStart = new Date(`${date}T${time}`);
    const dur =
      Number(serviceById?.[formData.serviceId]?.duration) || DEFAULT_DURATION;
    const newEnd = addMinutes(newStart, dur);
    setFormData((p) => ({ ...p, start: newStart, end: newEnd }));
  };

  const buildPayload = () => ({
    clientId: formData.clientId,
    serviceId: formData.serviceId,
    userId: formData.professionalId || null, // backend usa userId
    // >>> Envio LOCAL, sem Z (evita shift de fuso)
    start: toLocalISOStringNoZ(formData.start),
    end: toLocalISOStringNoZ(formData.end),
    notes: formData.notes || "",
    status: formData.status || "SCHEDULED",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildPayload();
    try {
      if (onSave) {
        await onSave(payload);
      } else if (event) {
        await api.put(`/appointments/${event.id}`, payload);
        toast.success("Agendamento atualizado com sucesso!");
      } else {
        await api.post("/appointments", payload);
        toast.success("Agendamento criado com sucesso!");
      }
      fetchAppointments?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || "Erro ao salvar agendamento.";
      const missing = err?.response?.data?.missing;
      toast.error(missing ? `${msg}: ${missing.join(", ")}` : msg);
    }
  };

  const handleDeleteClick = async (id) => {
    try {
      if (onDelete) {
        await onDelete(id);
      } else {
        await api.delete(`/appointments/${id}`);
        toast.success("Agendamento excluído com sucesso!");
        fetchAppointments?.();
      }
      onClose();
    } catch (e) {
      const msg = e?.response?.data?.message || "Erro ao excluir agendamento.";
      toast.error(msg);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-color)" }}>
          {event ? "Editar Agendamento" : "Novo Agendamento"}
        </h2>

        {/* Cliente (com busca) */}
        <div className="neu-card rounded-2xl p-3">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-color)" }}>
            Cliente
          </label>
          <ClientSelect value={formData.clientId} onChange={handleClientChange} initialClients={clients} />
        </div>

        {/* Data e Hora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="neu-card rounded-2xl p-3">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-color)" }}>
              Data
            </label>
            <input
              type="date"
              value={toYMDLocal(formData.start)}
              onChange={handleDateChange}
              className="w-full px-3 py-2 text-sm border rounded-md"
              style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
              required
            />
          </div>
          <div className="neu-card rounded-2xl p-3">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-color)" }}>
              Hora
            </label>
            <input
              type="time"
              value={toHM(formData.start)}
              onChange={handleTimeChange}
              className="w-full px-3 py-2 text-sm border rounded-md"
              style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
              required
            />
          </div>
        </div>

        {/* Serviço */}
        <div className="neu-card rounded-2xl p-3">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-color)" }}>
            Serviço
          </label>
          <select
            name="serviceId"
            value={formData.serviceId}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm border rounded-md"
            style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
            required
          >
            <option value="">Selecione um serviço</option>
            {asArray(services).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {formData.serviceId && (
            <p className="mt-2 text-xs opacity-70" style={{ color: "var(--text-color)" }}>
              Duração: {serviceById?.[formData.serviceId]?.duration || DEFAULT_DURATION} min
            </p>
          )}
        </div>

        {/* Profissional */}
        <div className="neu-card rounded-2xl p-3">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-color)" }}>
            Profissional
          </label>
          <select
            name="professionalId"
            value={formData.professionalId}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm border rounded-md"
            style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
            required
          >
            <option value="">Selecione um profissional</option>
            {asArray(staff).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status (somente edição) */}
        {event && (
          <div className="neu-card rounded-2xl p-3">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-color)" }}>
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border rounded-md"
              style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
            >
              <option value="SCHEDULED">Agendado</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="COMPLETED">Finalizado</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>
        )}

        {/* Observações */}
        <div className="neu-card rounded-2xl p-3">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-color)" }}>
            Observações
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 text-sm border rounded-md"
            style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
          />
        </div>

        {/* Ações */}
        <div className="flex justify-between items-center pt-2">
          {event ? (
            <NeuButton
              onClick={() => handleDeleteClick(event.id)}
              className="!px-3 !py-2"
              title="Excluir agendamento"
            >
              Excluir
            </NeuButton>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <NeuButton onClick={onClose}>Cancelar</NeuButton>
            <NeuButton variant="primary" type="submit">
              Salvar
            </NeuButton>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AppointmentModal;
