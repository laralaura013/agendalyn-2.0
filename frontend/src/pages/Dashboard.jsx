// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { motion } from "framer-motion";
import {
  DollarSign,
  CalendarDays,
  Users,
  TrendingUp,
  PackageX,
} from "lucide-react";
import Chart from "chart.js/auto";

import NeuCard from "../components/ui/NeuCard";
import NeuButton from "../components/ui/NeuButton";
import "../styles/neumorphism.css";
import { asArray } from "../utils/asArray";

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

  // ---- fetch
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

  const cards = useMemo(
    () => [
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
    ],
    [summary]
  );

  // -------- Chart.js imperativo (sem react-chartjs-2)
  const barCanvasRef = useRef(null);
  const barInstanceRef = useRef(null);

  const barLabels = useMemo(() => asArray(monthly).map((d) => d?.month ?? ""), [monthly]);
  const barValues = useMemo(() => asArray(monthly).map((d) => Number(d?.value || 0)), [monthly]);

  useEffect(() => {
    const ctx = barCanvasRef.current;
    if (!ctx) return;

    // cria gráfico uma única vez
    if (!barInstanceRef.current) {
      barInstanceRef.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: barLabels,
          datasets: [
            {
              label: "Faturamento (R$)",
              data: barValues,
              backgroundColor: "rgba(124, 58, 237, 0.9)", // roxinho consistente com tema
              borderRadius: 8,
              barThickness: 30,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { display: false }, ticks: { color: "#8a99b1" } },
            y: {
              grid: { color: "#D6DEE8" },
              ticks: {
                color: "#8a99b1",
                callback: (v) => fmtBRL(v),
              },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => fmtBRL(ctx.parsed.y),
              },
            },
          },
        },
      });
    } else {
      // atualiza dados quando monthly mudar
      const chart = barInstanceRef.current;
      chart.data.labels = barLabels;
      chart.data.datasets[0].data = barValues;
      chart.update();
    }

    // cleanup ao desmontar
    return () => {
      // não destruir aqui para evitar recriação em navegação interna;
      // somente quando o componente desmontar de fato:
    };
  }, [barLabels, barValues]); // dependências só dos dados

  useEffect(() => {
    return () => {
      // desmontagem real
      if (barInstanceRef.current) {
        barInstanceRef.current.destroy();
        barInstanceRef.current = null;
      }
    };
  }, []);

  // ------------- UI
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

  const hasProductStats = Array.isArray(summary.productStats) && summary.productStats.length > 0;

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
                  {(c.pct >= 0 ? "+" : "") + (c.pct ?? 0)}%
                </span>
              </div>
            </NeuCard>
          </motion.div>
        ))}
      </div>

      {/* Faturamento mensal (Chart.js canvas) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
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

      {/* Estatísticas de Produtos */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <NeuCard className="p-4 md:p-6">
          <h2 className="text-lg font-semibold text-[var(--text-color)] mb-4">
            Estatísticas de Produtos
          </h2>

          {hasProductStats ? (
            // Mantive a área pronta; pode trocar depois por outro gráfico se quiser
            <div className="neu-card-inset p-6 rounded-2xl text-sm text-[var(--text-color)]">
              {asArray(summary.productStats).map((p) => (
                <div key={p.label} className="flex items-center justify-between py-1">
                  <span>{p.label}</span>
                  <span className="font-semibold">{fmtBRL(p.value)}</span>
                </div>
              ))}
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
