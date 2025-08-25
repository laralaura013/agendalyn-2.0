// backend/src/services/analyticsService.js
import { prisma } from '../prismaClient.js';
import { startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { cacheWrap } from '../utils/simpleCache.js';
import {
  minutesAvailableForRange, keyFor, initHeatmap, upsertHeatmap, sumTo, num
} from '../utils/analyticsUtils.js';

/* =================== Helpers =================== */
function parseRange({ from, to }) {
  const now = new Date();
  const start = from ? new Date(from) : startOfMonth(now);
  const end   = to   ? new Date(to)   : endOfMonth(now);
  return { start, end };
}

function linearRegression(y) {
  const n = y.length;
  if (!n) return { a: 0, b: 0 };
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
  // params: { companyId, userId?, serviceId?, from?, to?, groupBy? }
  const keyParams = { ...params };
  return cacheWrap('analytics:performance', keyParams, 60_000, async () => {
    const { companyId, userId, serviceId, from, to, groupBy = 'day' } = params;
    const { start, end } = parseRange({ from, to });

    // Pedidos finalizados (receita)
    const whereOrder = {
      companyId,
      status: 'FINISHED',
      createdAt: { gte: start, lte: end },
      ...(userId ? { userId } : {}),
    };

    // Agendamentos (contagens/ocupação/heatmap)
    const whereAppt = {
      companyId,
      start: { gte: start, lte: end },
      status: { in: ['SCHEDULED','COMPLETED','CANCELED','NO_SHOW'] },
      ...(userId ? { userId } : {}),
      ...(serviceId ? { serviceId } : {}),
    };

    const [orders, appts, newClientsCount] = await Promise.all([
      prisma.order.findMany({ where: whereOrder, select: { total:true, createdAt:true } }),
      prisma.appointment.findMany({
        where: whereAppt,
        select: { id:true, status:true, start:true, end:true, clientId:true, userId:true, serviceId:true }
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
      sumTo(seriesAppts, keyFor(a.start, groupBy), 1);
      upsertHeatmap(heatmap, a.start);
    });

    // Totais
    const totalRevenue = orders.reduce((s,o)=>s+num(o.total),0);
    const completed = appts.filter(a=>a.status==='COMPLETED').length;
    const scheduled = appts.filter(a=>['SCHEDULED','COMPLETED','NO_SHOW'].includes(a.status)).length;
    const noshow =   appts.filter(a=>a.status==='NO_SHOW').length;
    const canceled = appts.filter(a=>a.status==='CANCELED').length;
    const ticketMedio = completed > 0
      ? totalRevenue / completed
      : (orders.length ? totalRevenue / orders.length : 0);

    // Ocupação REAL (somatório de todos os profissionais envolvidos no período)
    const userIds = [...new Set(appts.map(a => a.userId).filter(Boolean))];
    const staffList = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds }, companyId },
          select: { id:true, workSchedule:true }
        })
      : [];
    const minutesBooked = appts
      .filter(a=>['SCHEDULED','COMPLETED','NO_SHOW'].includes(a.status))
      .reduce((s,a)=> s + Math.max(0, (new Date(a.end) - new Date(a.start))/60000), 0);

    const minutesAvailable = staffList.reduce((sum, s) =>
      sum + (s.workSchedule ? minutesAvailableForRange(s.workSchedule, start, end) : 0), 0);

    const ocupacao = minutesAvailable > 0 ? (minutesBooked / minutesAvailable) : 0;
    const noshowRate = scheduled > 0 ? (noshow / scheduled) : 0;

    // Top Serviços (receita por OrderItem de pedidos FINISHED no período)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        serviceId: { not: null },
        order: {
          companyId,
          status: 'FINISHED',
          createdAt: { gte: start, lte: end },
          ...(userId ? { userId } : {}),
        }
      },
      select: { serviceId:true, price:true, quantity:true, orderId:true }
    });
    const byServiceRevenue = {};
    orderItems.forEach(oi => {
      const value = num(oi.price) * (oi.quantity || 1);
      byServiceRevenue[oi.serviceId] = (byServiceRevenue[oi.serviceId] || 0) + value;
    });

    // Contagem/conclusão por serviço (a partir dos agendamentos)
    const byServiceCounts = {};
    appts.forEach(a => {
      if (!a.serviceId) return;
      if (!byServiceCounts[a.serviceId]) byServiceCounts[a.serviceId] = { serviceId:a.serviceId, count:0, completed:0 };
      byServiceCounts[a.serviceId].count += 1;
      if (a.status === 'COMPLETED') byServiceCounts[a.serviceId].completed += 1;
    });

    const serviceIds = Object.keys({ ...byServiceRevenue, ...byServiceCounts });
    let servicesMeta = {};
    if (serviceIds.length) {
      const services = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id:true, name:true }
      });
      servicesMeta = Object.fromEntries(services.map(s=>[s.id, s]));
    }

    const topServices = serviceIds.map(id => {
      const r = byServiceRevenue[id] || 0;
      const c = byServiceCounts[id]?.count || 0;
      const comp = byServiceCounts[id]?.completed || 0;
      const ticket = comp ? (r / comp) : 0;
      return {
        serviceId:id,
        name: servicesMeta[id]?.name || id,
        category: '—',
        revenue:r, count:c, completed:comp, ticketMedio: ticket
      };
    }).sort((a,b)=> b.revenue - a.revenue).slice(0,10);

    // Coortes de retenção (1ª visita no mês)
    const start12 = subMonths(startOfMonth(new Date()), 11);
    const endNow = endOfMonth(new Date());
    const firstApptByClient = await prisma.appointment.groupBy({
      by: ['clientId'],
      where: {
        companyId,
        start: { gte: start12, lte: endNow },
        status: { in: ['COMPLETED','SCHEDULED','NO_SHOW'] },
        ...(userId ? { userId } : {}),
      },
      _min: { start: true }
    });

    const cohorts = {};
    firstApptByClient.forEach(row => {
      if (!row.clientId || !row._min?.start) return;
      const m = row._min.start.toISOString().slice(0,7);
      if (!cohorts[m]) cohorts[m] = { month: m, clients: new Set() };
      cohorts[m].clients.add(row.clientId);
    });

    const clientIds12 = firstApptByClient.map(r=>r.clientId).filter(Boolean);
    const apptsAll = clientIds12.length ? await prisma.appointment.findMany({
      where: {
        companyId,
        clientId: { in: clientIds12 },
        status: { in: ['COMPLETED','SCHEDULED'] },
        ...(userId ? { userId } : {}),
      },
      select: { clientId:true, start:true }
    }) : [];

    const cohortArr = Object.values(cohorts)
      .sort((a,b)=> a.month.localeCompare(b.month))
      .map(c => ({ month: c.month, size: c.clients.size, r30:0, r60:0, r90:0 }));

    const firstMap = new Map(firstApptByClient.map(r => [r.clientId, r._min.start]));
    const seen = {};
    cohortArr.forEach(c => { seen[c.month] = { r30:new Set(), r60:new Set(), r90:new Set() }; });
    apptsAll.forEach(a => {
      const first = firstMap.get(a.clientId);
      if (!first) return;
      const m = first.toISOString().slice(0,7);
      const diffDays = Math.floor((a.start - first)/86400000);
      if (diffDays > 0 && diffDays <= 30) seen[m]?.r30.add(a.clientId);
      if (diffDays > 0 && diffDays <= 60) seen[m]?.r60.add(a.clientId);
      if (diffDays > 0 && diffDays <= 90) seen[m]?.r90.add(a.clientId);
    });
    cohortArr.forEach(c => {
      c.ret30 = c.size ? (seen[c.month].r30.size / c.size) : 0;
      c.ret60 = c.size ? (seen[c.month].r60.size / c.size) : 0;
      c.ret90 = c.size ? (seen[c.month].r90.size / c.size) : 0;
    });

    // Insights
    const insights = [];
    const returning = Math.max(0, appts.map(a=>a.clientId).filter(Boolean).length - newClientsCount);
    if ((minutesAvailable || 0) > 0 && ocupacao < 0.6) insights.push('Ocupação < 60%: crie combos/encaixes e horários promocionais em períodos ociosos.');
    if (noshowRate > 0.12) insights.push('No-show > 12%: ative confirmação via WhatsApp e considere pré-pagamento para serviços longos.');
    if (ticketMedio < 35) insights.push('Ticket médio baixo: configure upsell (barba premium, hidratação, combo corte+barba).');
    if (returning < newClientsCount) insights.push('Mais novos do que recorrentes: dispare campanha de retorno (30 dias sem visitar).');

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
      heatmap,
      cohorts: cohortArr,
      insights,
    };
  });
}

