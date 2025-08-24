// src/components/schedule/ServiceSelect.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const toBRL = (v) => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const firstArray = (d) =>
  Array.isArray(d) ? d : d?.items || d?.results || d?.data || [];

export default function ServiceSelect({ value, onChange, placeholder = "Selecione um serviço" }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchServices() {
    setLoading(true);
    try {
      // tenta /services (comum), e aceita diversos formatos de resposta
      const res = await api.get("/services", { params: { take: 200, active: true } });
      const raw = res?.data ?? res;
      const list = firstArray(raw).map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        duration: s.duration ?? s.durationMinutes ?? null,
      }));
      setServices(list);
    } catch (e) {
      // fallback: tenta outros possíveis caminhos (se existirem no seu backend)
      try {
        const res2 = await api.get("/services/list");
        setServices(firstArray(res2).map((s) => ({
          id: s.id, name: s.name, price: s.price, duration: s.duration ?? null,
        })));
      } catch {
        setServices([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchServices(); }, []);

  const opts = useMemo(() => services.sort((a,b) =>
    String(a.name).localeCompare(String(b.name))
  ), [services]);

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value || null)}
      className="w-full rounded-md border px-3 py-2 text-sm"
      disabled={loading}
    >
      <option value="">{loading ? "Carregando..." : placeholder}</option>
      {opts.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} {s.price ? `• ${toBRL(s.price)}` : ""} {s.duration ? `• ${s.duration} min` : ""}
        </option>
      ))}
    </select>
  );
}
