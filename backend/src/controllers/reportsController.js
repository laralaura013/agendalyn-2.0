// src/controllers/reportsController.js
import prisma from '../prismaClient.js';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

/* ============================================================
 * Helpers comuns
 * ============================================================ */
const ymd = (d) => new Date(d).toISOString().slice(0, 10);

const parseDayBoundary = (isoOrDateOnly, end = false) => {
  if (!isoOrDateOnly) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateOnly)) {
    return new Date(`${isoOrDateOnly}T${end ? '23:59:59.999' : '00:00:00.000'}`);
  }
  const d = new Date(isoOrDateOnly);
  return isNaN(d.getTime()) ? undefined : d;
};

const defaultMonthToDate = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return { from, to };
};

/* ============================================================
 * GET /api/reports/revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Retorna: { totalRevenue, revenueByStaff:[{name,Faturamento}], revenueByService:[{name,value}] }
 * ============================================================ */
export const getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const companyId = req.company.id;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'As datas de início e fim são obrigatórias.' });
    }

    const finishedOrders = await prisma.order.findMany({
      where: {
        companyId,
        status: 'FINISHED',
        updatedAt: {
          gte: startOfDay(parseISO(startDate)),
          lte: endOfDay(parseISO(endDate)),
        },
      },
      include: {
        items: { include: { service: true, product: true } },
        user: true,
      },
    });

    const totalRevenue = finishedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    const revenueByStaffMap = {};
    const revenueByServiceMap = {};

    for (const order of finishedOrders) {
      if (order.user) {
        const k = order.user.name || '—';
        revenueByStaffMap[k] = (revenueByStaffMap[k] || 0) + Number(order.total || 0);
      }
      for (const item of order.items || []) {
        if (item.service) {
          const k = item.service.name || '—';
          revenueByServiceMap[k] =
            (revenueByServiceMap[k] || 0) + Number(item.price || 0) * Number(item.quantity || 1);
        }
      }
    }

    const revenueByStaff = Object.entries(revenueByStaffMap).map(([name, Faturamento]) => ({
      name,
      Faturamento,
    }));
    const revenueByService = Object.entries(revenueByServiceMap).map(([name, value]) => ({
      name,
      value,
    }));

    return res.status(200).json({ totalRevenue, revenueByStaff, revenueByService });
  } catch (error) {
    console.error('ERRO getRevenueReport:', error);
    return res.status(500).json({ message: 'Erro ao gerar relatório.' });
  }
};

/* ============================================================
 * GET /api/reports/birthdays
 *  - month=1..12  OU  date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
 *  - q= (nome)
 * Retorna: [{ id, name, birthDate, phone, email, age, birthdayDay, upcomingBirthday, daysToBirthday }]
 * ============================================================ */
