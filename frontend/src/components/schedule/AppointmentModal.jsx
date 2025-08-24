// src/components/schedule/AppointmentModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../dashboard/Modal";
import api from "../../services/api";
import toast from "react-hot-toast";
import NeuButton from "../ui/NeuButton";
import { asArray } from "../../utils/asArray";

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
  const [formData, setFormData] = useState({
    clientId: "",
    serviceId: "",
    professionalId: "",
    start: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000),
    notes: "",
    status: "SCHEDULED",
  });

  // Pré-preenche ao abrir
  useEffect(() => {
    if (event) {
      setFormData({
        clientId: event.clientId || "",
        serviceId: event.serviceId || "",
        professionalId: event.userId || "", // backend usa userId
        start: new Date(event.start),
        end: new Date(event.end),
        notes: event.notes || "",
        status: event.status || "SCHEDULED",
      });
    } else {
      const start = slot?.start ? new Date(slot.start) : new Date();
      const end = slot?.end ? new Date(slot.end) : new Date(start.getTime() + 60 * 60 * 1000);
      setFormData((prev) => ({ ...prev, start, end }));
    }
  }, [event, slot]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleClientChange = (clientId) => setFormData((p) => ({ ...p, clientId }));

  const handleDateChange = (e) => {
    const date = e.target.value; // YYYY-MM-DD
    const time = formData.start.toTimeString().split(" ")[0]; // HH:mm:ss
    const newStart = new Date(`${date}T${time}`);
    const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
    setFormData((p) => ({ ...p, start: newStart, end: newEnd }));
  };

  const handleTimeChange = (e) => {
    const time = e.target.value; // HH:mm
    const date = formData.start.toISOString().split("T")[0]; // YYYY-MM-DD
    const newStart = new Date(`${date}T${time}`);
    const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
    setFormData((p) => ({ ...p, start: newStart, end: newEnd }));
  };

  const buildPayload = () => ({
    clientId: formData.clientId,
    serviceId: formData.serviceId,
    userId: formData.professionalId || null, // backend usa userId
    start: formData.start.toISOString(),
    end: formData.end.toISOString(),
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

  const handleDelete = async (id) => {
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
              value={formData.start.toISOString().split("T")[0]}
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
              value={formData.start.toTimeString().substring(0, 5)}
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
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 text-sm border rounded-md"
            style={{ background: "var(--bg-color)", color: "var(--text-color)" }}
          />
        </div>

        {/* Ações */}
        <div className="flex justify-between items-center pt-2">
          {event ? (
            <NeuButton
              onClick={() => handleDelete(event.id)}
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
