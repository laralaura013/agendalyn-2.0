// src/controllers/cashierController.js
import prisma from '../prismaClient.js';
import * as cashbox from '../services/cashboxService.js';

function hasModel(modelName) {
  const m = prisma?.[modelName];
  return !!m && typeof m.findFirst === 'function';
}
const USE_NEW_CASHIER = hasModel('cashier');
const USE_OLD_SESSION = !USE_NEW_CASHIER && hasModel('cashierSession');

function getCompanyId(req) {
  if (req.company?.id) return req.company.id;
  if (req.user?.companyId) return req.user.companyId;
  const fromHeader = req.headers['x-company-id'];
  if (fromHeader) return String(fromHeader);
  if (process.env.COMPANY_ID_FALLBACK) return process.env.COMPANY_ID_FALLBACK;
  return null;
}

async function legacyGetActiveSession(companyId) {
  return prisma.cashierSession.findFirst({
    where: { companyId, status: 'OPEN' },
    include: { transactions: true },
    orderBy: { openedAt: 'desc' },
  });
}

function legacyTotalsFromTransactions(transactions = [], openingBalance = 0) {
  const income = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const expense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  return { income, expense, balance: Number(openingBalance || 0) + income - expense };
}

const parseDayBoundary = (isoOrDateOnly, end = false) => {
  if (!isoOrDateOnly) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateOnly)) {
    return new Date(`${isoOrDateOnly}T${end ? '23:59:59.999' : '00:00:00.000'}`);
  }
  const d = new Date(isoOrDateOnly);
  return isNaN(d.getTime()) ? undefined : d;
};

const ymd = (d) => new Date(d).toISOString().slice(0, 10);

const defaultRange = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return { from, to };
};

/* ===================== STATUS (com logs) ===================== */
export const getCashierStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    console.log('[cashier/status] companyId =', companyId);

    if (!companyId) {
      console.log('[cashier/status] -> UNKNOWN (sem empresa)');
      return res.status(400).json({ status: 'UNKNOWN', message: 'Empresa não identificada.' });
    }

    if (USE_NEW_CASHIER) {
      const statusObj = await cashbox.cashierStatus(null, companyId);
      const status = statusObj?.status ?? (statusObj?.isOpen ? 'OPEN' : 'CLOSED');
      console.log('[cashier/status] (NEW) ->', status);
      return res.json({ ...statusObj, status });
    }

    if (USE_OLD_SESSION) {
      const activeSession = await legacyGetActiveSession(companyId);
      console.log('[cashier/status] (LEGACY) hasActive =', !!activeSession, 'id =', activeSession?.id);
      if (activeSession) {
        const totals = legacyTotalsFromTransactions(
          activeSession.transactions,
          activeSession.openingBalance
        );
        console.log('[cashier/status] -> OPEN');
        return res.status(200).json({
          status: 'OPEN',
          isOpen: true,
          sessionId: activeSession.id,
          openedAt: activeSession.openedAt ?? activeSession.createdAt ?? null,
          totalsToday: { income: totals.income, expense: totals.expense, balance: totals.balance },
        });
      }
      console.log('[cashier/status] -> CLOSED');
      return res.status(200).json({
        status: 'CLOSED',
        isOpen: false,
        sessionId: null,
        openedAt: null,
        totalsToday: { income: 0, expense: 0, balance: 0 },
      });
    }

    console.log('[cashier/status] -> UNKNOWN (sem modelo)');
    return res.status(500).json({
      status: 'UNKNOWN',
      message:
        'Nenhum modelo de caixa encontrado (cashier ou cashierSession). Verifique seu schema.prisma.',
    });
  } catch (error) {
    console.error('Erro ao buscar status do caixa:', error);
    return res.status(200).json({ status: 'UNKNOWN', message: 'Erro ao consultar status do caixa.' });
  }
};

