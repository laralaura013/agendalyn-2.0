// src/controllers/finance/payablesController.js
import prisma from '../../prismaClient.js';
import * as cashbox from '../../services/cashboxService.js';

/* ========================= Helpers ========================= */
const normalizeId = (v) =>
  v && typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

// Aceita 'YYYY-MM-DD' (vira 00:00/23:59 local) ou ISO completo
const parseDayBoundary = (isoOrDateOnly, end = false) => {
  if (!isoOrDateOnly) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateOnly)) {
    return new Date(`${isoOrDateOnly}T${end ? '23:59:59.999' : '00:00:00.000'}`);
  }
  const d = new Date(isoOrDateOnly);
  return isNaN(d.getTime()) ? undefined : d;
};

// parse de um Date "livre" (pra paidAt/receivedAt vindos do payload)
const parseDateLoose = (v) => {
  if (v == null || v === '') return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const safeNumber = (v) => {
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
 * GET /api/finance/payables
 * ==========================================================*/
export const list = async (req, res) => {
  try {
    const {
      status,
      date_from,
      date_to,
      categoryId,
      supplierId,
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
    if (supplierId) where.supplierId = String(supplierId);
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
    const minV = parseNumber(minAmount);
    const maxV = parseNumber(maxAmount);
    if (minV != null && maxV != null) {
      const lo = Math.min(minV, maxV);
      const hi = Math.max(minV, maxV);
      where.amount = { gte: lo, lte: hi };
    } else if (minV != null) {
      where.amount = { gte: minV };
    } else if (maxV != null) {
      where.amount = { lte: maxV };
    }

    if (q && String(q).trim()) {
      const query = String(q).trim();
      // Payable não tem 'description' no schema -> busca apenas em notes
      where.OR = [{ notes: { contains: query, mode: 'insensitive' } }];
    }

    // Ordenação com whitelist
    const allowedSort = new Set(['dueDate', 'createdAt', 'updatedAt', 'amount', 'status']);
    const sortKey = allowedSort.has(String(sortByQ)) ? String(sortByQ) : 'dueDate';
    const sortOrder = String(sortOrderQ).toLowerCase() === 'desc' ? 'desc' : 'asc';

    const [items, total, totalsAgg, agg] = await Promise.all([
      prisma.payable.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          paymentMethod: { select: { id: true, name: true } },
        },
        orderBy: [
          { [sortKey]: sortOrder },
          ...(sortKey !== 'createdAt' ? [{ createdAt: 'desc' }] : []), // ordenação estável
        ],
        skip,
        take: pageSize,
      }),
      prisma.payable.count({ where }),
      prisma.payable.groupBy({
        by: ['status'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.payable.aggregate({
        _sum: { amount: true },
        where,
      }),
    ]);

    const totalsByStatus = {
      OPEN: { count: 0, amount: 0 },
      PAID: { count: 0, amount: 0 },
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
    console.error('Erro list payables:', e);
    return res.status(500).json({ message: 'Erro ao listar contas a pagar.' });
  }
};

/* ============================================================
 * CREATE
 * POST /api/finance/payables
 * ==========================================================*/
export const create = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { notes } = req.body;

    let { supplierId, categoryId, paymentMethodId, dueDate, amount } = req.body;
    supplierId = normalizeId(supplierId);
    categoryId = normalizeId(categoryId);
    paymentMethodId = normalizeId(paymentMethodId);

    // obrigatórios
    if (!categoryId) {
      return res.status(400).json({ message: 'categoryId é obrigatório.' });
    }
    const due = parseDayBoundary(dueDate);
    if (!due) return res.status(400).json({ message: 'dueDate inválido.' });

    const amountNum = safeNumber(amount);
    if (!isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'amount deve ser um número positivo.' });
    }

    // Validação de FKs (somente se enviados)
    const [supplier, category, pm] = await Promise.all([
      supplierId
        ? prisma.supplier.findFirst({ where: { id: supplierId, companyId }, select: { id: true } })
        : null,
      prisma.financeCategory.findFirst({
        where: { id: categoryId, companyId, type: 'PAYABLE' },
        select: { id: true },
      }),
      paymentMethodId
        ? prisma.paymentMethod.findFirst({
            where: { id: paymentMethodId, companyId },
            select: { id: true },
          })
        : null,
    ]);

    if (supplierId && !supplier)
      return res.status(400).json({ message: 'Fornecedor inválido para esta empresa.' });
    if (!category)
      return res.status(400).json({ message: 'Categoria inválida (deve ser do tipo PAYABLE).' });
    if (paymentMethodId && !pm)
      return res.status(400).json({ message: 'Forma de pagamento inválida.' });

    const created = await prisma.payable.create({
      data: {
        companyId,
        categoryId,
        dueDate: due,
        amount: amountNum,
        status: 'OPEN',
        notes: typeof notes === 'string' ? notes : '',
        ...(supplierId && { supplierId }),
        ...(paymentMethodId && { paymentMethodId }),
      },
    });

    return res.status(201).json(created);
  } catch (e) {
    if (e?.code === 'P2003') {
      return res
        .status(400)
        .json({ message: 'Referência inválida (fornecedor/categoria/forma de pagamento).' });
    }
    console.error('Erro create payable:', e);
    return res.status(500).json({ message: 'Erro ao criar conta a pagar.' });
  }
};

