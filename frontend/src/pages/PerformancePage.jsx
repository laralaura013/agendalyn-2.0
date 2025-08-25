import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, RefreshCw, Users, TrendingUp, BarChart3, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "../services/api";
import NeuCard from "../components/ui/NeuCard";
import NeuButton from "../components/ui/NeuButton";
import "../styles/neumorphism.css";
import Chart from "chart.js/auto";
import { asArray } from "../utils/asArray";

/* ======= Util p/ ler variáveis CSS do tema ======= */
const readCSSVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const useThemeColors = () => {
  const get = () => ({
    text: readCSSVar("--text-color"),
    textMuted: readCSSVar("--text-color-muted"),
    grid: readCSSVar("--chart-grid"),
    accent: readCSSVar("--accent-color"),
  });
  const [colors, setColors] = useState(get);
  useEffect(() => {
    const handler = () => setColors(get());
    window.addEventListener("theme:changed", handler);
    return () => window.removeEventListener("theme:changed", handler);
  }, []);
  return colors;
};

const fmtBRL = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

const iso = (d) => d.toISOString().slice(0, 10);

/** Calcula período anterior com mesmo número de dias (terminando no dia imediatamente anterior a "from") */
function previousRange(fromStr, toStr) {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const days = Math.max(1, Math.floor((to - from) / 86400000) + 1);
  const prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { prevFrom: iso(prevFrom), prevTo: iso(prevTo) };
}

