// src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { DollarSign, CalendarDays, Users, TrendingUp } from "lucide-react";

import NeuCard from "../components/ui/NeuCard";
import NeuButton from "../components/ui/NeuButton";
import "../styles/neumorphism.css";
import { asArray } from "../utils/asArray";

// Registra uma ÚNICA vez (fora do componente)
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// Lazy-load dos componentes de gráfico para estabilizar os hooks
const LazyBar = lazy(() =>
  import("react-chartjs-2").then((m) => ({ default: m.Bar }))
);
const LazyDoughnut = lazy(() =>
  import("react-chartjs-2").then((m) => ({ default: m.Doughnut }))
);

// Wrapper que só renderiza children depois do mount do cliente
function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? children : null;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    revenueToday: 0,
    appointmentsToday: 0,
    newClientsThisMonth: 0,
    occupationRate: 0,
    productStats: [],
  });
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: sum }, { data: rev }] = await Promise.all([
          api.get("/dashboard/summary"),
          api.get("/dashboard/revenue-by-month"),
        ]);

        if (!alive) return;

        setSummary({
          revenueToday: sum?.revenueToday ?? 0,
          appointmentsToday: sum?.appointmentsToday ?? 0,
          newClientsThisMonth: sum?.newClientsThisMonth ?? 0,
          occupationRate: sum?.occupationRate ?? 0,
          productStats: Array.isArray(sum?.productStats) ? sum.productStats : [],
        });

        setMonthly(Array.isArray(rev) ? rev : []);
      } catch (e) {
        console.error("Erro ao carregar dashboard:", e);
        if (alive) setErrorMessage(e?.response?.data?.message || e.message || "Falha ao carregar.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const fmtBRL = (v) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

  if (loading) {
    return (
      <p className="text-center py-20 text-[var(--text-color)] opacity-70 animate-pulse">
        Carregando painel…
      </p>
    );
  }

  if (errorMessage) {
    return (
      <p className="text-center py-20 text-red-600">
        Erro ao carregar dashboard: {errorMessage}
      </p>
    );
  }

  const cards = [
    {
      label: "Faturamento Hoje",
      value: fmtBRL(summary.revenueToday),
      pct: summary.revenueVarPct ?? 0,
      icon: <DollarSign size={22} />,
      chip: "Vendas",
    },
    {
      label: "Agendamentos Hoje",
      value: summary.appointmentsToday,
      pct: summary.appointmentsVarPct ?? 0,
      icon: <CalendarDays size={22} />,
      chip: "Agenda",
    },
    {
      label: "Novos Clientes (Mês)",
      value: summary.newClientsThisMonth,
      pct: summary.clientsVarPct ?? 0,
      icon: <Users size={22} />,
      chip: "Clientes",
    },
    {
      label: "Taxa de Ocupação",
      value: `${summary.occupationRate}%`,
      pct: summary.occupationRate ?? 0,
      icon: <TrendingUp size={22} />,
      chip: "Equipe",
    },
  ];

  // Sanitiza dados do gráfico (evita NaN/undefined)
  const monthlySanitized = useMemo(
    () =>
      asArray(monthly).map((d) => ({
        month: String(d?.month ?? ""),
        value: Number(d?.value ?? 0),
      })),
    [monthly]
  );

  const barData = useMemo(
    () => ({
      labels: monthlySanitized.map((d) => d.month),
      datasets: [
        {
          label: "Faturamento",
          data: monthlySanitized.map((d) => d.value),
          backgroundColor: "#7C3AED",
          borderRadius: 8,
          barThickness: 30,
        },
      ],
    }),
    [monthlySanitized]
  );

  const barOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: "#D6DEE8" },
          ticks: { callback: (v) => fmtBRL(v) },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => fmtBRL(ctx.parsed.y) } },
    }}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // manter estático para não recriar internamente
  );

  const hasProductStats = Array.isArray(summary.productStats) && summary.productStats.length > 0;

  const doughnutData = useMemo(
    () => ({
      labels: asArray(summary.productStats).map((p) => String(p?.label ?? "")),
      datasets: [
        {
          data: asArray(summary.productStats).map((p) => Number(p?.value ?? 0)),
          backgroundColor: ["#7C3AED", "#FBBF24", "#10B981"],
        },
      ],
    }),
    [summary.productStats]
  );

  const doughnutOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, padding: 16 } },
      },
    }),
    []
  );

  return (
    <div className="space-y-6 neu-surface">
      {/* Ações rápidas */}
      <div className="flex flex-wrap items-center gap-3">
        <NeuButton variant="primary" onClick={() => navigate("/dashboard/schedule")}>
          + Novo agendamento
        </NeuButton>
        <NeuButton onClick={() => navigate("/dashboard/orders")}>Abrir comanda</NeuButton>
        <NeuButton onClick={() => navigate("/dashboard/cashier")}>Ir ao Caixa</NeuButton>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <NeuCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[var(--text-color)]">{c.label}</div>
                <div className="neumorphic-inset p-2 rounded-xl">{c.icon}</div>
              </div>
              <div className="mt-2 text-3xl font-bold text-[var(--text-color)]">{c.value}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="neu-chip">{c.chip}</span>
                <span className="text-xs text-[var(--text-color)] opacity-80">
                  {(c.pct >= 0 ? "+" : "") + (Number(c.pct) || 0)}%
                </span>
              </div>
            </NeuCard>
          </motion.div>
        ))}
      </div>

      {/* Faturamento mensal */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <NeuCard className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-color)]">Faturamento Mensal</h2>
          </div>

          <div className="neu-card-inset p-3 rounded-2xl">
            <div className="h-80">
              <ClientOnly>
                <Suspense fallback={<div className="h-full w-full animate-pulse rounded-xl bg-white/40" />}>
                  {monthlySanitized.length > 0 ? (
                    <LazyBar data={barData} options={barOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-[var(--text-color)]/70">
                      Sem dados de faturamento.
                    </div>
                  )}
                </Suspense>
              </ClientOnly>
            </div>
          </div>
        </NeuCard>
      </motion.div>

      {/* Estatísticas de produtos */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <NeuCard className="p-4 md:p-6">
          <h2 className="text-lg font-semibold text-[var(--text-color)] mb-4">
            Estatísticas de Produtos
          </h2>

          <div className="neu-card-inset p-3 rounded-2xl">
            <div className="h-72">
              <ClientOnly>
                <Suspense fallback={<div className="h-full w-full animate-pulse rounded-xl bg-white/40" />}>
                  {hasProductStats ? (
                    <LazyDoughnut data={doughnutData} options={doughnutOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-[var(--text-color)]/70">
                      Nenhum dado de estatísticas de produtos disponível.
                    </div>
                  )}
                </Suspense>
              </ClientOnly>
            </div>
          </div>
        </NeuCard>
      </motion.div>
    </div>
  );
}
