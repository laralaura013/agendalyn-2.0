// src/services/analyticsService.js
import { prisma } from '../prismaClient.js';
import { startOfMonth, endOfMonth, subMonths, addMonths, startOfWeek } from 'date-fns';
import { cacheWrap } from '../utils/simpleCache.js';
import {
  minutesAvailableForRange, keyFor, initHeatmap, upsertHeatmap, sumTo, num, truncateDate
} from '../utils/analyticsUtils.js';

/* =================== Helpers =================== */
function parseRange({ from, to }) {
  const now = new Date();
  const start = from ? new Date(from) : startOfMonth(now);
  const end   = to   ? new Date(to)   : endOfMonth(now);
  return { start, end };
}

// regressão linear simples + ajuste sazonal por mês (média relativa)
function linearRegression(y) {
  const n = y.length;
  if (!n) return { a:0, b:0 };
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  const sumX = xs.reduce((a,b)=>a+b,0);
  const sumY = y.reduce((a,b)=>a+b,0);
  const sumXY = xs.reduce((a,xi,i)=>a + xi*y[i],0);
  const sumX2 = xs.reduce((a,xi)=>a + xi*xi,0);
  const denom = (n*sumX2 - sumX*sumX) || 1;
  const b = (n*sumXY - sumX*sumY) / denom;
  const a = (sumY - b*sumX) / n;
  return { a, b };
}