export default function PerformancePage() {
  const theme = useThemeColors();

  /* =================== Filtros =================== */
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [from, setFrom] = useState(iso(firstDay));
  const [to, setTo] = useState(iso(lastDay));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  /* =================== Dados =================== */
  const [overview, setOverview] = useState(null);
  const [overviewPrev, setOverviewPrev] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [projection, setProjection] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const qsNow = `from=${from}&to=${to}&groupBy=day`;
      const { prevFrom, prevTo } = previousRange(from, to);
      const qsPrev = `from=${prevFrom}&to=${prevTo}&groupBy=day`;

      const [
        { data: perfNow },
        { data: perfPrev },
        { data: rows },
        { data: proj },
      ] = await Promise.all([
        api.get(`/analytics/performance?${qsNow}`),
        api.get(`/analytics/performance?${qsPrev}`),
        api.get(`/analytics/barbers?${qsNow}`),
        api.get(`/analytics/projection?months=3`),
      ]);

      setOverview(perfNow);
      setOverviewPrev(perfPrev);
      setBarbers(Array.isArray(rows) ? rows : []);
      setProjection(proj);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || e.message || "Erro ao carregar performance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =================== KPIs =================== */
  const totals = overview?.totals || {};
  const prev = overviewPrev?.totals || {};

  const pct = (a, b) => {
    const A = Number(a || 0), B = Number(b || 0);
    if (B <= 0) return 0;
    return ((A - B) / B) * 100;
  };
  const pp = (a, b) => ((Number(a || 0) - Number(b || 0)) * 100); // pontos percentuais

  const revenueVarPct = pct(totals.revenue, prev.revenue);
  const apptVarPct    = pct(totals.appointments, prev.appointments);
  const occDeltaPP    = pp(totals.ocupacao, prev.ocupacao);
  const nsDeltaPP     = pp(totals.noshowRate, prev.noshowRate);

  const kpis = useMemo(() => {
    return [
      {
        label: "Faturamento",
        value: fmtBRL(totals.revenue || 0),
        chip: "FINANCEIRO",
        icon: <BarChart3 className="text-accent" size={22} />,
        delta: { type: "pct", value: revenueVarPct, isPositiveGood: true },
      },
      {
        label: "Agendamentos",
        value: totals.appointments || 0,
        chip: "AGENDA",
        icon: <CalendarRange className="text-muted-color" size={22} />,
        delta: { type: "pct", value: apptVarPct, isPositiveGood: true },
      },
      {
        label: "Ocupação",
        value: `${Math.round((totals.ocupacao || 0) * 100)}%`,
        chip: "EQUIPE",
        icon: <TrendingUp className="text-emerald-400" size={22} />,
        delta: { type: "pp", value: occDeltaPP, isPositiveGood: true },
      },
      {
        label: "No-show",
        value: `${Math.round((totals.noshowRate || 0) * 100)}%`,
        chip: "QUALIDADE",
        icon: <Zap className="text-rose-400" size={22} />,
        // no-show menor é melhor
        delta: { type: "pp", value: -nsDeltaPP, isPositiveGood: true, invertShown: true, raw: nsDeltaPP },
      },
    ];
  }, [totals, revenueVarPct, apptVarPct, occDeltaPP, nsDeltaPP]);

  /* =================== Timeseries (Chart.js) =================== */
  const revCanvasRef = useRef(null);
  const apptCanvasRef = useRef(null);
  const revChartRef = useRef(null);
  const apptChartRef = useRef(null);

  const labels = asArray(overview?.timeseries).map((d) => d?.key ?? "");
  const revValues = asArray(overview?.timeseries).map((d) => Number(d?.revenue || 0));
  const apptValues = asArray(overview?.timeseries).map((d) => Number(d?.appointments || 0));

  useEffect(() => {
    if (!revCanvasRef.current) return;
    revChartRef.current?.destroy();
    revChartRef.current = new Chart(revCanvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Faturamento (R$)",
            data: revValues,
            backgroundColor: "rgba(124,58,237,0.9)",
            borderRadius: 8,
            barThickness: 26,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.textMuted } },
          y: { grid: { color: theme.grid }, ticks: { color: theme.textMuted, callback: (v)=>fmtBRL(v) } }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => fmtBRL(ctx.parsed.y) } },
        },
      },
    });
    return () => revChartRef.current?.destroy();
  }, [labels, revValues, theme]);

  useEffect(() => {
    if (!apptCanvasRef.current) return;
    apptChartRef.current?.destroy();
    apptChartRef.current = new Chart(apptCanvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Agendamentos",
            data: apptValues,
            fill: false,
            tension: 0.25,
            borderWidth: 3,
            borderColor: "rgba(16,185,129,0.9)",
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.textMuted } },
          y: { grid: { color: theme.grid }, ticks: { color: theme.textMuted } }
        },
        plugins: { legend: { display: false } },
      },
    });
    return () => apptChartRef.current?.destroy();
  }, [labels, apptValues, theme]);

  /* =================== Projeção =================== */
  const projCanvasRef = useRef(null);
  const projChartRef = useRef(null);
  const hist = asArray(projection?.history);
  const forecast = asArray(projection?.forecast);
  const projLabels = [...hist.map(h => h.month), ...forecast.map(f => f.month)];
  const histValues = hist.map(h => Number(h.revenue || 0));
  const forecastValues = forecast.map(f => Number(f.expectedRevenue || 0));
  useEffect(() => {
    if (!projCanvasRef.current) return;
    projChartRef.current?.destroy();
    projChartRef.current = new Chart(projCanvasRef.current, {
      type: "line",
      data: {
        labels: projLabels,
        datasets: [
          {
            label: "Histórico (R$)",
            data: [...histValues, ...Array(forecastValues.length).fill(null)],
            borderColor: "rgba(59,130,246,0.9)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
          },
          {
            label: "Projeção (R$)",
            data: [...Array(histValues.length).fill(null), ...forecastValues],
            borderDash: [6, 6],
            borderColor: "rgba(234,88,12,0.9)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.textMuted } },
          y: { grid: { color: theme.grid }, ticks: { color: theme.textMuted, callback:(v)=>fmtBRL(v) } },
        },
        plugins: { legend: { position: "bottom", labels: { color: theme.textMuted } } },
      },
    });
    return () => projChartRef.current?.destroy();
  }, [projLabels, histValues, forecastValues, theme]);

  /* =================== UI =================== */

  const applyFilters = () => loadAll();

  if (loading) {
    return <p className="text-center py-20 text-muted-color animate-pulse">Carregando performance…</p>;
  }
  if (err) {
    return <p className="text-center py-20 text-danger">{err}</p>;
  }

  const heatmap = overview?.heatmap || []; // 7x24
  const topServices = asArray(overview?.topServices);
  const hasProjection = hist.length + forecast.length > 0;

  const Delta = ({ delta }) => {
    if (!delta) return null;
    const val = Number(delta.value || 0);
    const positive = val > 0;
    const negative = val < 0;

    const good = delta.isPositiveGood ? positive : negative;
    const bad  = delta.isPositiveGood ? negative : positive;

    let cls = "text-muted-color";
    if (good) cls = "text-ok";
    if (bad)  cls = "text-danger";

    const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : null;
    const label =
      delta.type === "pct"
        ? `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`
        : `${val >= 0 ? "+" : ""}${val.toFixed(1)} pp`;

    return (
      <span className={`text-xs inline-flex items-center gap-1 ${cls}`}>
        {Icon ? <Icon size={14} /> : null}
        {delta.invertShown ? `${(delta.raw >= 0 ? "+" : "")}${delta.raw.toFixed(1)} pp` : label}
      </span>
    );
  };

  return (
    <div className="space-y-6 neu-surface">
      {/* Filtros */}
      <NeuCard className="p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-color block mb-1">De</label>
            <div className="neu-card-inset p-2 rounded-xl">
              <input
                type="date" value={from} onChange={(e)=>setFrom(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-color block mb-1">Até</label>
            <div className="neu-card-inset p-2 rounded-xl">
              <input
                type="date" value={to} onChange={(e)=>setTo(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NeuButton onClick={applyFilters}>
              <RefreshCw size={16} className="mr-2" /> Aplicar
            </NeuButton>
          </div>
        </div>
      </NeuCard>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((k) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <NeuCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-base-color">{k.label}</div>
                <div className="neumorphic-inset p-2 rounded-xl">{k.icon}</div>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-base-color">{k.value}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="neu-chip px-2 py-1 text-accent-strong">{k.chip}</span>
                <Delta delta={k.delta} />
              </div>
            </NeuCard>
          </motion.div>
        ))}
      </div>

      {/* Timeseries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NeuCard className="p-4 md:p-6">
          <h2 className="text-lg font-semibold text-base-color mb-4">Faturamento no Período</h2>
          <div className="neu-card-inset p-3 rounded-2xl h-80">
            <canvas ref={revCanvasRef} />
          </div>
        </NeuCard>

        <NeuCard className="p-4 md:p-6">
          <h2 className="text-lg font-semibold text-base-color mb-4">Agendamentos no Período</h2>
          <div className="neu-card-inset p-3 rounded-2xl h-80">
            <canvas ref={apptCanvasRef} />
          </div>
        </NeuCard>
      </div>

      {/* Ranking Barbeiros & Top Serviços */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NeuCard className="p-4 md:p-6">
          <h2 className="text-lg font-semibold text-base-color mb-3">Ranking de Barbeiros</h2>
          <div className="neu-card-inset rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-color">
                  <th className="py-3 pl-3">Profissional</th>
                  <th className="py-3">Receita</th>
                  <th className="py-3">Comp.</th>
                  <th className="py-3">No-show</th>
                  <th className="py-3 pr-3 text-right">Ocup.</th>
                </tr>
              </thead>
              <tbody>
                {barbers.map((b) => (
                  <tr key={b.userId} className="border-t border-transparent">
                    <td className="py-3 pl-3">{b.name || b.userId}</td>
                    <td className="py-3">{fmtBRL(b.revenue)}</td>
                    <td className="py-3">{b.completed}</td>
                    <td className="py-3">{Math.round((b.noshowRate || 0) * 100)}%</td>
                    <td className="py-3 pr-3 text-right">{Math.round((b.occupancy || 0) * 100)}%</td>
                  </tr>
                ))}
                {!barbers.length && (
                  <tr>
                    <td className="py-6 pl-3 text-muted-color" colSpan={5}>Sem dados no período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </NeuCard>

        <NeuCard className="p-4 md:p-6">
          <h2 className="text-lg font-semibold text-base-color mb-3">Top Serviços por Receita</h2>
          <div className="neu-card-inset rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-color">
                  <th className="py-3 pl-3">Serviço</th>
                  <th className="py-3">Receita</th>
                  <th className="py-3">Comp.</th>
                  <th className="py-3 pr-3 text-right">Ticket</th>
                </tr>
              </thead>
              <tbody>
                {topServices.map((s) => (
                  <tr key={s.serviceId} className="border-t border-transparent">
                    <td className="py-3 pl-3">{s.name}</td>
                    <td className="py-3">{fmtBRL(s.revenue)}</td>
                    <td className="py-3">{s.completed}</td>
                    <td className="py-3 pr-3 text-right">{fmtBRL(s.ticketMedio)}</td>
                  </tr>
                ))}
                {!topServices.length && (
                  <tr>
                    <td className="py-6 pl-3 text-muted-color" colSpan={4}>Sem dados no período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </NeuCard>
      </div>

      {/* Heatmap & Projeção */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NeuCard className="p-4 md:p-6">
          <h2 className="text-lg font-semibold text-base-color mb-4">Heatmap de Horários</h2>
          <div className="neu-card-inset p-3 rounded-2xl overflow-x-auto">
            <HeatmapWidget matrix={overview?.heatmap || []} />
          </div>
        </NeuCard>

        <NeuCard className="p-4 md:p-6">
          <h2 className="text-lg font-semibold text-base-color mb-4">Projeção de Receita (3 meses)</h2>
          {hasProjection ? (
            <div className="neu-card-inset p-3 rounded-2xl h-80">
              <canvas ref={projCanvasRef} />
            </div>
          ) : (
            <div className="neu-card-inset p-6 rounded-2xl text-center text-muted-color">
              Sem dados suficientes para projeção.
            </div>
          )}
        </NeuCard>
      </div>

      {/* Insights */}
      <NeuCard className="p-4 md:p-6">
        <h2 className="text-lg font-semibold text-base-color mb-3">Insights</h2>
        <ul className="list-disc pl-5 text-sm text-base-color/90">
          {asArray(overview?.insights).map((i, idx) => (
            <li key={idx} className="mb-1">{i}</li>
          ))}
          {!asArray(overview?.insights).length && (
            <li className="text-muted-color">Sem insights no momento.</li>
          )}
        </ul>
      </NeuCard>
    </div>
  );
}

/* =============== Heatmap inline (neu) =============== */
function HeatmapWidget({ matrix = [] }) {
  // matrix 7x24 (0=dom..6=sáb)
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const maxVal = Math.max(1, ...matrix.flat().map((v) => Number(v || 0)));

  return (
    <div className="inline-grid" style={{ gridTemplateColumns: "64px repeat(24, minmax(16px, 1fr))", gap: 6 }}>
      {/* Header horas */}
      <div />
      {Array.from({ length: 24 }, (_, h) => (
        <div key={`h-${h}`} className="text-[10px] text-muted-color text-center">{h}</div>
      ))}
      {days.map((d, row) => (
        <React.Fragment key={d}>
          <div className="text-xs text-muted-color pr-2 flex items-center justify-end">{d}</div>
          {Array.from({ length: 24 }, (_, col) => {
            const v = Number(matrix?.[row]?.[col] || 0);
            const alpha = v === 0 ? 0.06 : Math.min(0.95, v / maxVal);
            return (
              <div
                key={`${row}-${col}`}
                className="rounded-md neu-heat"
                style={{
                  height: 20,
                  background: `rgba(124,58,237,${alpha})`,
                  boxShadow: v ? "inset 2px 2px 4px rgba(0,0,0,0.15), inset -2px -2px 4px rgba(255,255,255,0.15)" : undefined,
                }}
                title={`${d} ${col}h — ${v} agendamento(s)`}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
