// src/controllers/finance/receivablesController.js
import prisma from '../../prismaClient.js';
import * as cashbox from '../../services/cashboxService.js';

/* ========================= Helpers ========================= */
const normalizeId = (v) =>
  v && typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

// Aceita 'YYYY-MM-DD' (vira 00:00 local / 23:59 local) ou ISO completo
const parseDayBoundary = (isoOrDateOnly, end = false) => {
  if (!isoOrDateOnly) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateOnly)) {
    return new Date(`${isoOrDateOnly}T${end ? '23:59:59.999' : '00:00:00.000'}`);
  }
  const d = new Date(isoOrDateOnly);
  return isNaN(d.getTime()) ? undefined : d;
};

// parse de um Date "livre" (pra receivedAt/paidAt vindos do payload)
const parseDateLoose = (v) => {
  if (v == null || v === '') return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const toNumber = (v) => {
  const n = Number(v);
  return isFinite(n) ? n : NaN;
};

const parseNumber = (v) => {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return isFinite(n) ? n : undefined;
};

/* ============================================================
 * LIST (Paginado)
 * GET /api/finance/receivables
 * ==========================================================*/
export const list = async (req, res) => {
  try {
    const {
      status,
      date_from,
      date_to,
      categoryId,
      clientId,
      orderId,
      paymentMethodId,
      minAmount,
      maxAmount,
      q,
      sortBy: sortByQ = 'dueDate',
      sortOrder: sortOrderQ = 'asc',
      page: pageQ,
      pageSize: pageSizeQ,
    } = req.query;

    const companyId = req.company?.id;
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const page = Math.max(parseInt(pageQ || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(pageSizeQ || '10', 10), 1), 100);
    const skip = (page - 1) * pageSize;

    // Filtros
    const where = { companyId };

    // status único ou CSV
    if (status) {
      const arr = String(status)
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (arr.length === 1) where.status = arr[0];
      else if (arr.length > 1) where.status = { in: arr };
    }

    if (categoryId) where.categoryId = String(categoryId);
    if (clientId) where.clientId = String(clientId);
    if (orderId) where.orderId = String(orderId);
    if (paymentMethodId) where.paymentMethodId = String(paymentMethodId);

    const gte = parseDayBoundary(date_from, false);
    const lte = parseDayBoundary(date_to, true);
    if (gte && lte && gte > lte) {
      return res.status(400).json({ message: 'Intervalo de datas inválido (date_from > date_to).' });
    }
    if (gte || lte) {
      where.dueDate = {};
      if (gte) where.dueDate.gte = gte;
      if (lte) where.dueDate.lte = lte;
    }

    // Normaliza min/max (não retorna 400 se vier invertido)
    const min = parseNumber(minAmount);
    const max = parseNumber(maxAmount);
    if (min != null && max != null) {
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      where.amount = { gte: lo, lte: hi };
    } else if (min != null) {
      where.amount = { gte: min };
    } else if (max != null) {
      where.amount = { lte: max };
    }

    if (q && String(q).trim()) {
      const query = String(q).trim();
      // Se seu schema não tiver "description", remova a primeira linha do OR abaixo.
      where.OR = [
        { description: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Ordenação com whitelist (evita erro Prisma por coluna inválida)
    const allowedSort = new Set(['dueDate', 'createdAt', 'updatedAt', 'amount', 'status']);
    const sortKey = allowedSort.has(String(sortByQ)) ? String(sortByQ) : 'dueDate';
    const sortOrder = String(sortOrderQ).toLowerCase() === 'desc' ? 'desc' : 'asc';

    const [items, total, totalsAgg, agg] = await Promise.all([
      prisma.receivable.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          order: { select: { id: true, total: true, status: true } },
          category: { select: { id: true, name: true, type: true } },
          paymentMethod: { select: { id: true, name: true } },
        },
        orderBy: [
          { [sortKey]: sortOrder },
          ...(sortKey !== 'createdAt' ? [{ createdAt: 'desc' }] : []), // ordenação estável
        ],
        skip,
        take: pageSize,
      }),
      prisma.receivable.count({ where }),
      prisma.receivable.groupBy({
        by: ['status'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.receivable.aggregate({
        _sum: { amount: true },
        where,
      }),
    ]);

    const totalsByStatus = {
      OPEN: { count: 0, amount: 0 },
      RECEIVED: { count: 0, amount: 0 },
      CANCELED: { count: 0, amount: 0 },
    };
    for (const r of totalsAgg) {
      const key = r.status?.toUpperCase?.() || 'OPEN';
      if (!totalsByStatus[key]) totalsByStatus[key] = { count: 0, amount: 0 };
      totalsByStatus[key].count = r._count?._all || 0;
      totalsByStatus[key].amount = Number(r._sum?.amount || 0);
    }

    return res.status(200).json({
      items,
      total,
      page,
      pageSize,
      totalsByStatus,
      summary: { amountSum: Number(agg?._sum?.amount || 0) },
    });
  } catch (e) {
    console.error('Erro list receivables:', e);
    return res.status(500).json({ message: 'Erro ao listar contas a receber.' });
  }
};

/* ============================================================
 * CREATE
 * POST /api/finance/receivables
 * ==========================================================*/
export const create = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { notes } = req.body;

    let { clientId, orderId, categoryId, paymentMethodId, dueDate, amount } = req.body;
    clientId = normalizeId(clientId);
    orderId = normalizeId(orderId);
    categoryId = normalizeId(categoryId);
    paymentMethodId = normalizeId(paymentMethodId);

    // obrigatórios
    const due = parseDayBoundary(dueDate);
    if (!due) return res.status(400).json({ message: 'dueDate inválido.' });

    const amountNum = toNumber(amount);
    if (!isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'amount deve ser um número positivo.' });
    }

    // Valida e carrega FKs SOMENTE se enviados
    const [client, order, category, pm] = await Promise.all([
      clientId
        ? prisma.client.findFirst({ where: { id: clientId, companyId }, select: { id: true } })
        : null,
      orderId
        ? prisma.order.findFirst({
            where: { id: orderId, companyId },
            select: { id: true, clientId: true },
          })
        : null,
      categoryId
        ? prisma.financeCategory.findFirst({
            where: { id: categoryId, companyId, type: 'RECEIVABLE' },
            select: { id: true },
          })
        : null,
      paymentMethodId
        ? prisma.paymentMethod.findFirst({
            where: { id: paymentMethodId, companyId },
            select: { id: true },
          })
        : null,
    ]);

    if (clientId && !client)
      return res.status(400).json({ message: 'Cliente inválido para esta empresa.' });

    if (orderId && !order)
      return res.status(400).json({ message: 'Comanda inválida para esta empresa.' });

    // Se veio orderId e não veio clientId, herda do pedido (se existir)
    if (orderId && !clientId && order?.clientId) {
      clientId = order.clientId;
    }

    // Se ambos vieram, precisam ser consistentes
    if (orderId && clientId && order?.clientId && order.clientId !== clientId) {
      return res
        .status(400)
        .json({ message: 'Cliente informado não corresponde ao cliente da comanda.' });
    }

    if (categoryId && !category)
      return res.status(400).json({ message: 'Categoria (Receber) inválida.' });

    if (paymentMethodId && !pm)
      return res.status(400).json({ message: 'Forma de pagamento inválida.' });

    const created = await prisma.receivable.create({
      data: {
        companyId,
        dueDate: due,
        amount: amountNum,
        status: 'OPEN',
        notes: typeof notes === 'string' ? notes : '',
        ...(clientId && { clientId }),
        ...(orderId && { orderId }),
        ...(categoryId && { categoryId }),
        ...(paymentMethodId && { paymentMethodId }),
      },
    });

    return res.status(201).json(created);
  } catch (e) {
    if (e?.code === 'P2003') {
      // Violação de FK
      return res
        .status(400)
        .json({ message: 'Referência inválida (cliente/ordem/categoria/forma de pagamento).' });
    }
    console.error('Erro create receivable:', e);
    return res.status(500).json({ message: 'Erro ao criar conta a receber.' });
  }
};

