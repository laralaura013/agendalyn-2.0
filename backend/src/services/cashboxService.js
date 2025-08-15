// src/services/cashboxService.js
// ============================================================================
// Serviço de Caixa alinhado ao schema com CashierSession + Transaction
// - CashierSession: { id, openingBalance, closingBalance?, openedAt, closedAt?, status, companyId }
// - Transaction: { id, type, amount, description, cashierSessionId, createdAt, sourceType?, sourceId? }
// - Idempotência: @@unique([sourceType, sourceId])
// - Enums: TransactionType(INCOME|EXPENSE), CashSourceType(RECEIVABLE|PAYABLE)
// ============================================================================

import prisma from '../prismaClient.js';

export const SOURCE = {
  RECEIVABLE: 'RECEIVABLE',
  PAYABLE: 'PAYABLE',
};

export const TXTYPE = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
};

/* ========================= Internals ========================= */
function pickDb(dbMaybe) {
  return dbMaybe || prisma;
}

function toAmount(n) {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) throw new Error('Valor inválido para lançamento no caixa.');
  return v;
}

function asDateOrNow(d) {
  const dt = d ? new Date(d) : new Date();
  return isNaN(dt.getTime()) ? new Date() : dt;
}

function dayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function compositeKey(sourceType, sourceId) {
  return {
    sourceType_sourceId: {
      sourceType,
      sourceId: String(sourceId),
    },
  };
}

/* ============================================================================
 * CAIXA (CashierSession)
 * ==========================================================================*/