export async function barberBreakdown(params) {
  // params: { companyId, from?, to?, userId? }
  const keyParams = { ...params };
  return cacheWrap('analytics:barbers', keyParams, 60_000, async () => {
    const { companyId, from, to, userId } = params;
    const { start, end } = parseRange({ from, to });

    // Apontamentos por profissional
    const appts = await prisma.appointment.findMany({
      where: {
        companyId,
        start: { gte: start, lte: end },
        status: { in: ['SCHEDULED','COMPLETED','NO_SHOW'] },
        ...(userId ? { userId } : {}),
      },
      select: { userId:true, status:true, start:true, end:true }
    });

    const byUser = {};
    appts.forEach(a => {
      if (!a.userId) return;
      if (!byUser[a.userId]) byUser[a.userId] = {
        userId: a.userId, appointments:0, completed:0, minutesBooked:0, noshow:0, revenue:0
      };
      byUser[a.userId].appointments += 1;
      if (a.status === 'COMPLETED') byUser[a.userId].completed += 1;
      if (a.status === 'NO_SHOW')  byUser[a.userId].noshow += 1;
      byUser[a.userId].minutesBooked += Math.max(0, (new Date(a.end) - new Date(a.start))/60000);
    });

    // Receita por profissional via Orders FINISHED
    const orders = await prisma.order.findMany({
      where: {
        companyId,
        status: 'FINISHED',
        createdAt: { gte: start, lte: end },
        ...(userId ? { userId } : {}),
      },
      select: { userId:true, total:true }
    });
    const revenueMap = {};
    orders.forEach(o => {
      if (!o.userId) return;
      revenueMap[o.userId] = (revenueMap[o.userId] || 0) + num(o.total);
    });

    // Disponibilidade & nomes
    const userIds = Object.keys(byUser);
    const staffList = userIds.length ? await prisma.user.findMany({
      where: { id: { in: userIds }, companyId },
      select: { id:true, name:true, workSchedule:true }
    }) : [];
    const nameMap = Object.fromEntries(staffList.map(s=>[s.id, s.name || s.id]));
    const availMap = Object.fromEntries(staffList.map(s=>[
      s.id, minutesAvailableForRange(s.workSchedule, start, end)
    ]));

    let rows = Object.values(byUser).map(s => {
      const minutesAvailable = availMap[s.userId] || 0;
      const occupancy = minutesAvailable ? (s.minutesBooked / minutesAvailable) : 0;
      const revenue = revenueMap[s.userId] || 0;
      const ticketMedio = s.completed ? (revenue / s.completed) : 0;
      const noshowRate = s.appointments ? (s.noshow / s.appointments) : 0;
      return { ...s, name: nameMap[s.userId], revenue, ticketMedio, occupancy, noshowRate };
    });

    // Se veio userId (perfil BARBER/STAFF), restringe ao próprio
    if (userId) {
      rows = rows.filter(r => r.userId === userId);
    }

    return rows.sort((a,b)=> b.revenue - a.revenue);
  });
}

