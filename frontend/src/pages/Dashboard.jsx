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

/* Util p/ ler variáveis CSS (tema claro/escuro) */
const readCSSVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const useThemeColors = () => {
  const get = () => ({
    text: readCSSVar("--text-color"),
    textMuted: readCSSVar("--text-color-muted"),
    grid: readCSSVar("--chart-grid"),
  });
  const [colors, setColors] = useState(get);

  useEffect(() => {
    const handler = () => setColors(get());
    window.addEventListener("theme:changed", handler);
    return () => window.removeEventListener("theme:changed", handler);
  }, []);

  return colors;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const theme = useThemeColors();

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
    let mounted = true;
    (async () => {
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
          revenueVarPct: sum?.revenueVarPct ?? 0,
          appointmentsVarPct: sum?.appointmentsVarPct ?? 0,
          clientsVarPct: sum?.clientsVarPct ?? 0,
        });

        setMonthly(Array.isArray(rev) ? rev : []);
      } catch (e) {
        console.error(e);
        setErrorMessage(e?.response?.data?.message || e.message || "Erro ao carregar dados.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const fmtBRL = (v) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

  // Paleta fixa para os ícones / valores
  const ACCENT = {
    emerald: { value: "text-emerald-500", icon: "text-emerald-400", chip: "text-emerald-600" },
    blue: { value: "text-sky-400", icon: "text-sky-300", chip: "text-sky-500" },
    purple: { value: "text-accent", icon: "text-accent", chip: "text-accent-strong" },
    slate: { value: "text-base-color", icon: "text-muted-color", chip: "text-base-color" },
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
    const el = barCanvasRef.current;
    if (!el) return;

    if (barInstanceRef.current) {
      barInstanceRef.current.destroy();
      barInstanceRef.current = null;
    }

    barInstanceRef.current = new Chart(el, {
      type: "bar",
      data: {
        labels: barLabels,
        datasets: [
          {
            label: "Faturamento (R$)",
            data: barValues,
            backgroundColor: "rgba(124, 58, 237, 0.9)",
            borderRadius: 8,
            barThickness: 30,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.textMuted } },
          y: {
            grid: { color: theme.grid },
            ticks: { color: theme.textMuted, callback: (v) => fmtBRL(v) },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => fmtBRL(ctx.parsed.y) } },
        },
      },
    });

    return () => {
      barInstanceRef.current?.destroy();
      barInstanceRef.current = null;
    };
  }, [barLabels, barValues, theme]);

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
      "rgba(124,58,237,0.9)",
      "rgba(16,185,129,0.9)",
      "rgba(251,191,36,0.9)",
      "rgba(59,130,246,0.9)",
      "rgba(244,63,94,0.9)",
      "rgba(14,165,233,0.9)",
    ],
    []
  );

  useEffect(() => {
    const hasData = prodLabels.length > 0 && prodValues.some((v) => v > 0);
    const canvas = doughnutRef.current;

    if (!hasData || !canvas) {
      doughnutInstanceRef.current?.destroy();
      doughnutInstanceRef.current = null;
      return;
    }

    if (doughnutInstanceRef.current) {
      doughnutInstanceRef.current.destroy();
      doughnutInstanceRef.current = null;
    }

    const colors = prodLabels.map((_, i) => baseColors[i % baseColors.length]);

    doughnutInstanceRef.current = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: prodLabels,
        datasets: [{ data: prodValues, backgroundColor: colors, borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, color: theme.textMuted },
          },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.label}: ${fmtBRL(ctx.parsed)}` },
          },
        },
      },
    });

    return () => {
      doughnutInstanceRef.current?.destroy();
      doughnutInstanceRef.current = null;
    };
  }, [prodLabels, prodValues, baseColors, theme]);

  /* ====================== UI ====================== */
  if (loading) {
    return (
      <p className="text-center py-20 text-muted-color animate-pulse">
        Carregando painel…
      </p>
    );
  }

  if (errorMessage) {
    return (
      <p className="text-center py-20 text-danger">
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
            (c.pct ?? 0) > 0 ? "text-ok" : (c.pct ?? 0) < 0 ? "text-danger" : "text-muted-color";

          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <NeuCard className="p-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-base-color">{c.label}</div>
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
            <h2 className="text-lg font-semibold text-base-color">Faturamento Mensal</h2>
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
          <h2 className="text-lg font-semibold text-base-color mb-4">Estatísticas de Produtos</h2>

          {hasProductStats ? (
            <div className="neu-card-inset p-3 rounded-2xl">
              <div className="h-72">
                <canvas ref={doughnutRef} />
              </div>
            </div>
          ) : (
            <div className="neu-card-inset p-6 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="neumorphic-inset p-4 rounded-full mb-3">
                <PackageX className="w-10 h-10 text-muted-color" />
              </div>
              <p className="text-base-color opacity-80">
                Nenhum dado de estatísticas de produtos disponível.
              </p>
            </div>
          )}
        </NeuCard>
      </motion.div>
    </div>
  );
}