/* =================== Core =================== */
export async function performanceOverview(params) {
  const keyParams = { ...params };
  return cacheWrap('analytics:performance', keyParams, 60_000, async () => {
    const { companyId, unitId, staffId, serviceId, from, to, groupBy = 'day' } = params;
    const { start, end } = parseRange({ from, to });

    const whereAppt = {
      companyId,
      ...(unitId ? { unitId } : {}),
      ...(staffId ? { staffId } : {}),
      ...(serviceId ? { serviceId } : {}),
      startAt: { gte: start, lte: end },
      status: { in: ['SCHEDULED','COMPLETED','CANCELED','NO_SHOW'] },
    };
    const whereOrder = {
      companyId,
      ...(unitId ? { unitId } : {}),
      ...(staffId ? { staffId } : {}),
      status: 'PAID',
      createdAt: { gte: start, lte: end },
    };

    const [orders, appts, newClientsCount] = await Promise.all([
      prisma.order.findMany({ where: whereOrder, select: { total:true, createdAt:true } }),
      prisma.appointment.findMany({
        where: whereAppt,
        select: { id:true, status:true, startAt:true, endAt:true, price:true, clientId:true, staffId:true, serviceId:true, unitId:true }
      }),
      prisma.client.count({ where: { companyId, createdAt: { gte: start, lte: end } } }),
    ]);

    // Timeseries
    const seriesRevenue = {};
    const seriesAppts = {};
    const heatmap = initHeatmap();

    orders.forEach(o => {
      sumTo(seriesRevenue, keyFor(o.createdAt, groupBy), num(o.total));
    });

    appts.forEach(a => {
      sumTo(seriesAppts, keyFor(a.startAt, groupBy), 1);
      upsertHeatmap(heatmap, a.startAt);
    });

    // Totais e taxas
    const totalRevenue = orders.reduce((s,o)=>s+num(o.total),0);
    const completed = appts.filter(a=>a.status==='COMPLETED').length;
    const scheduled = appts.filter(a=>['SCHEDULED','COMPLETED','NO_SHOW'].includes(a.status)).length;
    const noshow = appts.filter(a=>a.status==='NO_SHOW').length;
    const canceled = appts.filter(a=>a.status==='CANCELED').length;
    const ticketMedio = completed ? totalRevenue / completed : (orders.length ? totalRevenue / orders.length : 0);

    // Ocupação REAL por workSchedule (somatório por staff distinto)
    const staffIds = [...new Set(appts.map(a => a.staffId).filter(Boolean))];
    const staffList = staffIds.length
      ? await prisma.staff.findMany({ where: { id: { in: staffIds }, companyId }, select: { id:true, workSchedule:true } })
      : [];
    const minutesBooked = appts
      .filter(a=>['SCHEDULED','COMPLETED','NO_SHOW'].includes(a.status))
      .reduce((s,a)=> s + Math.max(0, (new Date(a.endAt) - new Date(a.startAt))/60000), 0);

    const minutesAvailable = staffList.reduce((sum, s) =>
      sum + (s.workSchedule ? minutesAvailableForRange(s.workSchedule, start, end) : 0), 0);

    const ocupacao = minutesAvailable > 0 ? (minutesBooked / minutesAvailable) : 0;
    const noshowRate = scheduled > 0 ? (noshow / scheduled) : 0;

    // Serviços (Top)
    const byService = {};
    appts.forEach(a => {
      if (!a.serviceId) return;
      if (!byService[a.serviceId]) byService[a.serviceId] = { serviceId: a.serviceId, revenue:0, completed:0, count:0 };
      byService[a.serviceId].count += 1;
      if (a.status === 'COMPLETED') {
        byService[a.serviceId].completed += 1;
        byService[a.serviceId].revenue += num(a.price);
      }
    });
    const serviceIds = Object.keys(byService);
    if (serviceIds.length) {
      const services = await prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id:true, name:true, category:true } });
      const map = Object.fromEntries(services.map(s=>[s.id, s]));
      Object.values(byService).forEach(s => {
        s.name = map[s.serviceId]?.name || s.serviceId;
        s.category = map[s.serviceId]?.category || '—';
        s.ticketMedio = s.completed ? (s.revenue / s.completed) : 0;
      });
    }
    const topServices = Object.values(byService).sort((a,b)=> b.revenue - a.revenue).slice(0,10);

    // Coortes de retenção (clientes cuja 1ª visita foi no mês X)
    const start12 = subMonths(startOfMonth(new Date()), 11);
    const endNow = endOfMonth(new Date());
    const firstApptByClient = await prisma.appointment.groupBy({
      by: ['clientId'],
      where: { companyId, startAt: { gte: start12, lte: endNow }, status: { in: ['COMPLETED','SCHEDULED','NO_SHOW'] } },
      _min: { startAt: true }
    });
    // index por mês da 1ª visita
    const cohorts = {};
    firstApptByClient.forEach(row => {
      if (!row.clientId || !row._min?.startAt) return;
      const m = row._min.startAt.toISOString().slice(0,7);
      if (!cohorts[m]) cohorts[m] = { month: m, clients: new Set() };
      cohorts[m].clients.add(row.clientId);
    });
    // Retornos em 30/60/90 dias
    // Pega agendamentos após a 1ª visita:
    const clientIds12 = firstApptByClient.map(r=>r.clientId).filter(Boolean);
    const apptsAll = clientIds12.length ? await prisma.appointment.findMany({
      where: { companyId, clientId: { in: clientIds12 }, status: { in: ['COMPLETED','SCHEDULED'] } },
      select: { clientId:true, startAt:true }
    }) : [];

    const cohortArr = Object.values(cohorts).sort((a,b)=> a.month.localeCompare(b.month)).map(c => ({
      month: c.month, size: c.clients.size, r30:0, r60:0, r90:0
    }));

    // mapa 1ª visita
    const firstMap = new Map(firstApptByClient.map(r => [r.clientId, r._min.startAt]));
    // por cliente, verifica se voltou em até 30/60/90d
    const seen = {}; // month -> {r30:Set, r60:Set, r90:Set}
    cohortArr.forEach(c => { seen[c.month] = { r30:new Set(), r60:new Set(), r90:new Set() }; });
    apptsAll.forEach(a => {
      const first = firstMap.get(a.clientId);
      if (!first) return;
      const m = first.toISOString().slice(0,7);
      const diffDays = Math.floor((a.startAt - first)/86400000);
      if (diffDays > 0 && diffDays <= 30) seen[m]?.r30.add(a.clientId);
      if (diffDays > 0 && diffDays <= 60) seen[m]?.r60.add(a.clientId);
      if (diffDays > 0 && diffDays <= 90) seen[m]?.r90.add(a.clientId);
    });
    cohortArr.forEach(c => {
      c.ret30 = c.size ? (seen[c.month].r30.size / c.size) : 0;
      c.ret60 = c.size ? (seen[c.month].r60.size / c.size) : 0;
      c.ret90 = c.size ? (seen[c.month].r90.size / c.size) : 0;
    });

    // Insights (regras)
    const insights = [];
    if (ocupacao < 0.6) insights.push('Ocupação < 60%: crie combos/encaixes e ofereça horários promocionais em períodos ociosos.');
    if (noshowRate > 0.12) insights.push('No-show > 12%: ative confirmação via WhatsApp e considere pré-pagamento para serviços longos.');
    if (ticketMedio < 35) insights.push('Ticket médio baixo: configure upsell (barba premium, hidratação, combo corte+barba).');
    const returning = Math.max(0, appts.map(a=>a.clientId).filter(Boolean).length - newClientsCount);
    if (returning < newClientsCount) insights.push('Mais novos do que recorrentes: dispare campanha de retorno (30 dias sem visitar).');

    // Timeseries ordenada
    const keys = Array.from(new Set([...Object.keys(seriesRevenue), ...Object.keys(seriesAppts)])).sort();
    const timeseries = keys.map(k => ({
      key: k,
      revenue: num(seriesRevenue[k] || 0),
      appointments: num(seriesAppts[k] || 0),
    }));

    return {
      period: { from: start.toISOString(), to: end.toISOString(), groupBy },
      totals: {
        revenue: totalRevenue,
        appointments: scheduled,
        completed, canceled, noshow,
        ticketMedio, ocupacao, noshowRate,
        newClients: newClientsCount,
        returningClients: returning,
      },
      timeseries,
      topServices,
      heatmap,                 // [7][24]
      cohorts: cohortArr,      // [{month,size,ret30,ret60,ret90}]
      insights,
    };
  });
}