export async function getOpenSession(dbMaybe, companyId) {
  const db = pickDb(dbMaybe);
  if (!companyId) return null;
  return db.cashierSession.findFirst({
    where: { companyId, status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
  });
}

export async function assertOpenSession(dbMaybe, companyId) {
  const s = await getOpenSession(dbMaybe, companyId);
  if (!s) {
    const err = new Error('Não há caixa aberto para lançar esta operação.');
    err.code = 'NO_OPEN_CASHIER';
    throw err;
  }
  return s;
}

export async function openCashier(dbMaybe, companyId, openingAmount = 0) {
  const db = pickDb(dbMaybe);
  if (!companyId) throw new Error('companyId é obrigatório para abrir caixa.');

  const exists = await getOpenSession(db, companyId);
  if (exists) return exists;

  return db.cashierSession.create({
    data: {
      companyId,
      status: 'OPEN',
      openingBalance: isFinite(Number(openingAmount)) ? Number(openingAmount) : 0,
      openedAt: new Date(),
    },
  });
}

export async function closeCashier(dbMaybe, companyId, { closingAmount = null } = {}) {
  const db = pickDb(dbMaybe);
  if (!companyId) throw new Error('companyId é obrigatório para fechar caixa.');

  const session = await getOpenSession(db, companyId);
  if (!session) return null;

  // Usa aggregate para não carregar todas as transações na memória
  const [incomeAgg, expenseAgg] = await Promise.all([
    db.transaction.aggregate({
      where: { cashierSessionId: session.id, type: TXTYPE.INCOME },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { cashierSessionId: session.id, type: TXTYPE.EXPENSE },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = Number(incomeAgg?._sum?.amount || 0);
  const totalExpense = Number(expenseAgg?._sum?.amount || 0);

  const computedClosing = Number(session.openingBalance || 0) + totalIncome - totalExpense;

  const closingBalance =
    closingAmount != null && isFinite(Number(closingAmount))
      ? Number(closingAmount)
      : computedClosing;

  return db.cashierSession.update({
    where: { id: session.id },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closingBalance,
    },
  });
}

/* ============================================================================
 * TOTAIS / STATUS
 * ==========================================================================*/
export async function totalsForDay(dbMaybe, companyId, date = new Date()) {
  const db = pickDb(dbMaybe);
  const { start, end } = dayBounds(date);

  const [incomesAgg, expensesAgg] = await Promise.all([
    db.transaction.aggregate({
      where: {
        cashierSession: { companyId },
        createdAt: { gte: start, lte: end },
        type: TXTYPE.INCOME,
      },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: {
        cashierSession: { companyId },
        createdAt: { gte: start, lte: end },
        type: TXTYPE.EXPENSE,
      },
      _sum: { amount: true },
    }),
  ]);

  const income = Number(incomesAgg?._sum?.amount || 0);
  const expense = Number(expensesAgg?._sum?.amount || 0);
  return { income, expense, balance: income - expense };
}

export async function cashierStatus(dbMaybe, companyId) {
  const db = pickDb(dbMaybe);
  const session = await getOpenSession(db, companyId);
  const totalsToday = await totalsForDay(db, companyId, new Date());
  return {
    isOpen: !!session,
    openedAt: session?.openedAt || null,
    cashierId: session?.id || null,
    totalsToday,
  };
}

/* ============================================================================
 * LANÇAMENTOS por Fonte (idempotência por [sourceType, sourceId])
 * ==========================================================================*/
async function upsertTx(db, {
  companyId,
  sessionId,
  type,
  amount,
  description,
  sourceType,
  sourceId,
  when, // Date
}) {
  if (!companyId) throw new Error('companyId é obrigatório.');
  if (!sessionId) throw new Error('sessionId é obrigatório.');
  const amt = toAmount(amount);
  const createdAt = asDateOrNow(when);

  // description é obrigatório no schema
  const desc =
    typeof description === 'string' && description.trim() !== ''
      ? description.trim()
      : `${type === TXTYPE.INCOME ? 'Entrada' : 'Saída'} ${sourceType || ''} #${sourceId || ''}`.trim();

  return db.transaction.upsert({
    where: compositeKey(sourceType, String(sourceId)),
    update: {
      type,
      amount: amt,
      description: desc,
      cashierSessionId: sessionId,
      createdAt, // permite espelhar receivedAt/paidAt
    },
    create: {
      type,
      amount: amt,
      description: desc,
      cashierSessionId: sessionId,
      createdAt,
      sourceType,
      sourceId: String(sourceId),
    },
  });
}

async function removeBySource(db, sourceType, sourceId) {
  if (sourceId == null) return;
  try {
    await db.transaction.delete({ where: compositeKey(sourceType, String(sourceId)) });
  } catch {
    // not found -> ignora
  }
}

/* ============================================================================
 * RECEBÍVEIS (INCOME)
 * ==========================================================================*/
export async function ensureIncomeForReceivable(dbMaybe, companyId, receivable) {
  const db = pickDb(dbMaybe);
  if (!receivable?.id) throw new Error('Recebível inválido: id ausente.');

  const session = await assertOpenSession(db, companyId);

  return upsertTx(db, {
    companyId,
    sessionId: session.id,
    type: TXTYPE.INCOME,
    amount: receivable.amount,
    description: receivable.description || `Recebível #${receivable.id}`,
    sourceType: SOURCE.RECEIVABLE,
    sourceId: receivable.id,
    when: receivable.receivedAt || new Date(),
  });
}

export async function removeIncomeForReceivable(dbMaybe, receivableId /*, companyId? */) {
  const db = pickDb(dbMaybe);
  await removeBySource(db, SOURCE.RECEIVABLE, receivableId);
}

/* ============================================================================
 * PAGÁVEIS (EXPENSE)
 * ==========================================================================*/
export async function ensureExpenseForPayable(dbMaybe, companyId, payable) {
  const db = pickDb(dbMaybe);
  if (!payable?.id) throw new Error('Conta a pagar inválida: id ausente.');

  const session = await assertOpenSession(db, companyId);

  return upsertTx(db, {
    companyId,
    sessionId: session.id,
    type: TXTYPE.EXPENSE,
    amount: payable.amount,
    description: payable.description || `Pagável #${payable.id}`,
    sourceType: SOURCE.PAYABLE,
    sourceId: payable.id,
    when: payable.paidAt || new Date(),
  });
}

export async function removeForPayable(dbMaybe, payableId /*, companyId? */) {
  const db = pickDb(dbMaybe);
  await removeBySource(db, SOURCE.PAYABLE, payableId);
}

/* ============================================================================
 * Export default (opcional)
 * ==========================================================================*/
export default {
  SOURCE,
  TXTYPE,

  // caixa
  getOpenSession,
  assertOpenSession,
  openCashier,
  closeCashier,
  cashierStatus,
  totalsForDay,

  // recebíveis
  ensureIncomeForReceivable,
  removeIncomeForReceivable,

  // pagáveis
  ensureExpenseForPayable,
  removeForPayable,
};