/* ===================== STATEMENT ===================== */
export const getCashierStatement = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const { from: Qfrom, to: Qto } = req.query || {};
    const { from: DF, to: DT } = defaultRange();
    const gte = parseDayBoundary(Qfrom, false) ?? DF;
    const lte = parseDayBoundary(Qto, true) ?? DT;

    const txs = await prisma.transaction.findMany({
      where: { cashierSession: { companyId }, createdAt: { gte, lte } },
      select: { id: true, type: true, amount: true, createdAt: true, sourceType: true, sourceId: true },
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
        acc.income += amt; totalIncome += amt; running += amt;
      } else {
        acc.expense += amt; totalExpense += amt; running -= amt;
      }
      acc.balance = running;
    }

    const byDay = Array.from(byDayMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, v]) => ({ date, income: v.income, expense: v.expense, balance: v.balance }));

    const recvIds = txs.filter(t => t.type==='INCOME' && t.sourceType==='RECEIVABLE' && t.sourceId)
                       .map(t => String(t.sourceId));
    const payIds  = txs.filter(t => t.type==='EXPENSE' && t.sourceType==='PAYABLE' && t.sourceId)
                       .map(t => String(t.sourceId));

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
      recvIds.length ? prisma.receivable.findMany({
        where: { companyId, id: { in: recvIds } },
        select: { id: true, categoryId: true, category: { select: { id: true, name: true} } },
      }) : [],
      payIds.length ? prisma.payable.findMany({
        where: { companyId, id: { in: payIds } },
        select: { id: true, categoryId: true, category: { select: { id: true, name: true} } },
      }) : [],
    ]);

    const bump = (map, catId, catName, amount) => {
      const key = catId || '__OTHER__';
      if (!map.has(key)) map.set(key, { categoryId: catId || null, name: catName || 'Outros', amount: 0 });
      map.get(key).amount += amount;
    };

    const incomeByCategoryMap = new Map();
    const expenseByCategoryMap = new Map();

    for (const r of receivables) {
      bump(incomeByCategoryMap, r.category?.id || r.categoryId || null, r.category?.name || null, txIncomesBySource.get(r.id) || 0);
    }
    for (const p of payables) {
      bump(expenseByCategoryMap, p.category?.id || p.categoryId || null, p.category?.name || null, txExpensesBySource.get(p.id) || 0);
    }

    const incomeByCategory = Array.from(incomeByCategoryMap.values()).sort((a,b)=>b.amount-a.amount);
    const expenseByCategory = Array.from(expenseByCategoryMap.values()).sort((a,b)=>b.amount-a.amount);

    return res.json({
      from: gte,
      to: lte,
      totals: { income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense },
      byDay,
      incomeByCategory,
      expenseByCategory,
    });
  } catch (error) {
    console.error('Erro getCashierStatement:', error);
    return res.status(500).json({ message: 'Erro ao consultar extrato do caixa.' });
  }
};