export async function barberBreakdown(params) {
  const keyParams = { ...params };
  return cacheWrap('analytics:barbers', keyParams, 60_000, async () => {
    const { companyId, unitId, from, to } = params;
    const { start, end } = parseRange({ from, to });

    const appts = await prisma.appointment.findMany({
      where: {
        companyId,
        ...(unitId ? { unitId } : {}),
        startAt: { gte: start, lte: end },
        status: { in: ['SCHEDULED','COMPLETED','NO_SHOW'] },
      },
      select: { staffId:true, status:true, price:true, startAt:true, endAt:true }
    });

    const byStaff = {};
    appts.forEach(a => {
      if (!a.staffId) return;
      if (!byStaff[a.staffId]) byStaff[a.staffId] = {
        staffId: a.staffId, revenue:0, appointments:0, completed:0, minutesBooked:0, noshow:0
      };
      byStaff[a.staffId].appointments += 1;
      if (a.status === 'COMPLETED') {
        byStaff[a.staffId].completed += 1;
        byStaff[a.staffId].revenue += num(a.price);
      }
      if (a.status === 'NO_SHOW') byStaff[a.staffId].noshow += 1;
      byStaff[a.staffId].minutesBooked += Math.max(0, (new Date(a.endAt) - new Date(a.startAt))/60000);
    });

    // disponibilidade real por staff
    const staffIds = Object.keys(byStaff);
    const staffList = staffIds.length ? await prisma.staff.findMany({
      where: { id: { in: staffIds }, companyId },
      select: { id:true, name:true, workSchedule:true }
    }) : [];
    const nameMap = Object.fromEntries(staffList.map(s=>[s.id, s.name || s.id]));
    const availMap = Object.fromEntries(staffList.map(s=>[
      s.id, minutesAvailableForRange(s.workSchedule, start, end)
    ]));

    const rows = Object.values(byStaff).map(s => {
      const minutesAvailable = availMap[s.staffId] || 0;
      const occupancy = minutesAvailable ? (s.minutesBooked / minutesAvailable) : 0;
      const ticketMedio = s.completed ? (s.revenue / s.completed) : 0;
      const noshowRate = s.appointments ? (s.noshow / s.appointments) : 0;
      return { ...s, name: nameMap[s.staffId], occupancy, ticketMedio, noshowRate };
    });

    return rows.sort((a,b)=> b.revenue - a.revenue);
  });
}

export async function revenueProjection(params) {
  const keyParams = { ...params };
  return cacheWrap('analytics:projection', keyParams, 60_000, async () => {
    const { companyId, unitId, staffId, months = 3 } = params;
    const now = new Date();
    const start = subMonths(startOfMonth(now), 23); // 24 meses p/ sazonalidade simples
    const end   = endOfMonth(now);

    const orders = await prisma.order.findMany({
      where: {
        companyId,
        ...(unitId ? { unitId } : {}),
        ...(staffId ? { staffId } : {}),
        status: 'PAID',
        createdAt: { gte: start, lte: end },
      },
      select: { total:true, createdAt:true }
    });

    const revByYM = {};
    orders.forEach(o => {
      const key = o.createdAt.toISOString().slice(0,7);
      revByYM[key] = (revByYM[key] || 0) + num(o.total);
    });

    // série 24 meses (faltantes = 0)
    const keys = [];
    for (let i=0;i<24;i++){
      const d = addMonths(start, i);
      keys.push(d.toISOString().slice(0,7));
    }
    const y = keys.map(k => num(revByYM[k] || 0));

    // sazonalidade por mês do ano (média relativa)
    const perMonth = Array.from({length:12},()=>[]);
    keys.forEach((k,idx)=>{
      const m = Number(k.slice(5,7)) - 1; // 0..11
      perMonth[m].push(y[idx]);
    });
    const monthFactor = perMonth.map(arr=>{
      const avg = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
      return avg;
    });
    const globalAvg = monthFactor.reduce((a,b)=>a+b,0) / (monthFactor.filter(v=>v>0).length || 1);
    const factors = monthFactor.map(v => (globalAvg>0 ? (v/globalAvg) : 1));

    // tendência
    const { a, b } = linearRegression(y);

    // previsão próximos "months" com fator sazonal
    const forecast = [];
    for (let i=1;i<=months;i++){
      const d = addMonths(startOfMonth(now), i);
      const idx = 24 + i;
      const yhat = Math.max(0, a + b*idx);
      const f = factors[d.getMonth()] || 1;
      forecast.push({ month: d.toISOString().slice(0,7), expectedRevenue: yhat * f });
    }

    return {
      history: keys.map((k,i)=>({ month: k, revenue: y[i] })),
      forecast,
      model: { type: 'linear+seasonality', a, b, factors },
    };
  });
}
