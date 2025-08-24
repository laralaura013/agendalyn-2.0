// src/components/appointments/ServiceSelect.jsx
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../../services/api";

/** Normaliza diferentes formatos que sua API pode devolver */
function firstArray(res) {
  if (!res) return [];
  const d = res.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.results)) return d.results;
  return [];
}

/** Testa múltiplos caminhos (útil quando backend muda prefixo /api) */
async function tryGet(paths = [], config) {
  let last;
  for (const p of paths) {
    try {
      const r = await api.get(p, config);
      return firstArray(r);
    } catch (e) {
      last = e;
      if (e?.response?.status === 404) continue;
    }
  }
  throw last;
}

/**
 * ServiceSelect
 * Props:
 *  - value: id do serviço selecionado
 *  - onChange: (id) => void
 *  - staffId?: filtra por profissional se você usar associação service<->staff
 *  - className?: estilos extras
 */
export default function ServiceSelect({ value, onChange, staffId, className = "" }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Busca serviços (com fallback de rotas e shapes)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const qs = staffId ? { params: { staffId } } : undefined;

        const data = await tryGet(
          // coloque aqui todas as rotas possíveis do seu backend
          ["/services", "/dashboard/services", "/api/services", "/api/dashboard/services"],
          qs
        );

        const normalized = data.map((s) => ({
          id: s.id,
          name: s.name,
          price: Number(s.price ?? 0),
          // alguns backends usam durationMinutes
          duration: s.duration ?? s.durationMinutes ?? null,
          active: s.active ?? true,
          // associação service<->staff, se existir
          staffIds:
            s.staffIds ??
            s.staff?.map?.((u) => u.id) ??
            s.staffServices?.map?.((ss) => ss.staffId) ??
            null,
        }));

        // se veio staffId, filtra por associação quando existir
        const filtered =
          staffId && normalized.some((s) => Array.isArray(s.staffIds))
            ? normalized.filter((s) => !s.staffIds || s.staffIds.includes(staffId))
            : normalized;

        if (mounted) setServices(filtered.filter((s) => s.active !== false));
      } catch (e) {
        console.error("Falha ao carregar serviços:", e);
        toast.error(e?.response?.data?.message || "Não foi possível carregar os serviços.");
        if (mounted) setServices([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [staffId]);

  const options = useMemo(
    () =>
      services
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map((s) => ({
          value: s.id,
          label:
            s.duration != null && Number.isFinite(Number(s.duration))
              ? `${s.name} — ${Number(s.duration)} min`
              : s.name,
        })),
    [services]
  );

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value || null)}
      className={`w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#545c57]/40 ${className}`}
      disabled={loading}
    >
      <option value="" disabled>
        {loading ? "Carregando serviços..." : options.length ? "Selecione um serviço" : "Nenhum serviço disponível"}
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
