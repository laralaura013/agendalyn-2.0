// src/controllers/cashierController.js
import prisma from '../prismaClient.js';
import * as cashbox from '../services/cashboxService.js';

/* ===========================================================
 *  Detecção de modelo disponível (LEGADO x NOVO)
 * =========================================================== */
function hasModel(modelName) {
  const m = prisma?.[modelName];
  return !!m && typeof m.findFirst === 'function';
}
const USE_NEW_CASHIER = hasModel('cashier'); // ambiente novo (serviço cashbox)
const USE_OLD_SESSION = !USE_NEW_CASHIER && hasModel('cashierSession'); // ambiente legado

/* ===========================================================
 *  Helpers
 * =========================================================== */
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

/* ===========================================================
 *  STATUS
 * =========================================================== */
export const getCashierStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ status: 'UNKNOWN', message: 'Empresa não identificada.' });
    }

    if (USE_NEW_CASHIER) {
      const statusObj = await cashbox.cashierStatus(null, companyId);
      const status = statusObj?.status ?? (statusObj?.isOpen ? 'OPEN' : 'CLOSED');
      return res.json({ ...statusObj, status });
    }

    if (USE_OLD_SESSION) {
      const active = await legacyGetActiveSession(companyId);
      if (active) {
        const totals = legacyTotalsFromTransactions(active.transactions, active.openingBalance);
        return res.status(200).json({
          status: 'OPEN',
          isOpen: true,
          sessionId: active.id,
          openedAt: active.openedAt ?? active.createdAt ?? null,
          openingBalance: Number(active.openingBalance || 0),
          totalsToday: { income: totals.income, expense: totals.expense, balance: totals.balance },
        });
      }
      return res.status(200).json({
        status: 'CLOSED',
        isOpen: false,
        sessionId: null,
        openedAt: null,
        totalsToday: { income: 0, expense: 0, balance: 0 },
      });
    }

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

/* ===========================================================
 *  STATEMENT (por dia e por categoria) — compatível com legado
 * =========================================================== */
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
        txIncomesBySource.get(r.id) || 0,
      );
    }
    for (const p of payables) {
      bump(
        expenseByCategoryMap,
        p.category?.id || p.categoryId || null,
        p.category?.name || null,
        txExpensesBySource.get(p.id) || 0,
      );
    }

    const incomeByCategory = Array.from(incomeByCategoryMap.values()).sort((a, b) => b.amount - a.amount);
    const expenseByCategory = Array.from(expenseByCategoryMap.values()).sort((a, b) => b.amount - a.amount);

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

/* ===========================================================
 *  SUMMARY (formato esperado pelo frontend novo)
 *  Retorna: { entries, exits, balance, byMethod[], byHour[] }
 * =========================================================== */
