// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import Chart from "chart.js/auto";
import {
  DollarSign,
  CalendarDays,
  UserPlus,
  TrendingUp,
  PackageX,
} from "lucide-react";
import "../styles/neumorphism.css";
import { asArray } from "../utils/asArray";

/**
 * Dashboard com visual Neumórfico
 * - Gráfico: Chart.js direto no <canvas> (sem react-chartjs-2) → evita erro #310
 * - Fallbacks de dados se API vier vazia
 */

const Dashboard = () => {
  const [summary, setSummary] = useState({
    revenueToday: 0,
    appointmentsToday: 0,
    newClientsThisMonth: 0,
    occupationRate: 0,
    productStats: [],
    revenueVarPct: 0,
    appointmentsVarPct: 0,
    clientsVarPct: 0,
  });

  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // refs do gráfico
  const barCanvasRef = useRef(null);
  const barInstanceRef = useRef(null);

  /* ---------------- Fetch ---------------- */
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        // summary
        const { data: sum } = await api.get("/dashboard/summary");
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
      } catch (e) {
        console.error("Erro ao buscar summary:", e);
        setErrorMessage(e?.response?.data?.message || e.message || "Erro no summary");
      }

      try {
        // faturamento por mês
        const { data: rev } = await api.get("/dashboard/revenue-by-month");
        setMonthly(Array.isArray(rev) ? rev : []);
      } catch (e) {
        console.warn("Falha em /dashboard/revenue-by-month:", e);
      }

      setLoading(false);
    };
    run();
  }, []);

  /* ---------------- Helpers ---------------- */
  const fmtBRL = (v) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      Number(v || 0)
    );

  // dados fallback (baseados no HTML que você enviou)
  const fallbackLabels = ["Mar", "Abr", "Mai", "Jun", "Jul", "Ago"];
  const fallbackData = [0, 0, 0, 0, 0, 305];

  const barLabels = useMemo(() => {
    const labels = asArray(monthly).map((d) => d?.month).filter(Boolean);
    return labels.length ? labels : fallbackLabels;
  }, [monthly]);

  const barValues = useMemo(() => {
    const values = asArray(monthly).map((d) => Number(d?.value || 0));
    return values.length ? values : fallbackData;
  }, [monthly]);

  // cria/atualiza gráfico
  useEffect(() => {
    if (!barCanvasRef.current) return;

    const ctx = barCanvasRef.current.getContext("2d");
    const dataset = {
      label: "Faturamento (R$)",
      data: barValues,
      backgroundColor: "rgba(53, 94, 59, 0.7)", // --accent-color com alpha
      borderColor: "rgba(53, 94, 59, 1)",
      borderWidth: 1,
      borderRadius: 8,
      barThickness: 20,
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(163, 177, 198, 0.3)", // sombra escura com transparência
          },
          ticks: {
            // não dá pra usar var() direto no canvas; deixamos cor padrão de Chart.js
            callback: (v) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(v),
          },
        },
        x: {
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            label: (ctx) => fmtBRL(ctx.parsed.y),
          },
        },
      },
    };

    // atualiza se já existir
    if (barInstanceRef.current) {
      barInstanceRef.current.data.labels = barLabels;
      barInstanceRef.current.data.datasets[0].data = barValues;
      barInstanceRef.current.update();
      return;
    }

    // cria
    barInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: { labels: barLabels, datasets: [dataset] },
      options,
    });

    // cleanup
    return () => {
      barInstanceRef.current?.destroy();
      barInstanceRef.current = null;
    };
  }, [barLabels, barValues]);

  /* ---------------- UI states ---------------- */
  if (loading) {
    return (
      <p className="text-center py-20 text-[var(--text-color)] opacity-70 animate-pulse">
        Carregando painel…
      </p>
    );
  }

  if (errorMessage) {
    // erro no summary não impede a página de renderizar — mas avisamos
    console.warn("Dashboard summary error:", errorMessage);
  }

  /* ---------------- Cards ---------------- */
  const cards = [
    {
      title: "Faturamento Hoje",
      value: fmtBRL(summary.revenueToday),
      delta: `${summary.revenueVarPct >= 0 ? "+" : ""}${summary.revenueVarPct}% vs ontem`,
      icon: <DollarSign className="w-5 h-5 text-green-500" />,
    },
    {
      title: "Agendamentos Hoje",
      value: summary.appointmentsToday,
      delta: `${summary.appointmentsVarPct >= 0 ? "+" : ""}${
        summary.appointmentsVarPct
      }% vs ontem`,
      icon: <CalendarDays className="w-5 h-5 text-blue-500" />,
    },
    {
      title: "Novos Clientes (Mês)",
      value: summary.newClientsThisMonth,
      delta: `${summary.clientsVarPct >= 0 ? "+" : ""}${summary.clientsVarPct}% vs mês passado`,
      icon: <UserPlus className="w-5 h-5 text-purple-500" />,
    },
    {
      title: "Taxa de Ocupação",
      value: `${Number(summary.occupationRate || 0)}%`,
      delta:
        Number(summary.occupationRate || 0) > 0 ? "Em atendimento" : "Nenhum agendamento",
      icon: <TrendingUp className="w-5 h-5 text-gray-500" />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <header>
        <h1 className="text-3xl font-bold text-[var(--text-color)]">Dashboard</h1>
        <p className="text-md text-[var(--text-color-light)]">
          Bem-vindo de volta! Aqui está um resumo do seu dia.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <div key={c.title} className="neumorphic p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-sm font-semibold text-[var(--text-color-light)]">
                {c.title}
              </span>
              <div className="neumorphic-inset p-2 rounded-full">{c.icon}</div>
            </div>
            <div className="mt-1">
              <h2 className="text-3xl font-bold text-[var(--text-color)]">{c.value}</h2>
              <p
                className={`text-xs font-medium ${
                  String(c.delta).includes("+")
                    ? "text-green-600"
                    : String(c.delta).includes("-")
                    ? "text-red-600"
                    : "text-gray-400"
                }`}
              >
                {c.delta}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Faturamento Mensal */}
        <div className="neumorphic lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)]">
            Faturamento Mensal
          </h3>
          <div className="h-64 md:h-[380px]">
            <canvas ref={barCanvasRef} />
          </div>
        </div>

        {/* Estatísticas de Produtos */}
        <div className="neumorphic p-6">
          <h3 className="text-lg font-semibold mb-4 text-[var(--text-color)]">
            Estatísticas de Produtos
          </h3>

          {/* Se quiser mostrar um donut quando tiver dados, dá pra implementar depois */}
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="neumorphic-inset p-4 rounded-full mb-4">
              <PackageX className="w-10 h-10 text-[var(--text-color-light)]" />
            </div>
            <p className="text-sm text-[var(--text-color-light)]">
              Nenhum dado de estatísticas de produtos disponível.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
