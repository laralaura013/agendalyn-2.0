// Dashboard com cores nos números, chips navegáveis e gráficos reativos ao tema
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { motion } from "framer-motion";
import { DollarSign, CalendarDays, Users, TrendingUp, PackageX } from "lucide-react";
import Chart from "chart.js/auto";

import NeuCard from "../components/ui/NeuCard";
import NeuButton from "../components/ui/NeuButton";
import "../styles/neumorphism.css";
import { asArray } from "../utils/asArray";

const cssVar = (name) =>
  (typeof window !== "undefined"
    ? getComputedStyle(document.documentElement).getPropertyValue(name)
    : ""
  ).trim();

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
  const [themeTick, setThemeTick] = useState(0); // força recriar charts ao trocar tema

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [{ data: sum }, { data: rev }] = await Promise.all([
          api.get("/dashboard/summary"),
          api.get("/dashboard/revenue-by-month"),
        ]);

        if (!mounted) return;

        setSummary({
          revenueToday: sum?.revenueToday ?? 0,
          appointmentsToday: sum?.appointmentsToday ?? 0,
          newClientsThisMonth: sum?.newClientsThisMonth ?? 0,
          occupationRate: sum?.occupationRate ?? 0,
          productStats: Array.isArray(sum?.productStats) ? sum.productStats : [],
        });

        setMonthly(Array.isArray(rev) ? rev : []);
      } catch (e) {
        console.error(e);
        setErrorMessage(e?.response?.data?.message || e.message || "Erro ao carregar dados.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    // escuta mudança de tema enviada pelo AdminLayout
    const onTheme = () => setThemeTick((x) => x + 1);
    window.addEventListener("themechange", onTheme);
    return () => {
      mounted = false;
      window.removeEventListener("themechange", onTheme);
    };
  }, []);

  const fmtBRL = (v) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

  // Paleta fixa para classes Tailwind purged-safe
  const ACCENT = {
    emerald: { value: "text-emerald-700", icon: "text-emerald-600", chip: "text-emerald-700" },
    blue: { value: "text-blue-700", icon: "text-blue-600", chip: "text-blue-700" },
    purple: { value: "text-purple-700", icon: "text-purple-600", chip: "text-purple-700" },
    slate: { value: "text-slate-700", icon: "text-slate-600", chip: "text-slate-700" },
  };

  const cards = useMemo(
    () => [
      {
        label: "Faturamento Hoje",
        value: fmtBRL(summary.revenueToday),
        pct: summary.revenueVarPct ?? 0,
        icon: <DollarSign size={22} className={ACCENT.emerald.icon} />,
        chip: "Vendas",
        to: "/dashboard/orders",
        accent: "emerald",
      },
      {
        label: "Agendamentos Hoje",
        value: summary.appointmentsToday,
        pct: summary.appointmentsVarPct ?? 0,
        icon: <CalendarDays size={22} className={ACCENT.blue.icon} />,
        chip: "Agenda",
        to: "/dashboard/schedule",
        accent: "blue",
      },
      {
        label: "Novos Clientes (Mês)",
        value: summary.newClientsThisMonth,
        pct: summary.clientsVarPct ?? 0,
        icon: <Users size={22} className={ACCENT.purple.icon} />,
        chip: "Clientes",
        to: "/dashboard/clients",
        accent: "purple",
      },
      {
        label: "Taxa de Ocupação",
        value: `${summary.occupationRate}%`,
        pct: summary.occupationRate ?? 0,
        icon: <TrendingUp size={22} className={ACCENT.slate.icon} />,
        chip: "Equipe",
        to: "/dashboard/staff",
        accent: "slate",
      },
    ],
    [summary]
  );

  /* ====================== Chart.js — Bar (Faturamento) ====================== */
  const barCanvasRef = useRef(null);
  const barInstanceRef = useRef(null);

  const barLabels = useMemo(() => asArray(monthly).map((d) => d?.month ?? ""), [monthly]);
  const barValues = useMemo(() => asArray(monthly).map((d) => Number(d?.value || 0)), [monthly]);

  useEffect(() => {
    const ctx = barCanvasRef.current;
    if (!ctx) return;

    if (barInstanceRef.current) {
      barInstanceRef.current.destroy();
      barInstanceRef.current = null;
    }

    const GRID = cssVar("--chart-grid") || "#D6DEE8";
    const TICK = cssVar("--chart-tick") || "#8a99b1";
    const ACCENT = cssVar("--accent-color") || "#7c3aed";

    barInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: barLabels,
        datasets: [
          {
            label: "Faturamento (R$)",
            data: barValues,
            backgroundColor: ACCENT,
            borderRadius: 8,
            barThickness: 30,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: TICK } },
          y: {
            grid: { color: GRID },
            ticks: { color: TICK, callback: (v) => fmtBRL(v) },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: cssVar("--bg-color") || "#fff",
            titleColor: cssVar("--text-color") || "#333",
            bodyColor: cssVar("--text-color") || "#333",
            borderColor: cssVar("--dark-shadow") || "#ccc",
            borderWidth: 1,
            callbacks: { label: (ctx) => fmtBRL(ctx.parsed.y) },
          },
        },
      },
    });

    return () => {
      if (barInstanceRef.current) {
        barInstanceRef.current.destroy();
        barInstanceRef.current = null;
      }
    };
  }, [barLabels, barValues, themeTick]);

  /* ====================== Chart.js — Doughnut (Produtos) ====================== */
  const doughnutRef = useRef(null);
  const doughnutInstanceRef = useRef(null);

  const prodLabels = useMemo(
    () => asArray(summary.productStats).map((p) => p?.label ?? ""),
    [summary.productStats]
  );
  const prodValues = useMemo(
    () => asArray(summary.productStats).map((p) => Number(p?.value || 0)),
    [summary.productStats]
  );

  const baseColors = useMemo(
    () => [
      "rgba(124,58,237,0.9)", // purple
      "rgba(16,185,129,0.9)", // emerald
      "rgba(251,191,36,0.9)", // amber
      "rgba(59,130,246,0.9)", // blue
      "rgba(244,63,94,0.9)",  // rose
      "rgba(14,165,233,0.9)", // sky
    ],
    []
  );

  useEffect(() => {
    const hasData = prodLabels.length > 0 && prodValues.some((v) => v > 0);
    const canvas = doughnutRef.current;

    if (!canvas) return;

    if (doughnutInstanceRef.current) {
      doughnutInstanceRef.current.destroy();
      doughnutInstanceRef.current = null;
    }

    if (!hasData) return;

    const TICK = cssVar("--chart-tick") || "#5a677c";

    const colors = prodLabels.map((_, i) => baseColors[i % baseColors.length]);

    doughnutInstanceRef.current = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: prodLabels,
        datasets: [
          { data: prodValues, backgroundColor: colors, borderWidth: 0 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, color: TICK },
          },
          tooltip: {
            backgroundColor: cssVar("--bg-color") || "#fff",
            titleColor: cssVar("--text-color") || "#333",
            bodyColor: cssVar("--text-color") || "#333",
            borderColor: cssVar("--dark-shadow") || "#ccc",
            borderWidth: 1,
            callbacks: { label: (ctx) => `${ctx.label}: ${fmtBRL(ctx.parsed)}` },
          },
        },
      },
    });

    return () => {
      if (doughnutInstanceRef.current) {
        doughnutInstanceRef.current.destroy();
        doughnutInstanceRef.current = null;
      }
    };
  }, [prodLabels, prodValues, baseColors, themeTick]);

  /* ====================== UI ====================== */
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

  const hasProductStats = prodLabels.length > 0 && prodValues.some((v) => v > 0);

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
        {cards.map((c) => {
          const accent = ACCENT[c.accent];
          const pctColor =
            (c.pct ?? 0) > 0 ? "text-emerald-600" : (c.pct ?? 0) < 0 ? "text-rose-600" : "text-slate-500";

          return (
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

                <div className={`mt-2 text-3xl font-extrabold ${accent.value}`}>{c.value}</div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => navigate(c.to)}
                    className={`neu-chip cursor-pointer px-2 py-1 ${accent.chip} hover:opacity-100 hover:-translate-y-0.5 transition`}
                    aria-label={`Abrir ${c.chip}`}
                    title={`Abrir ${c.chip}`}
                  >
                    {c.chip}
                  </button>
                  <span className={`text-xs ${pctColor}`}>
                    {(c.pct >= 0 ? "+" : "") + (c.pct ?? 0)}%
                  </span>
                </div>
              </NeuCard>
            </motion.div>
          );
        })}
      </div>

      {/* Faturamento mensal (Bar) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <NeuCard className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-color)]">Faturamento Mensal</h2>
          </div>
          <div className="neu-card-inset p-3 rounded-2xl">
            <div className="h-80">
              <canvas ref={barCanvasRef} />
            </div>
          </div>
        </NeuCard>
      </motion.div>

      {/* Estatísticas de Produtos (Doughnut) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <NeuCard className="p-4 md:p-6">
          <h2 className="text-lg font-semibold text-[var(--text-color)] mb-4">
            Estatísticas de Produtos
          </h2>

          {hasProductStats ? (
            <div className="neu-card-inset p-3 rounded-2xl">
              <div className="h-72">
                <canvas ref={doughnutRef} />
              </div>
            </div>
          ) : (
            <div className="neu-card-inset p-6 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="neumorphic-inset p-4 rounded-full mb-3">
                <PackageX className="w-10 h-10 text-[var(--text-color)] opacity-60" />
              </div>
              <p className="text-[var(--text-color)] opacity-80">
                Nenhum dado de estatísticas de produtos disponível.
              </p>
            </div>
          )}
        </NeuCard>
      </motion.div>
    </div>
  );
}