/* ============================================================
 * UPDATE (integra com Caixa)
 * PUT /api/finance/receivables/:id
 * ==========================================================*/
export const update = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const current = await prisma.receivable.findFirst({ where: { id, companyId } });
    if (!current) return res.status(404).json({ message: 'Conta a receber não encontrada.' });

    let {
      clientId,
      orderId,
      categoryId,
      paymentMethodId,
      dueDate,
      amount,
      status,
      receivedAt,
      notes,
    } = req.body;

    clientId = normalizeId(clientId);
    orderId = normalizeId(orderId);
    categoryId = normalizeId(categoryId);
    paymentMethodId = normalizeId(paymentMethodId);

    // Valida FKs apenas se enviados
    if (clientId || orderId || categoryId || paymentMethodId) {
      const [client, order, category, pm] = await Promise.all([
        clientId
          ? prisma.client.findFirst({ where: { id: clientId, companyId }, select: { id: true } })
          : null,
        orderId
          ? prisma.order.findFirst({
              where: { id: orderId, companyId },
              select: { id: true, clientId: true },
            })
          : null,
        categoryId
          ? prisma.financeCategory.findFirst({
              where: { id: categoryId, companyId, type: 'RECEIVABLE' },
              select: { id: true },
            })
          : null,
        paymentMethodId
          ? prisma.paymentMethod.findFirst({
              where: { id: paymentMethodId, companyId },
              select: { id: true },
            })
          : null,
      ]);

      if (clientId && !client)
        return res.status(400).json({ message: 'Cliente inválido para esta empresa.' });

      if (orderId && !order)
        return res.status(400).json({ message: 'Comanda inválida para esta empresa.' });

      if (orderId && clientId && order?.clientId && order.clientId !== clientId) {
        return res
          .status(400)
          .json({ message: 'Cliente informado não corresponde ao cliente da comanda.' });
      }

      if (categoryId && !category)
        return res.status(400).json({ message: 'Categoria (Receber) inválida.' });

      if (paymentMethodId && !pm)
        return res.status(400).json({ message: 'Forma de pagamento inválida.' });
    }

    const data = {};

    // IDs relacionais — permitem limpar (null) se vier string vazia (categoria é opcional)
    if (clientId !== undefined) data.clientId = clientId || null;
    if (orderId !== undefined) data.orderId = orderId || null;
    if (categoryId !== undefined) data.categoryId = categoryId || null;
    if (paymentMethodId !== undefined) data.paymentMethodId = paymentMethodId || null;

    if (dueDate) {
      const d = parseDayBoundary(dueDate);
      if (!d) return res.status(400).json({ message: 'dueDate inválido.' });
      data.dueDate = d;
    }

    let amountChanged = false;
    if (amount !== undefined && amount !== null) {
      const amountNum = toNumber(amount);
      if (!isFinite(amountNum) || amountNum <= 0) {
        return res.status(400).json({ message: 'amount deve ser um número positivo.' });
      }
      data.amount = amountNum;
      amountChanged = amountNum !== Number(current.amount);
    }

    if (typeof notes === 'string') data.notes = notes;

    // ======== Status + receivedAt ========
    const allowedStatus = new Set(['OPEN', 'RECEIVED', 'CANCELED']);
    let upStatus;
    if (status != null) {
      upStatus = String(status).toUpperCase();
      if (!allowedStatus.has(upStatus)) {
        return res.status(400).json({ message: 'status inválido.' });
      }
      data.status = upStatus;

      if (upStatus === 'RECEIVED') {
        if (receivedAt != null) {
          const d = parseDateLoose(receivedAt);
          if (!d) return res.status(400).json({ message: 'receivedAt inválido.' });
          data.receivedAt = d;
        } else {
          data.receivedAt = new Date();
        }
      } else {
        // OPEN ou CANCELED → sempre zera receivedAt (ignora recebido do payload)
        data.receivedAt = null;
      }
    } else if (receivedAt != null) {
      // Só permite ajustar receivedAt se já estiver RECEIVED
      if (current.status !== 'RECEIVED') {
        return res.status(400).json({ message: 'receivedAt só pode ser definido quando status=RECEIVED.' });
      }
      const d = parseDateLoose(receivedAt);
      if (!d) return res.status(400).json({ message: 'receivedAt inválido.' });
      data.receivedAt = d;
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.receivable.update({ where: { id }, data });

        // CAIXA
        const statusAfter = u.status;
        const receivedAtChanged = Object.prototype.hasOwnProperty.call(data, 'receivedAt');

        if (statusAfter === 'RECEIVED') {
          // marcado como recebido, ou valor/data alterados enquanto RECEIVED → garante entrada
          await cashbox.ensureIncomeForReceivable(tx, companyId, u);
        } else if (statusAfter === 'OPEN' || statusAfter === 'CANCELED') {
          // voltou para aberto/cancelado → remove lançamento do caixa
          await cashbox.removeIncomeForReceivable(tx, u.id, companyId);
        } else if (!status && amountChanged && current.status === 'RECEIVED') {
          await cashbox.ensureIncomeForReceivable(tx, companyId, u);
        } else if (!status && !amountChanged && receivedAtChanged && current.status === 'RECEIVED') {
          await cashbox.ensureIncomeForReceivable(tx, companyId, u);
        }

        return u;
      });

      return res.json(updated);
    } catch (err) {
      if (err?.code === 'NO_OPEN_CASHIER') {
        return res.status(409).json({ message: err.message }); // caixa fechado
      }
      throw err;
    }
  } catch (e) {
    if (e?.code === 'P2003') {
      return res
        .status(400)
        .json({ message: 'Referência inválida (cliente/ordem/categoria/forma de pagamento).' });
    }
    console.error('Erro update receivable:', e);
    return res.status(500).json({ message: 'Erro ao atualizar conta a receber.' });
  }
};