/* ===================== SUMMARY ===================== */
export const getCashierSummary = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const { from: Qfrom, to: Qto } = req.query || {};
    const { from: DF, to: DT } = defaultRange();
    const gte = parseDayBoundary(Qfrom, false) ?? DF;
    const lte = parseDayBoundary(Qto, true) ?? DT;

    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { cashierSession: { companyId }, createdAt: { gte, lte }, type: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { cashierSession: { companyId }, createdAt: { gte, lte }, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
    ]);
    const totals = {
      income: Number(incomeAgg?._sum?.amount || 0),
      expense: Number(expenseAgg?._sum?.amount || 0),
    };
    totals.balance = totals.income - totals.expense;

    const [rcvAllCount, rcvReceivedAgg, rcvByPM, rcvByCat] = await Promise.all([
      prisma.receivable.count({ where: { companyId, dueDate: { gte, lte } } }),
      prisma.receivable.aggregate({
        where: { companyId, status: 'RECEIVED', receivedAt: { gte, lte } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.receivable.groupBy({
        by: ['paymentMethodId'],
        where: { companyId, status: 'RECEIVED', receivedAt: { gte, lte } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.receivable.groupBy({
        by: ['categoryId'],
        where: { companyId, status: 'RECEIVED', receivedAt: { gte, lte } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const rcvPaidCount = rcvReceivedAgg?._count?._all || 0;
    const rcvPaidAmt = Number(rcvReceivedAgg?._sum?.amount || 0);
    const receivablesKPIs = {
      count: rcvAllCount,
      receivedCount: rcvPaidCount,
      receivedAmount: rcvPaidAmt,
      avgTicket: rcvPaidCount > 0 ? rcvPaidAmt / rcvPaidCount : 0,
      receivedRate: rcvAllCount > 0 ? rcvPaidCount / rcvAllCount : 0,
      byPaymentMethod: [],
      byCategory: [],
    };

    const pmIdsR = rcvByPM.map(x => x.paymentMethodId).filter(Boolean);
    const catIdsR = rcvByCat.map(x => x.categoryId).filter(Boolean);
    const [pmR, catR] = await Promise.all([
      pmIdsR.length ? prisma.paymentMethod.findMany({ where: { companyId, id: { in: pmIdsR } }, select: { id: true, name: true } }) : [],
      catIdsR.length ? prisma.financeCategory.findMany({ where: { companyId, id: { in: catIdsR } }, select: { id: true, name: true } }) : [],
    ]);
    const pmNameR = new Map(pmR.map(p => [p.id, p.name]));
    const catNameR = new Map(catR.map(c => [c.id, c.name]));

    receivablesKPIs.byPaymentMethod = rcvByPM.map(row => ({
      paymentMethodId: row.paymentMethodId || null,
      name: row.paymentMethodId ? (pmNameR.get(row.paymentMethodId) || '—') : 'Sem forma',
      amount: Number(row._sum?.amount || 0),
      count: row._count?._all || 0,
      avg: (row._count?._all || 0) > 0 ? Number(row._sum?.amount || 0) / row._count._all : 0,
    })).sort((a,b)=>b.amount-a.amount);

    receivablesKPIs.byCategory = rcvByCat.map(row => ({
      categoryId: row.categoryId || null,
      name: row.categoryId ? (catNameR.get(row.categoryId) || '—') : 'Sem categoria',
      amount: Number(row._sum?.amount || 0),
      count: row._count?._all || 0,
      avg: (row._count?._all || 0) > 0 ? Number(row._sum?.amount || 0) / row._count._all : 0,
    })).sort((a,b)=>b.amount-a.amount);

    const [payAllCount, payPaidAgg, payByPM, payByCat] = await Promise.all([
      prisma.payable.count({ where: { companyId, dueDate: { gte, lte } } }),
      prisma.payable.aggregate({
        where: { companyId, status: 'PAID', paidAt: { gte, lte } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.payable.groupBy({
        by: ['paymentMethodId'],
        where: { companyId, status: 'PAID', paidAt: { gte, lte } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.payable.groupBy({
        by: ['categoryId'],
        where: { companyId, status: 'PAID', paidAt: { gte, lte } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const payPaidCount = payPaidAgg?._count?._all || 0;
    const payPaidAmt = Number(payPaidAgg?._sum?.amount || 0);
    const payablesKPIs = {
      count: payAllCount,
      paidCount: payPaidCount,
      paidAmount: payPaidAmt,
      avgTicket: payPaidCount > 0 ? payPaidAmt / payPaidCount : 0,
      paidRate: payAllCount > 0 ? payPaidCount / payAllCount : 0,
      byPaymentMethod: [],
      byCategory: [],
    };

    const pmIdsP = payByPM.map(x => x.paymentMethodId).filter(Boolean);
    const catIdsP = payByCat.map(x => x.categoryId).filter(Boolean);
    const [pmP, catP] = await Promise.all([
      pmIdsP.length ? prisma.paymentMethod.findMany({ where: { companyId, id: { in: pmIdsP } }, select: { id: true, name: true } }) : [],
      catIdsP.length ? prisma.financeCategory.findMany({ where: { companyId, id: { in: catIdsP } }, select: { id: true, name: true } }) : [],
    ]);
    const pmNameP = new Map(pmP.map(p => [p.id, p.name]));
    const catNameP = new Map(catP.map(c => [c.id, c.name]));

    payablesKPIs.byPaymentMethod = payByPM.map(row => ({
      paymentMethodId: row.paymentMethodId || null,
      name: row.paymentMethodId ? (pmNameP.get(row.paymentMethodId) || '—') : 'Sem forma',
      amount: Number(row._sum?.amount || 0),
      count: row._count?._all || 0,
      avg: (row._count?._all || 0) > 0 ? Number(row._sum?.amount || 0) / row._count._all : 0,
    })).sort((a,b)=>b.amount-a.amount);

    payablesKPIs.byCategory = payByCat.map(row => ({
      categoryId: row.categoryId || null,
      name: row.categoryId ? (catNameP.get(row.categoryId) || '—') : 'Sem categoria',
      amount: Number(row._sum?.amount || 0),
      count: row._count?._all || 0,
      avg: (row._count?._all || 0) > 0 ? Number(row._sum?.amount || 0) / row._count._all : 0,
    })).sort((a,b)=>b.amount-a.amount);

    return res.json({
      from: gte,
      to: lte,
      totals,
      receivables: receivablesKPIs,
      payables: payablesKPIs,
    });
  } catch (error) {
    console.error('Erro getCashierSummary:', error);
    return res.status(500).json({ message: 'Erro ao consultar resumo do caixa.' });
  }
};

/* ===================== OPEN ===================== */
export const openCashier = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const openingAmount =
      req.body?.openingAmount != null
        ? Number(req.body.openingAmount)
        : Number(req.body?.openingBalance || 0);

    if (USE_NEW_CASHIER) {
      const opened = await cashbox.openCashier(null, companyId, isFinite(openingAmount) ? openingAmount : 0);
      return res.status(201).json({ cashier: opened, status: 'OPEN' });
    }

    if (USE_OLD_SESSION) {
      const existingOpen = await prisma.cashierSession.findFirst({
        where: { companyId, status: 'OPEN' },
      });
      if (existingOpen) {
        return res.status(409).json({ message: 'Já existe um caixa aberto.' });
      }

      const newSession = await prisma.cashierSession.create({
        data: {
          openingBalance: isFinite(openingAmount) ? openingAmount : 0,
          status: 'OPEN',
          companyId,
        },
        include: { transactions: true },
      });

      return res.status(201).json({
        cashier: newSession,
        status: 'OPEN',
        sessionId: newSession.id,
      });
    }

    return res.status(500).json({
      message:
        'Nenhum modelo de caixa encontrado (cashier ou cashierSession). Verifique seu schema.prisma.',
    });
  } catch (error) {
    console.error('--- ERRO AO ABRIR CAIXA ---', error);
    return res.status(500).json({ message: 'Erro ao abrir caixa.' });
  }
};

/* ===================== CLOSE ===================== */
export const closeCashier = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const { closingAmount = null, notes = '' } = req.body || {};

    if (USE_NEW_CASHIER) {
      const closed = await cashbox.closeCashier(null, companyId, { closingAmount, notes });
      if (!closed) {
        return res.status(409).json({ message: 'Não há caixa aberto para fechar.' });
      }
      return res.json({ cashier: closed, status: 'CLOSED' });
    }

    if (USE_OLD_SESSION) {
      const activeSession = await prisma.cashierSession.findFirst({
        where: { companyId, status: 'OPEN' },
        include: { transactions: true },
      });

      if (!activeSession) {
        return res.status(404).json({ message: 'Nenhum caixa aberto para fechar.' });
      }

      const totals = legacyTotalsFromTransactions(
        activeSession.transactions,
        activeSession.openingBalance
      );

      const closedSession = await prisma.cashierSession.update({
        where: { id: activeSession.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closingBalance:
            closingAmount != null && isFinite(Number(closingAmount))
              ? Number(closingAmount)
              : totals.balance,
        },
      });

      return res.status(200).json({
        cashier: closedSession,
        status: 'CLOSED',
        sessionId: null,
      });
    }

    return res.status(500).json({
      message:
        'Nenhum modelo de caixa encontrado (cashier ou cashierSession). Verifique seu schema.prisma.',
    });
  } catch (error) {
    console.error('--- ERRO AO FECHAR CAIXA ---', error);
    return res.status(500).json({ message: 'Erro ao fechar caixa.' });
  }
};

export const getCashierStatusController = getCashierStatus;
export const openCashierController = openCashier;
export const closeCashierController = closeCashier;

export default {
  getCashierStatus,
  getCashierStatement,
  getCashierSummary,
  openCashier,
  closeCashier,
  getCashierStatusController,
  openCashierController,
  closeCashierController,
};
