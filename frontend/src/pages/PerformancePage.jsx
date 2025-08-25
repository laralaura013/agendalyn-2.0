// src/pages/PerformancePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { fetchPerformance, fetchProjection, fetchBarbers } from '../services/analyticsService';
import toast from 'react-hot-toast';
import MetricCard from '../components/performance/MetricCard';
import Heatmap from '../components/performance/Heatmap';

import {
  CalendarDays, Users, TrendingUp, XCircle, Activity, Target, Filter, BarChart3, Clock
} from 'lucide-react';

import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, TimeScale
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, TimeScale);

const toBRL = (v) => Number(v||0).toLocaleString('pt-BR',{ style:'currency', currency:'BRL' });
const pct = (v) => `${(Number(v||0)*100).toFixed(1)}%`;

export default function PerformancePage() {
  const [loading, setLoading] = useState(false);
  const [range, setRange]   = useState({ from: '', to: '' });
  const [filters, setFilters] = useState({ groupBy:'day', unitId:'', staffId:'', serviceId:'' });
  const [tab, setTab] = useState('overview'); // overview | barbers | services | retention | heatmap

  const [perf, setPerf] = useState(null);
  const [proj, setProj] = useState(null);
  const [barbers, setBarbers] = useState([]);

  async function loadAll() {
    try {
      setLoading(true);
      const params = {
        ...filters,
        from: range.from || undefined,
        to: range.to || undefined,
      };
      const [p, f, b] = await Promise.all([
        fetchPerformance(params),
        fetchProjection({ unitId: filters.unitId || undefined, staffId: filters.staffId || undefined, months: 3 }),
        fetchBarbers(params),
      ]);
      setPerf(p); setProj(f); setBarbers(b);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível carregar a performance.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ loadAll(); /* eslint-disable-next-line */ },[]);

  // charts
  const revenueChart = useMemo(() => {
    if (!perf?.timeseries?.length) return null;
    const labels = perf.timeseries.map(t => t.key);
    const data1 = perf.timeseries.map(t => t.revenue);
    const data2 = perf.timeseries.map(t => t.appointments);
    return {
      labels,
      datasets: [
        { label: 'Receita', data: data1 },
        { label: 'Atendimentos', data: data2 },
      ]
    };
  }, [perf]);

  const barberChart = useMemo(() => {
    if (!barbers?.length) return null;
    const top = barbers.slice(0,10);
    return {
      labels: top.map(b => b.name || b.staffId),
      datasets: [
        { label: 'Receita', data: top.map(b => b.revenue) },
        { label: 'Ocupação (%)', data: top.map(b => Math.round((b.occupancy||0)*100)) },
      ]
    };
  }, [barbers]);

  const servicesChart = useMemo(() => {
    const top = perf?.topServices || [];
    if (!top.length) return null;
    return {
      labels: top.map(s => s.name),
      datasets: [
        { label: 'Receita', data: top.map(s => s.revenue) },
        { label: 'Ticket Médio', data: top.map(s => Math.round(s.ticketMedio||0)) },
      ]
    };
  }, [perf]);

  const cohortsTable = useMemo(() => perf?.cohorts || [], [perf]);

  // Tendência rápida (comparação últimos dois pontos)
  const trend = useMemo(() => {
    if (!perf?.timeseries?.length) return null;
    const arr = perf.timeseries;
    const last = arr[arr.length-1]?.revenue || 0;
    const prev = arr[arr.length-2]?.revenue || 0;
    const delta = last - prev;
    const rate = prev ? (delta/prev) : 0;
    return { last, delta, rate };
  }, [perf]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-500" />
          <h1 className="text-2xl font-semibold">Performance</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setTab('overview')} className={`px-3 py-1 rounded ${tab==='overview'?'bg-purple-600 text-white':'bg-zinc-200 dark:bg-zinc-800'}`}>Visão geral</button>
          <button onClick={()=>setTab('barbers')}  className={`px-3 py-1 rounded ${tab==='barbers'?'bg-purple-600 text-white':'bg-zinc-200 dark:bg-zinc-800'}`}>Barbeiros</button>
          <button onClick={()=>setTab('services')} className={`px-3 py-1 rounded ${tab==='services'?'bg-purple-600 text-white':'bg-zinc-200 dark:bg-zinc-800'}`}>Serviços</button>
          <button onClick={()=>setTab('retention')}className={`px-3 py-1 rounded ${tab==='retention'?'bg-purple-600 text-white':'bg-zinc-200 dark:bg-zinc-800'}`}>Retenção</button>
          <button onClick={()=>setTab('heatmap')}  className={`px-3 py-1 rounded ${tab==='heatmap'?'bg-purple-600 text-white':'bg-zinc-200 dark:bg-zinc-800'}`}>Heatmap</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-white/60 dark:bg-zinc-900/60 rounded-xl p-3 shadow-sm mb-4">
        <div>
          <label className="text-sm">De</label>
          <input type="date" value={range.from} onChange={e=>setRange(r=>({...r, from:e.target.value}))}
            className="w-full rounded-md border px-2 py-1" />
        </div>
        <div>
          <label className="text-sm">Até</label>
          <input type="date" value={range.to} onChange={e=>setRange(r=>({...r, to:e.target.value}))}
            className="w-full rounded-md border px-2 py-1" />
        </div>
        <div>
          <label className="text-sm">Agrupar</label>
          <select value={filters.groupBy} onChange={e=>setFilters(f=>({...f, groupBy:e.target.value}))}
            className="w-full rounded-md border px-2 py-1">
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </select>
        </div>
        <div>
          <label className="text-sm">Unidade</label>
          <input placeholder="unitId" value={filters.unitId} onChange={e=>setFilters(f=>({...f, unitId:e.target.value}))}
            className="w-full rounded-md border px-2 py-1" />
        </div>
        <div>
          <label className="text-sm">Profissional</label>
          <input placeholder="staffId" value={filters.staffId} onChange={e=>setFilters(f=>({...f, staffId:e.target.value}))}
            className="w-full rounded-md border px-2 py-1" />
        </div>
        <div className="flex items-end">
          <button onClick={loadAll} disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 text-white px-3 py-2 hover:bg-purple-700 disabled:opacity-60">
            <Filter className="w-4 h-4" /> Aplicar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <MetricCard icon={<TrendingUp />} label="Faturamento" value={toBRL(perf?.totals?.revenue)} hint={trend ? `${trend.delta>=0?'+':''}${toBRL(trend.delta)} (${(trend.rate*100).toFixed(1)}%) vs período anterior` : ''} />
        <MetricCard icon={<Activity />}    label="Ocupação" value={pct(perf?.totals?.ocupacao)} />
        <MetricCard icon={<XCircle />}     label="No-show"   value={pct(perf?.totals?.noshowRate)} />
        <MetricCard icon={<Users />}       label="Novos"     value={perf?.totals?.newClients ?? 0} />
        <MetricCard icon={<Users />}       label="Recorrentes" value={perf?.totals?.returningClients ?? 0} />
        <MetricCard icon={<CalendarDays />}label="Ticket médio" value={toBRL(perf?.totals?.ticketMedio)} />
      </div>

      {/* Conteúdo por aba */}
      {tab === 'overview' && (
        <>
          <Card title="Receita x Atendimentos">
            {revenueChart ? <Line data={revenueChart} /> : <Empty />}
          </Card>

          <Card title="Projeção de Receita (próx. 3 meses)">
            {proj?.forecast?.length ? (
              <ul className="text-sm">
                {proj.forecast.map(f=>(
                  <li key={f.month} className="py-1 flex justify-between">
                    <span>{f.month}</span>
                    <span className="font-medium">{toBRL(f.expectedRevenue)}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty />}
          </Card>

          <Card title="Diagnóstico & Ações sugeridas">
            {perf?.insights?.length ? (
              <ul className="list-disc pl-5 space-y-1">
                {perf.insights.map((i,idx)=> <li key={idx}>{i}</li>)}
              </ul>
            ) : <p className="text-sm opacity-70">Sem alertas no período.</p>}
          </Card>
        </>
      )}

      {tab === 'barbers' && (
        <Card title="Ranking de Barbeiros (Top 10)">
          {barberChart ? <Bar data={barberChart} /> : <Empty />}
          {!!barbers.length && (
            <div className="mt-4 overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Profissional</th>
                    <th>Receita</th>
                    <th>Atend.</th>
                    <th>Ticket</th>
                    <th>Ocupação</th>
                    <th>No-show</th>
                  </tr>
                </thead>
                <tbody>
                  {barbers.map(b=>(
                    <tr key={b.staffId} className="border-b last:border-0">
                      <td className="py-2">{b.name}</td>
                      <td>{toBRL(b.revenue)}</td>
                      <td>{b.appointments}</td>
                      <td>{toBRL(b.ticketMedio)}</td>
                      <td>{pct(b.occupancy)}</td>
                      <td>{pct(b.noshowRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'services' && (
        <Card title="Top Serviços (receita & ticket)">
          {servicesChart ? <Bar data={servicesChart} /> : <Empty />}
          {!!perf?.topServices?.length && (
            <div className="mt-4 overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Serviço</th>
                    <th>Categoria</th>
                    <th>Receita</th>
                    <th>Concluídos</th>
                    <th>Agendados</th>
                    <th>Ticket Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.topServices.map(s=>(
                    <tr key={s.serviceId} className="border-b last:border-0">
                      <td className="py-2">{s.name}</td>
                      <td>{s.category}</td>
                      <td>{toBRL(s.revenue)}</td>
                      <td>{s.completed}</td>
                      <td>{s.count}</td>
                      <td>{toBRL(s.ticketMedio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'retention' && (
        <Card title="Coortes de Retenção (1ª visita por mês)">
          {!!cohortsTable.length ? (
            <div className="overflow-auto">
              <table className="min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Mês 1ª visita</th>
                    <th>Clientes</th>
                    <th>Retenção 30d</th>
                    <th>Retenção 60d</th>
                    <th>Retenção 90d</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortsTable.map(c=>(
                    <tr key={c.month} className="border-b last:border-0">
                      <td className="py-2">{c.month}</td>
                      <td>{c.size}</td>
                      <td>{pct(c.ret30)}</td>
                      <td>{pct(c.ret60)}</td>
                      <td>{pct(c.ret90)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty />}
        </Card>
      )}

      {tab === 'heatmap' && (
        <Card title="Heatmap de Atendimentos por Hora x Dia">
          {perf?.heatmap ? <Heatmap data={perf.heatmap} /> : <Empty />}
          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2">
            <Clock className="w-4 h-4" /> <span>Quanto mais escuro, maior o volume de atendimentos.</span>
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border mb-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-purple-500" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}
function Empty(){ return <div className="text-sm opacity-70">Sem dados para o período.</div>; }