/* ============================================================
 * UPDATE (integra com Caixa)
 * PUT /api/finance/payables/:id
 * ==========================================================*/
export const update = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const current = await prisma.payable.findFirst({ where: { id, companyId } });
    if (!current) return res.status(404).json({ message: 'Conta a pagar não encontrada.' });

    // 🔒 Bloqueia tentativa de remover categoryId ('' ou null)
    if (Object.prototype.hasOwnProperty.call(req.body, 'categoryId')) {
      const raw = req.body.categoryId;
      if (raw === null || (typeof raw === 'string' && raw.trim() === '')) {
        return res.status(400).json({
          message: 'categoryId é obrigatório e não pode ser removido no update.',
        });
      }
    }

    let {
      supplierId,
      categoryId,
      paymentMethodId,
      dueDate,
      amount,
      status,
      paidAt,
      notes,
    } = req.body;

    supplierId = normalizeId(supplierId);
    categoryId = normalizeId(categoryId);
    paymentMethodId = normalizeId(paymentMethodId);

    // Valida FKs apenas se enviados
    if (supplierId || categoryId || paymentMethodId) {
      const [supplier, category, pm] = await Promise.all([
        supplierId
          ? prisma.supplier.findFirst({ where: { id: supplierId, companyId }, select: { id: true } })
          : null,
        categoryId
          ? prisma.financeCategory.findFirst({
              where: { id: categoryId, companyId, type: 'PAYABLE' },
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

      if (supplierId && !supplier)
        return res.status(400).json({ message: 'Fornecedor inválido para esta empresa.' });
      if (categoryId && !category)
        return res.status(400).json({ message: 'Categoria inválida (deve ser do tipo PAYABLE).' });
      if (paymentMethodId && !pm)
        return res.status(400).json({ message: 'Forma de pagamento inválida.' });
    }

    const data = {};

    // IDs relacionais — permitem limpar supplier/paymentMethod (null), mas não categoryId
    if (supplierId !== undefined) data.supplierId = supplierId || null;
    if (categoryId !== undefined) data.categoryId = categoryId; // já validado acima; não zera
    if (paymentMethodId !== undefined) data.paymentMethodId = paymentMethodId || null;

    if (dueDate) {
      const d = parseDayBoundary(dueDate);
      if (!d) return res.status(400).json({ message: 'dueDate inválido.' });
      data.dueDate = d;
    }

    let amountChanged = false;
    if (amount !== undefined && amount !== null) {
      const amountNum = safeNumber(amount);
      if (!isFinite(amountNum) || amountNum <= 0) {
        return res.status(400).json({ message: 'amount deve ser um número positivo.' });
      }
      data.amount = amountNum;
      amountChanged = amountNum !== Number(current.amount);
    }

    if (typeof notes === 'string') data.notes = notes;

    // ======== Status + paidAt ========
    const allowedStatus = new Set(['OPEN', 'PAID', 'CANCELED']);
    let upStatus;
    if (status != null) {
      upStatus = String(status).toUpperCase();
      if (!allowedStatus.has(upStatus)) {
        return res.status(400).json({ message: 'status inválido.' });
      }
      data.status = upStatus;

      if (upStatus === 'PAID') {
        if (paidAt != null) {
          const d = parseDateLoose(paidAt);
          if (!d) return res.status(400).json({ message: 'paidAt inválido.' });
          data.paidAt = d;
        } else {
          data.paidAt = new Date();
        }
      } else {
        // OPEN ou CANCELED → sempre zera paidAt
        data.paidAt = null;
      }
    } else if (paidAt != null) {
      // Só permite ajustar paidAt se já estiver PAID
      if (current.status !== 'PAID') {
        return res.status(400).json({ message: 'paidAt só pode ser definido quando status=PAID.' });
      }
      const d = parseDateLoose(paidAt);
      if (!d) return res.status(400).json({ message: 'paidAt inválido.' });
      data.paidAt = d;
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.payable.update({ where: { id }, data });

        // CAIXA
        const statusAfter = u.status;
        const paidAtChanged = Object.prototype.hasOwnProperty.call(data, 'paidAt');

        if (statusAfter === 'PAID') {
          // marcado como pago, ou valor/data alterados enquanto PAID → garante saída
          await cashbox.ensureExpenseForPayable(tx, companyId, u);
        } else if (statusAfter === 'OPEN' || statusAfter === 'CANCELED') {
          // voltou para aberto/cancelado → remove saída
          await cashbox.removeForPayable(tx, u.id, companyId);
        } else if (!status && amountChanged && current.status === 'PAID') {
          await cashbox.ensureExpenseForPayable(tx, companyId, u);
        } else if (!status && !amountChanged && paidAtChanged && current.status === 'PAID') {
          await cashbox.ensureExpenseForPayable(tx, companyId, u);
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
        .json({ message: 'Referência inválida (fornecedor/categoria/forma de pagamento).' });
    }
    console.error('Erro update payable:', e);
    return res.status(500).json({ message: 'Erro ao atualizar conta a pagar.' });
  }
};

/* ============================================================
 * PATCH STATUS (opcional, mais direto para UI)
 * PATCH /api/finance/payables/:id/status
 * ==========================================================*/
export const patchStatus = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;
    const { status, paidAt } = req.body || {};

    if (!status) return res.status(400).json({ message: 'status é obrigatório.' });

    const current = await prisma.payable.findFirst({ where: { id, companyId } });
    if (!current) return res.status(404).json({ message: 'Conta a pagar não encontrada.' });

    const upStatus = String(status).toUpperCase();
    const allowedStatus = new Set(['OPEN', 'PAID', 'CANCELED']);
    if (!allowedStatus.has(upStatus)) {
      return res.status(400).json({ message: 'status inválido.' });
    }

    const data = { status: upStatus };

    if (upStatus === 'PAID') {
      if (paidAt != null) {
        const d = parseDateLoose(paidAt);
        if (!d) return res.status(400).json({ message: 'paidAt inválido.' });
        data.paidAt = d;
      } else {
        data.paidAt = new Date();
      }
    } else {
      // OPEN/CANCELED zera sempre
      data.paidAt = null;
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.payable.update({ where: { id }, data });

        if (u.status === 'PAID') {
          await cashbox.ensureExpenseForPayable(tx, companyId, u);
        } else {
          await cashbox.removeForPayable(tx, u.id, companyId);
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
    console.error('Erro patchStatus payable:', e);
    return res.status(500).json({ message: 'Erro ao atualizar status.' });
  }
};

/* ============================================================
 * DELETE
 * DELETE /api/finance/payables/:id
 * ==========================================================*/
export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.payable.findFirst({ where: { id, companyId } });
    if (!found) return res.status(404).json({ message: 'Conta a pagar não encontrada.' });

    await prisma.$transaction(async (tx) => {
      await tx.payable.delete({ where: { id } });
      // remove o lançamento do caixa (se existir)
      await cashbox.removeForPayable(tx, id, companyId);
    });

    return res.status(204).send();
  } catch (e) {
    console.error('Erro delete payable:', e);
    return res.status(500).json({ message: 'Erro ao excluir conta a pagar.' });
  }
};
