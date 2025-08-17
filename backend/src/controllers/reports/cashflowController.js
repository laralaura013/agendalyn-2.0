// src/controllers/reports/cashflowController.js
import prisma from '../../prismaClient.js';
import { sendCsv } from '../finance/_shared.js';

/* Helpers */
const parseDayBoundary = (dateStr, end = false) => {
  if (!dateStr) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T${end ? '23:59:59.999' : '00:00:00.000'}`);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? undefined : d;
};
const dateKey = (d) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};
const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

/* GET /api/reports/cashflow */
export const cashflow = async (req, res) => {
  try {
    const companyId = req.company?.id;
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const { date_from, date_to, paymentMethodId, openingBalance } = req.query;

    const gte = parseDayBoundary(date_from, false);
    const lte = parseDayBoundary(date_to, true);
    if (!gte || !lte) {
      return res.status(400).json({ message: 'Parâmetros date_from e date_to são obrigatórios (YYYY-MM-DD).' });
    }
    if (gte > lte) {
      return res.status(400).json({ message: 'Intervalo de datas inválido (date_from > date_to).' });
    }
    const opening = toNum(openingBalance, 0);

    // Base dos dias do período (inclusivo)
    const daysMap = {};
    const cursor = new Date(gte);
    while (cursor <= lte) {
      daysMap[dateKey(cursor)] = { income: 0, expense: 0 };
      cursor.setDate(cursor.getDate() + 1);
    }

    // Recebimentos (Receivables RECEIVED)
    const recvWhere = {
      companyId,
      status: 'RECEIVED',
      receivedAt: { gte, lte },
      ...(paymentMethodId ? { paymentMethodId: String(paymentMethodId) } : {}),
    };
    const receivables = await prisma.receivable.findMany({
      where: recvWhere,
      select: { amount: true, receivedAt: true },
    });
    for (const r of receivables) {
      const dk = dateKey(new Date(r.receivedAt));
      if (daysMap[dk]) daysMap[dk].income += Number(r.amount || 0);
    }

    // Pagamentos (Payables PAID)
    const payWhere = {
      companyId,
      status: 'PAID',
      paidAt: { gte, lte },
      ...(paymentMethodId ? { paymentMethodId: String(paymentMethodId) } : {}),
    };
    const payables = await prisma.payable.findMany({
      where: payWhere,
      select: { amount: true, paidAt: true },
    });
    for (const p of payables) {
      const dk = dateKey(new Date(p.paidAt));
      if (daysMap[dk]) daysMap[dk].expense += Number(p.amount || 0);
    }

    // Monta array ordenado + saldos
    const dayKeys = Object.keys(daysMap).sort();
    const days = [];
    let running = opening;
    let totalIncome = 0;
    let totalExpense = 0;

    for (const dk of dayKeys) {
      const income = toNum(daysMap[dk].income, 0);
      const expense = toNum(daysMap[dk].expense, 0);
      const net = income - expense;
      running += net;
      totalIncome += income;
      totalExpense += expense;
      days.push({ date: dk, income, expense, net, balance: running });
    }

    const result = {
      range: { from: date_from, to: date_to },
      openingBalance: opening,
      totals: {
        income: totalIncome,
        expense: totalExpense,
        net: totalIncome - totalExpense,
        closingBalance: running,
      },
      days,
    };

    return res.json(result);
  } catch (e) {
    console.error('Erro cashflow report:', e);
    return res.status(500).json({ message: 'Erro ao calcular fluxo de caixa.' });
  }
};

/* GET /api/reports/cashflow.csv */
export const cashflowCsv = async (req, res) => {
  try {
    // Reaproveita o cálculo acima para manter consistência
    const fakeRes = {
      jsonPayload: null,
      json(obj) { this.jsonPayload = obj; },
      status(code) { this._status = code; return this; },
    };
    await cashflow({ ...req }, fakeRes);
    if (!fakeRes.jsonPayload) {
      return res.status(500).json({ message: 'Não foi possível gerar o CSV.' });
    }
    const data = fakeRes.jsonPayload;
    const rows = (data.days || []).map(d => ({
      date: d.date,
      income: d.income,
      expense: d.expense,
      net: d.net,
      balance: d.balance,
    }));
    sendCsv(res, 'cashflow.csv', rows, ['date','income','expense','net','balance']);
  } catch (e) {
    console.error('Erro cashflow CSV:', e);
    return res.status(500).json({ message: 'Erro ao exportar CSV.' });
  }
};