export async function revenueProjection(params) {
  // params: { companyId, userId?, months? }
  const keyParams = { ...params };
  return cacheWrap('analytics:projection', keyParams, 60_000, async () => {
    const { companyId, userId, months = 3 } = params;
    const now = new Date();
    const start = subMonths(startOfMonth(now), 23); // 24 meses
    const end   = endOfMonth(now);

    const orders = await prisma.order.findMany({
      where: {
        companyId,
        status: 'FINISHED',
        createdAt: { gte: start, lte: end },
        ...(userId ? { userId } : {}),
      },
      select: { total:true, createdAt:true }
    });

    const revByYM = {};
    orders.forEach(o => {
      const key = o.createdAt.toISOString().slice(0,7);
      revByYM[key] = (revByYM[key] || 0) + num(o.total);
    });

    const keys = [];
    for (let i=0;i<24;i++){
      const d = addMonths(start, i);
      keys.push(d.toISOString().slice(0,7));
    }
    const y = keys.map(k => num(revByYM[k] || 0));

    // sazonalidade simples por mês
    const perMonth = Array.from({length:12},()=>[]);
    keys.forEach((k,idx)=>{
      const m = Number(k.slice(5,7)) - 1;
      perMonth[m].push(y[idx]);
    });
    const monthFactor = perMonth.map(arr=>{
      const avg = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
      return avg;
    });
    const globalAvg = monthFactor.reduce((a,b)=>a+b,0) / (monthFactor.filter(v=>v>0).length || 1);
    const factors = monthFactor.map(v => (globalAvg>0 ? (v/globalAvg) : 1));

    const { a, b } = linearRegression(y);

    const forecast = [];
    for (let i=1;i<=months;i++){
      const baseIdx = 24 + i;
      const d = addMonths(startOfMonth(now), i);
      const yhat = Math.max(0, a + b*baseIdx);
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
