// src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { Bar, Doughnut } from "react-chartjs-2";
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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const Dashboard = () => {
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
    async function load() {
      try {
        const { data: sum } = await api.get("/dashboard/summary");
        setSummary({
          revenueToday: sum.revenueToday ?? 0,
          appointmentsToday: sum.appointmentsToday ?? 0,
          newClientsThisMonth: sum.newClientsThisMonth ?? 0,
          occupationRate: sum.occupationRate ?? 0,
          productStats: Array.isArray(sum.productStats) ? sum.productStats : [],
        });
      } catch (e) {
        console.error("Erro ao buscar summary:", e);
        setErrorMessage(e?.response?.data?.message || e.message);
      }

      try {
        const { data: rev } = await api.get("/dashboard/revenue-by-month");
        setMonthly(Array.isArray(rev) ? rev : []);
      } catch (e) {
        console.warn("Falha em /dashboard/revenue-by-month:", e);
      }

      setLoading(false);
    }

    load();
  }, []);

  const fmtBRL = (v) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

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

  const barData = useMemo(
    () => ({
      labels: asArray(monthly).map((d) => d.month),
      datasets: [
        {
          label: "Faturamento",
          data: asArray(monthly).map((d) => d.value),
          backgroundColor: "#7C3AED",
          borderRadius: 8,
          barThickness: 30,
        },
      ],
    }),
    [monthly]
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
      },
    }),
    []
  );

  const hasProductStats = Array.isArray(summary.productStats) && summary.productStats.length > 0;

  const doughnutData = {
    labels: asArray(summary.productStats).map((p) => p.label),
    datasets: [
      {
        data: asArray(summary.productStats).map((p) => p.value),
        backgroundColor: ["#7C3AED", "#FBBF24", "#10B981"],
      },
    ],
  };

  const doughnutOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, padding: 16 } },
    },
  };

  return (
    <div className="space-y-6 neu-surface">
      {/* Ações rápidas */}
      <div className="flex flex-wrap items-center gap-3">
        <NeuButton variant="primary" onClick={() => (window.location.href = "/dashboard/schedule")}>
          + Novo agendamento
        </NeuButton>
        <NeuButton onClick={() => (window.location.href = "/dashboard/orders")}>
          Abrir comanda
        </NeuButton>
        <NeuButton onClick={() => (window.location.href = "/dashboard/cashier")}>
          Ir ao Caixa
        </NeuButton>
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
                  {(c.pct >= 0 ? "+" : "") + c.pct}%
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
              <Bar data={barData} options={barOptions} />
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
          {hasProductStats ? (
            <div className="neu-card-inset p-3 rounded-2xl">
              <div className="h-72">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </div>
          ) : (
            <p className="text-center text-[var(--text-color)] opacity-80">
              Nenhum dado de estatísticas de produtos disponível.
            </p>
          )}
        </NeuCard>
      </motion.div>
    </div>
  );
};

export default Dashboard;