export const getBirthdaysReport = async (req, res) => {
  try {
    const companyId = req.company.id;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const q = req.query.q?.trim() || '';
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    if (month && (month < 1 || month > 12)) {
      return res.status(400).json({ message: 'month deve ser 1..12.' });
    }

    const clients = await prisma.client.findMany({
      where: {
        companyId,
        birthDate: { not: null },
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      select: { id: true, name: true, birthDate: true, phone: true, email: true },
    });

    const today = new Date();
    const startToday = startOfDay(today);

    const toMMDD = (d) => {
      const m = `${d.getMonth() + 1}`.padStart(2, '0');
      const day = `${d.getDate()}`.padStart(2, '0');
      return `${m}-${day}`;
    };

    const parseYMD = (s) => {
      const d = new Date(`${s}T00:00:00`);
      return isNaN(d.getTime()) ? null : d;
    };

    const fromDate = dateFrom ? parseYMD(dateFrom) : null;
    const toDate = dateTo ? parseYMD(dateTo) : null;

    const fromMMDD = fromDate ? toMMDD(fromDate) : null;
    const toMMDDv = toDate ? toMMDD(toDate) : null;

    const inRangeMMDD = (mmdd) => {
      if (month) {
        return Number(mmdd.slice(0, 2)) === month;
      }
      if (fromMMDD && toMMDDv) {
        if (fromMMDD <= toMMDDv) return mmdd >= fromMMDD && mmdd <= toMMDDv;
        return mmdd >= fromMMDD || mmdd <= toMMDDv; // cruza o ano
      }
      return true;
    };

    const calcUpcoming = (birthDate) => {
      const b = new Date(birthDate);
      const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
      if (next < startToday) next.setFullYear(next.getFullYear() + 1);
      return next;
    };

    const calcAge = (birthDate, ref = today) => {
      const b = new Date(birthDate);
      let age = ref.getFullYear() - b.getFullYear();
      const hasHad =
        ref.getMonth() > b.getMonth() ||
        (ref.getMonth() === b.getMonth() && ref.getDate() >= b.getDate());
      if (!hasHad) age -= 1;
      return age;
    };

    const result = clients
      .map((c) => {
        const bd = new Date(c.birthDate);
        return { ...c, _mmdd: toMMDD(bd) };
      })
      .filter((c) => inRangeMMDD(c._mmdd))
      .map((c) => {
        const upcoming = calcUpcoming(c.birthDate);
        const daysTo = Math.ceil((upcoming - startToday) / (1000 * 60 * 60 * 24));
        const bd = new Date(c.birthDate);
        const birthdayDay = `${String(bd.getDate()).padStart(2, '0')}/${String(
          bd.getMonth() + 1
        ).padStart(2, '0')}`;
        return {
          id: c.id,
          name: c.name,
          birthDate: c.birthDate,
          phone: c.phone,
          email: c.email,
          age: calcAge(c.birthDate, today),
          birthdayDay,
          upcomingBirthday: upcoming.toISOString(),
          daysToBirthday: daysTo,
        };
      })
      .sort((a, b) => a.daysToBirthday - b.daysToBirthday);

    return res.json(result);
  } catch (e) {
    console.error('Erro getBirthdaysReport:', e);
    return res.status(500).json({ message: 'Erro ao gerar relatório de aniversariantes.' });
  }
};

/* ============================================================
 * GET /api/reports/cashflow?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
 * Retorna:
 * {
 *   from, to,
 *   totals: { income, expense, balance },
 *   byDay: [{date, income, expense, balance}],
 *   incomeByCategory: [{categoryId,name,amount}],
 *   expenseByCategory: [{categoryId,name,amount}]
 * }
 * ============================================================ */
export const getCashflowReport = async (req, res) => {
  try {
    const companyId = req.company.id;
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const { date_from, date_to } = req.query || {};
    const { from: DF, to: DT } = defaultMonthToDate();
    const gte = parseDayBoundary(date_from, false) ?? DF;
    const lte = parseDayBoundary(date_to, true) ?? DT;

    const txs = await prisma.transaction.findMany({
      where: { cashierSession: { companyId }, createdAt: { gte, lte } },
      select: {
        id: true,
        type: true,
        amount: true,
        createdAt: true,
        sourceType: true,
        sourceId: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const byDayMap = new Map();
    let running = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    for (const t of txs) {
      const key = ymd(t.createdAt);
      if (!byDayMap.has(key)) byDayMap.set(key, { income: 0, expense: 0, balance: 0 });
      const acc = byDayMap.get(key);
      const amt = Number(t.amount || 0);
      if (t.type === 'INCOME') {
        acc.income += amt;
        totalIncome += amt;
        running += amt;
      } else {
        acc.expense += amt;
        totalExpense += amt;
        running -= amt;
      }
      acc.balance = running;
    }

    const byDay = Array.from(byDayMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, v]) => ({ date, income: v.income, expense: v.expense, balance: v.balance }));

    // categorias: busca receivables/payables referenciados
    const recvIds = txs
      .filter((t) => t.type === 'INCOME' && t.sourceType === 'RECEIVABLE' && t.sourceId)
      .map((t) => String(t.sourceId));
    const payIds = txs
      .filter((t) => t.type === 'EXPENSE' && t.sourceType === 'PAYABLE' && t.sourceId)
      .map((t) => String(t.sourceId));

    const txIncomesBySource = new Map();
    const txExpensesBySource = new Map();
    for (const t of txs) {
      const key = t.sourceId ? String(t.sourceId) : null;
      const amt = Number(t.amount || 0);
      if (!key) continue;
      if (t.type === 'INCOME' && t.sourceType === 'RECEIVABLE') {
        txIncomesBySource.set(key, (txIncomesBySource.get(key) || 0) + amt);
      } else if (t.type === 'EXPENSE' && t.sourceType === 'PAYABLE') {
        txExpensesBySource.set(key, (txExpensesBySource.get(key) || 0) + amt);
      }
    }

    const [receivables, payables] = await Promise.all([
      recvIds.length
        ? prisma.receivable.findMany({
            where: { companyId, id: { in: recvIds } },
            select: { id: true, categoryId: true, category: { select: { id: true, name: true } } },
          })
        : [],
      payIds.length
        ? prisma.payable.findMany({
            where: { companyId, id: { in: payIds } },
            select: { id: true, categoryId: true, category: { select: { id: true, name: true } } },
          })
        : [],
    ]);

    const bump = (map, catId, catName, amount) => {
      const key = catId || '__OTHER__';
      if (!map.has(key))
        map.set(key, { categoryId: catId || null, name: catName || 'Outros', amount: 0 });
      map.get(key).amount += amount;
    };

    const incomeByCategoryMap = new Map();
    const expenseByCategoryMap = new Map();

    for (const r of receivables) {
      bump(
        incomeByCategoryMap,
        r.category?.id || r.categoryId || null,
        r.category?.name || null,
        txIncomesBySource.get(r.id) || 0
      );
    }
    for (const p of payables) {
      bump(
        expenseByCategoryMap,
        p.category?.id || p.categoryId || null,
        p.category?.name || null,
        txExpensesBySource.get(p.id) || 0
      );
    }

    const incomeByCategory = Array.from(incomeByCategoryMap.values()).sort(
      (a, b) => b.amount - a.amount
    );
    const expenseByCategory = Array.from(expenseByCategoryMap.values()).sort(
      (a, b) => b.amount - a.amount
    );

    return res.json({
      from: gte,
      to: lte,
      totals: { income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense },
      byDay,
      incomeByCategory,
      expenseByCategory,
    });
  } catch (error) {
    console.error('Erro getCashflowReport:', error);
    return res.status(500).json({ message: 'Erro ao consultar fluxo de caixa.' });
  }
};

/* ============================================================
 * GET /api/reports/cashflow.csv?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
 * CSV: Data;Entradas;Saídas;Saldo acumulado
 * ============================================================ */
export const cashflowCsv = async (req, res) => {
  try {
    // Reaproveita o mesmo cálculo do JSON
    const fauxRes = {
      _json: null,
      json(payload) {
        this._json = payload;
        return payload;
      },
      status() {
        return this; // no-op
      },
    };
    await getCashflowReport(req, fauxRes);

    const data = fauxRes._json || {};
    const rows = [['Data;Entradas;Saídas;Saldo acumulado']];
    for (const row of data.byDay || []) {
      const inc = Number(row.income || 0).toFixed(2).replace('.', ',');
      const exp = Number(row.expense || 0).toFixed(2).replace('.', ',');
      const bal = Number(row.balance || 0).toFixed(2).replace('.', ',');
      rows.push([`${row.date};${inc};${exp};${bal}`]);
    }
    const csv = rows.map((r) => (Array.isArray(r) ? r.join('') : r)).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cashflow.csv"');
    return res.status(200).send(csv);
  } catch (e) {
    console.error('Erro cashflowCsv:', e);
    return res.status(500).json({ message: 'Erro ao gerar CSV do fluxo de caixa.' });
  }
};

export default {
  getRevenueReport,
  getBirthdaysReport,
  getCashflowReport,
  cashflowCsv,
};