/* ============================================================
 * PATCH STATUS (opcional, mais direto para UI)
 * PATCH /api/finance/receivables/:id/status
 * ==========================================================*/
export const patchStatus = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;
    const { status, receivedAt } = req.body || {};

    if (!status) return res.status(400).json({ message: 'status é obrigatório.' });

    const current = await prisma.receivable.findFirst({ where: { id, companyId } });
    if (!current) return res.status(404).json({ message: 'Conta a receber não encontrada.' });

    const upStatus = String(status).toUpperCase();
    const allowedStatus = new Set(['OPEN', 'RECEIVED', 'CANCELED']);
    if (!allowedStatus.has(upStatus)) {
      return res.status(400).json({ message: 'status inválido.' });
    }

    const data = { status: upStatus };

    if (upStatus === 'RECEIVED') {
      if (receivedAt != null) {
        const d = parseDateLoose(receivedAt);
        if (!d) return res.status(400).json({ message: 'receivedAt inválido.' });
        data.receivedAt = d;
      } else {
        data.receivedAt = new Date();
      }
    } else {
      // OPEN/CANCELED zera sempre
      data.receivedAt = null;
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.receivable.update({ where: { id }, data });

        if (u.status === 'RECEIVED') {
          await cashbox.ensureIncomeForReceivable(tx, companyId, u);
        } else {
          await cashbox.removeIncomeForReceivable(tx, u.id, companyId);
        }

        return u;
      });

      return res.json(updated);
    } catch (err) {
      if (err?.code === 'NO_OPEN_CASHIER') {
        return res.status(409).json({ message: err.message });
      }
      throw err;
    }
  } catch (e) {
    console.error('Erro patchStatus receivable:', e);
    return res.status(500).json({ message: 'Erro ao atualizar status.' });
  }
};

/* ============================================================
 * DELETE
 * DELETE /api/finance/receivables/:id
 * ==========================================================*/
export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.receivable.findFirst({ where: { id, companyId } });
    if (!found) return res.status(404).json({ message: 'Conta a receber não encontrada.' });

    await prisma.$transaction(async (tx) => {
      await tx.receivable.delete({ where: { id } });
      await cashbox.removeIncomeForReceivable(tx, id, companyId);
    });

    return res.status(204).send();
  } catch (e) {
    console.error('Erro delete receivable:', e);
    return res.status(500).json({ message: 'Erro ao excluir conta a receber.' });
  }
};