export const getCashierSummary = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    // Suporta ?date=YYYY-MM-DD ou ?from&to. Prioriza "date".
    const { date, from: Qfrom, to: Qto } = req.query || {};
    let gte, lte;
    if (date) {
      gte = parseDayBoundary(date, false);
      lte = parseDayBoundary(date, true);
    } else {
      const { from: DF, to: DT } = defaultRange();
      gte = parseDayBoundary(Qfrom, false) ?? DF;
      lte = parseDayBoundary(Qto, true) ?? DT;
    }

    // Carrega transações do período
    const txs = await prisma.transaction.findMany({
      where: {
        cashierSession: { companyId },
        createdAt: { gte, lte },
      },
      select: {
        id: true,
        type: true,
        amount: true,
        createdAt: true,
        sourceType: true,
        sourceId: true,
        description: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    // Totais
    const entries = txs
      .filter((t) => t.type === 'INCOME')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const exits = txs
      .filter((t) => t.type === 'EXPENSE')
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const balance = entries - exits;

    // byHour (0..23)
    const byHourMap = new Map(); // hour -> { income, expense }
    for (let h = 0; h < 24; h++) byHourMap.set(h, { hour: h, income: 0, expense: 0 });
    for (const t of txs) {
      const dt = new Date(t.createdAt);
      const h = dt.getHours();
      const acc = byHourMap.get(h);
      if (!acc) continue;
      if (t.type === 'INCOME') acc.income += Number(t.amount || 0);
      else acc.expense += Number(t.amount || 0);
    }
    const byHour = Array.from(byHourMap.values());

    // byMethod (usa receivable/payable para descobrir paymentMethod)
    const recvIds = txs
      .filter((t) => t.type === 'INCOME' && t.sourceType === 'RECEIVABLE' && t.sourceId)
      .map((t) => String(t.sourceId));
    const payIds = txs
      .filter((t) => t.type === 'EXPENSE' && t.sourceType === 'PAYABLE' && t.sourceId)
      .map((t) => String(t.sourceId));

    const [receivables, payables] = await Promise.all([
      recvIds.length
        ? prisma.receivable.findMany({
            where: { companyId, id: { in: recvIds } },
            select: {
              id: true,
              paymentMethodId: true,
              paymentMethod: { select: { id: true, name: true } },
            },
          })
        : [],
      payIds.length
        ? prisma.payable.findMany({
            where: { companyId, id: { in: payIds } },
            select: {
              id: true,
              paymentMethodId: true,
              paymentMethod: { select: { id: true, name: true } },
            },
          })
        : [],
    ]);

    const recvPM = new Map(
      receivables.map((r) => [String(r.id), r.paymentMethod?.name || null]),
    );
    const payPM = new Map(
      payables.map((p) => [String(p.id), p.paymentMethod?.name || null]),
    );

    // Agrupa por nome do método
    const methodAgg = new Map(); // name -> { name, entries, exits }
    const bump = (name, kind, amount) => {
      const key = name || '—';
      if (!methodAgg.has(key)) methodAgg.set(key, { name: key, entries: 0, exits: 0 });
      const obj = methodAgg.get(key);
      obj[kind] += Number(amount || 0);
    };

    for (const t of txs) {
      if (t.type === 'INCOME' && t.sourceType === 'RECEIVABLE') {
        const pmName = recvPM.get(String(t.sourceId)) || '—';
        bump(pmName, 'entries', t.amount);
      } else if (t.type === 'EXPENSE' && t.sourceType === 'PAYABLE') {
        const pmName = payPM.get(String(t.sourceId)) || '—';
        bump(pmName, 'exits', t.amount);
      }
    }

    const byMethod = Array.from(methodAgg.values()).sort(
      (a, b) => b.entries + b.exits - (a.entries + a.exits),
    );

    return res.json({
      from: gte,
      to: lte,
      // formato novo esperado pelo frontend:
      entries,
      exits,
      balance,
      byMethod,
      byHour,

      // também devolve um payload "antigo" (compat)
      totals: { income: entries, expense: exits, balance },
    });
  } catch (error) {
    console.error('Erro getCashierSummary:', error);
    return res.status(500).json({ message: 'Erro ao consultar resumo do caixa.' });
  }
};

/* ===========================================================
 *  OPEN
 * =========================================================== */
export const openCashier = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const openingAmount =
      req.body?.openingAmount != null
        ? Number(req.body.openingAmount)
        : Number(req.body?.openingBalance || 0);

    if (USE_NEW_CASHIER) {
      const opened = await cashbox.openCashier(
        null,
        companyId,
        isFinite(openingAmount) ? openingAmount : 0,
      );
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
          openedAt: new Date(),
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

/* ===========================================================
 *  CLOSE
 * =========================================================== */
export const closeCashier = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    // No frontend você envia contagem/observação; aqui aceitamos, e usamos apenas closingAmount/notas
    const {
      closingAmount = null,
      notes = '',
      // extras ignorados no persist: countedTotal, expectedTotal, diff, denominations
    } = req.body || {};

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
        activeSession.openingBalance,
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
          // notes: se existir essa coluna no seu schema, inclua aqui
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

/* ===========================================================
 *  TRANSACTIONS (Entrada/Saída manuais) – API genérica
 *  POST   /cashier/transactions
 *  GET    /cashier/transactions?from&to&type=INCOME|EXPENSE
 *  DELETE /cashier/transactions/:id
 * =========================================================== */
export const createCashierTransaction = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const {
      type, // 'INCOME' | 'EXPENSE'
      amount, // number
      description, // string
      sourceType = null, // 'RECEIVABLE' | 'PAYABLE' | null
      sourceId = null, // string | null
    } = req.body || {};

    if (!type || !['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ message: 'Tipo inválido. Use INCOME ou EXPENSE.' });
    }
    const value = Number(amount);
    if (!isFinite(value) || value <= 0) {
      return res.status(400).json({ message: 'Informe um valor positivo.' });
    }

    if (USE_NEW_CASHIER) {
      return res.status(501).json({
        message:
          'Lançamento manual não implementado para o modelo de caixa atual. Registre via Recebíveis/Pagáveis ou implemente addTransaction no cashboxService.',
      });
    }

    if (USE_OLD_SESSION) {
      const active = await prisma.cashierSession.findFirst({
        where: { companyId, status: 'OPEN' },
      });
      if (!active)
        return res.status(409).json({ message: 'Abra o caixa antes de lançar transações.' });

      // Evita duplicidade quando vier de origens integradas
      if (sourceType && sourceId) {
        const dupe = await prisma.transaction.findFirst({
          where: { sourceType, sourceId: String(sourceId) },
          select: { id: true },
        });
        if (dupe) {
          return res.status(409).json({ message: 'Transação já registrada para esta origem.' });
        }
      }

      const tx = await prisma.transaction.create({
        data: {
          type,
          amount: value,
          description: description || (type === 'INCOME' ? 'Entrada manual' : 'Saída manual'),
          cashierSessionId: active.id,
          sourceType: sourceType || null,
          sourceId: sourceId ? String(sourceId) : null,
        },
      });

      return res.status(201).json({ transaction: tx });
    }

    return res.status(500).json({
      message:
        'Nenhum modelo de caixa encontrado (cashier ou cashierSession). Verifique seu schema.prisma.',
    });
  } catch (error) {
    console.error('Erro ao criar transação de caixa:', error);
    return res.status(500).json({ message: 'Erro ao criar transação de caixa.' });
  }
};

export const listCashierTransactions = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const { from: Qfrom, to: Qto, type } = req.query || {};
    const { from: DF, to: DT } = defaultRange();
    const gte = parseDayBoundary(Qfrom, false) ?? DF;
    const lte = parseDayBoundary(Qto, true) ?? DT;

    if (USE_NEW_CASHIER) {
      return res.status(501).json({
        message:
          'Listagem de transações não implementada para o modelo de caixa atual. Exponha via cashboxService ou utilize /cashier/statement.',
      });
    }

    if (USE_OLD_SESSION) {
      const txs = await prisma.transaction.findMany({
        where: {
          cashierSession: { companyId },
          createdAt: { gte, lte },
          ...(type && ['INCOME', 'EXPENSE'].includes(type) ? { type } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      return res.json({ items: txs, from: gte, to: lte });
    }

    return res.status(500).json({
      message:
        'Nenhum modelo de caixa encontrado (cashier ou cashierSession). Verifique seu schema.prisma.',
    });
  } catch (error) {
    console.error('Erro ao listar transações do caixa:', error);
    return res.status(500).json({ message: 'Erro ao listar transações do caixa.' });
  }
};

export const deleteCashierTransaction = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Informe o id da transação.' });

    if (USE_NEW_CASHIER) {
      return res.status(501).json({
        message:
          'Exclusão de transação não implementada para o modelo de caixa atual. Exponha via cashboxService, se necessário.',
      });
    }

    if (USE_OLD_SESSION) {
      // opcional: bloquear deletar transações vinculadas a Recebíveis/Pagáveis
      const tx = await prisma.transaction.findFirst({
        where: { id, cashierSession: { companyId } },
        select: { id: true, sourceType: true, sourceId: true },
      });
      if (!tx) return res.status(404).json({ message: 'Transação não encontrada.' });

      if (tx.sourceType && tx.sourceId) {
        return res.status(400).json({
          message:
            'Esta transação está vinculada a um documento financeiro e não pode ser excluída por aqui.',
        });
      }

      await prisma.transaction.delete({ where: { id } });
      return res.status(204).send();
    }

    return res.status(500).json({
      message:
        'Nenhum modelo de caixa encontrado (cashier ou cashierSession). Verifique seu schema.prisma.',
    });
  } catch (error) {
    console.error('Erro ao excluir transação do caixa:', error);
    return res.status(500).json({ message: 'Erro ao excluir transação do caixa.' });
  }
};

/* ===========================================================
 *  MOVEMENTS (paginado e filtrável) — USADO PELO FRONT NOVO
 *  GET /cashier/movements?start=YYYY-MM-DD&end=YYYY-MM-DD
 *      &page=1&pageSize=20&type=INCOME|EXPENSE&methodId=&userId=&q=
 * =========================================================== */
export const getCashierMovements = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const {
      start,
      end,
      page = '1',
      pageSize = '20',
      type,
      methodId,
      userId,
      q,
    } = req.query || {};

    // Período: se vier só "start" como data única, limita ao dia.
    const gte = parseDayBoundary(start || new Date(), false);
    const lte = end ? parseDayBoundary(end, true) : parseDayBoundary(start || new Date(), true);

    if (USE_NEW_CASHIER) {
      // Se existir um serviço dedicado, acople aqui
      // Por ora, usamos o mesmo caminho do legado
    }

    // Base (legado)
    const baseWhere = {
      cashierSession: { companyId },
      createdAt: { gte, lte },
      ...(type && ['INCOME', 'EXPENSE'].includes(type) ? { type } : {}),
      ...(q ? { description: { contains: String(q), mode: 'insensitive' } } : {}),
    };

    // Filtros por método / usuário dependem de receivable/payable associados
    let where = { ...baseWhere };
    if (methodId || userId) {
      // Coleta os ids de origem válidos
      const [recvIds, payIds] = await Promise.all([
        prisma.receivable.findMany({
          where: {
            companyId,
            ...(methodId ? { paymentMethodId: String(methodId) } : {}),
            ...(userId ? { userId: String(userId) } : {}),
          },
          select: { id: true },
        }),
        prisma.payable.findMany({
          where: {
            companyId,
            ...(methodId ? { paymentMethodId: String(methodId) } : {}),
            ...(userId ? { userId: String(userId) } : {}),
          },
          select: { id: true },
        }),
      ]);

      const recvSet = new Set(recvIds.map((r) => String(r.id)));
      const paySet = new Set(payIds.map((p) => String(p.id)));

      // Se nenhum id bateu, retorna lista vazia
      if ((methodId || userId) && recvSet.size === 0 && paySet.size === 0) {
        return res.json({ items: [], total: 0, page: Number(page), pageSize: Number(pageSize) });
      }

      where = {
        ...where,
        OR: [
          { AND: [{ sourceType: 'RECEIVABLE' }, { sourceId: { in: Array.from(recvSet) } }] },
          { AND: [{ sourceType: 'PAYABLE' }, { sourceId: { in: Array.from(paySet) } }] },
        ],
      };
    }

    const take = Math.max(1, Math.min(200, parseInt(pageSize, 10) || 20));
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (currentPage - 1) * take;

    const [total, txs] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          createdAt: true,
          sourceType: true,
          sourceId: true,
          // não temos userId direto no transaction; vamos resolver pelo documento vinculado (se houver)
        },
      }),
    ]);

    // Enriquecimento: método de pagamento + usuário (se vier dos docs)
    const recvIdsPage = txs
      .filter((t) => t.sourceType === 'RECEIVABLE' && t.sourceId)
      .map((t) => String(t.sourceId));
    const payIdsPage = txs
      .filter((t) => t.sourceType === 'PAYABLE' && t.sourceId)
      .map((t) => String(t.sourceId));

    const [recvDocs, payDocs] = await Promise.all([
      recvIdsPage.length
        ? prisma.receivable.findMany({
            where: { companyId, id: { in: recvIdsPage } },
            select: {
              id: true,
              description: true,
              user: { select: { id: true, name: true } },
              paymentMethod: { select: { id: true, name: true } },
            },
          })
        : [],
      payIdsPage.length
        ? prisma.payable.findMany({
            where: { companyId, id: { in: payIdsPage } },
            select: {
              id: true,
              description: true,
              user: { select: { id: true, name: true } },
              paymentMethod: { select: { id: true, name: true } },
            },
          })
        : [],
    ]);

    const recvMap = new Map(recvDocs.map((d) => [String(d.id), d]));
    const payMap = new Map(payDocs.map((d) => [String(d.id), d]));

    const items = txs.map((t) => {
      let methodName = null;
      let user = null;
      let desc = t.description || '';

      if (t.sourceType === 'RECEIVABLE') {
        const r = recvMap.get(String(t.sourceId));
        methodName = r?.paymentMethod?.name || null;
        user = r?.user ? { id: r.user.id, name: r.user.name } : null;
        if (!desc && r?.description) desc = r.description;
      } else if (t.sourceType === 'PAYABLE') {
        const p = payMap.get(String(t.sourceId));
        methodName = p?.paymentMethod?.name || null;
        user = p?.user ? { id: p.user.id, name: p.user.name } : null;
        if (!desc && p?.description) desc = p.description;
      }

      return {
        id: t.id,
        type: t.type,
        amount: Number(t.amount || 0),
        description: desc,
        createdAt: t.createdAt,
        sourceType: t.sourceType,
        sourceId: t.sourceId,
        methodName,
        user,
      };
    });

    return res.json({ items, total, page: currentPage, pageSize: take });
  } catch (error) {
    console.error('Erro em getCashierMovements:', error);
    return res.status(500).json({ message: 'Erro ao consultar movimentações do caixa.' });
  }
};

/* ===========================================================
 *  Exports
 * =========================================================== */
export const getCashierStatusController = getCashierStatus;
export const openCashierController = openCashier;
export const closeCashierController = closeCashier;

export default {
  getCashierStatus,
  getCashierStatement,
  getCashierSummary,
  openCashier,
  closeCashier,
  createCashierTransaction,
  listCashierTransactions,
  deleteCashierTransaction,
  getCashierMovements,
  getCashierStatusController,
  openCashierController,
  closeCashierController,
};
