// src/controllers/finance/payablesController.js
import prisma from '../../prismaClient.js';
import * as cashbox from '../../services/cashboxService.js';

/* ========================= Helpers ========================= */
const normalizeId = (v) =>
  v && typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

const parseDayBoundary = (isoOrDateOnly, end = false) => {
  if (!isoOrDateOnly) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateOnly)) {
    return new Date(`${isoOrDateOnly}T${end ? '23:59:59.999' : '00:00:00.000'}`);
  }
  const d = new Date(isoOrDateOnly);
  return isNaN(d.getTime()) ? undefined : d;
};

/* ============================================================
 * LIST (Paginado)
 * ==========================================================*/
export const list = async (req, res) => {
  try {
    const {
      status, date_from, date_to, categoryId, supplierId,
      q, sortBy = 'dueDate', sortOrder = 'asc',
      page: pageQ, pageSize: pageSizeQ
    } = req.query;

    const companyId = req.company?.id;
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const page = Math.max(parseInt(pageQ || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(pageSizeQ || '10', 10), 1), 100);
    const skip = (page - 1) * pageSize;

    const where = { companyId };

    if (status) {
      const arr = String(status).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (arr.length === 1) where.status = arr[0];
      else if (arr.length > 1) where.status = { in: arr };
    }

    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;

    const gte = parseDayBoundary(date_from, false);
    const lte = parseDayBoundary(date_to, true);
    if (gte || lte) {
      where.dueDate = {};
      if (gte) where.dueDate.gte = gte;
      if (lte) where.dueDate.lte = lte;
    }

    if (q && String(q).trim()) {
      const query = String(q).trim();
      where.OR = [
        { description: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.payable.findMany({
        where,
        include: {
          supplier: true,
          category: true,
          paymentMethod: true,
        },
        orderBy: [
          { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
          ...(sortBy !== 'createdAt' ? [{ createdAt: 'desc' }] : []),
        ],
        skip,
        take: pageSize,
      }),
      prisma.payable.count({ where }),
    ]);

    return res.status(200).json({ items, total, page, pageSize });
  } catch (e) {
    console.error('Erro list payables:', e);
    return res.status(500).json({ message: 'Erro ao listar contas a pagar.' });
  }
};

/* ============================================================
 * CREATE
 * ==========================================================*/
export const create = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { notes } = req.body;

    let { supplierId, categoryId, paymentMethodId, dueDate, amount } = req.body;
    supplierId = normalizeId(supplierId);
    categoryId = normalizeId(categoryId);
    paymentMethodId = normalizeId(paymentMethodId);

    if (!categoryId) return res.status(400).json({ message: 'categoryId é obrigatório.' });

    const due = parseDayBoundary(dueDate);
    if (!due) return res.status(400).json({ message: 'dueDate inválido.' });

    const amountNum = Number(amount);
    if (!isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'amount deve ser um número positivo.' });
    }

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

    if (supplierId && !supplier) return res.status(400).json({ message: 'Fornecedor inválido.' });
    if (!category) return res.status(400).json({ message: 'Categoria inválida (PAYABLE).' });
    if (paymentMethodId && !pm) return res.status(400).json({ message: 'Forma de pagamento inválida.' });

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
      return res.status(400).json({ message: 'Referência inválida (fornecedor/categoria/forma).' });
    }
    console.error('Erro create payable:', e);
    return res.status(500).json({ message: 'Erro ao criar conta a pagar.' });
  }
};

/* ============================================================
 * UPDATE — integra com Caixa
 * PUT /api/finance/payables/:id
 * ==========================================================*/
export const update = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const current = await prisma.payable.findFirst({ where: { id, companyId } });
    if (!current) return res.status(404).json({ message: 'Conta a pagar não encontrada.' });

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

      if (supplierId && !supplier) return res.status(400).json({ message: 'Fornecedor inválido.' });
      if (categoryId && !category) return res.status(400).json({ message: 'Categoria inválida (PAYABLE).' });
      if (paymentMethodId && !pm) return res.status(400).json({ message: 'Forma de pagamento inválida.' });
    }

    const data = {};
    if (supplierId !== undefined) data.supplierId = supplierId || null;
    if (categoryId !== undefined) data.categoryId = categoryId || null;
    if (paymentMethodId !== undefined) data.paymentMethodId = paymentMethodId || null;

    if (dueDate) {
      const d = parseDayBoundary(dueDate);
      if (!d) return res.status(400).json({ message: 'dueDate inválido.' });
      data.dueDate = d;
    }

    if (amount !== undefined && amount !== null) {
      const amountNum = Number(amount);
      if (!isFinite(amountNum) || amountNum <= 0) {
        return res.status(400).json({ message: 'amount deve ser um número positivo.' });
      }
      data.amount = amountNum;
    }

    if (typeof notes === 'string') data.notes = notes;

    if (status) {
      const upStatus = String(status).toUpperCase();
      data.status = upStatus;
      if (upStatus === 'PAID') {
        data.paidAt = paidAt ? new Date(paidAt) : new Date();
      } else if (upStatus === 'OPEN' || upStatus === 'CANCELED') {
        data.paidAt = paidAt ? new Date(paidAt) : null;
      }
    } else if (paidAt) {
      data.paidAt = new Date(paidAt);
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.payable.update({ where: { id }, data });

        const statusNow = data.status ?? current.status;
        const amountChanged = Object.prototype.hasOwnProperty.call(data, 'amount');

        if (statusNow === 'PAID') {
          await cashbox.ensureExpenseForPayable(tx, companyId, u);
        } else if (statusNow === 'OPEN' || statusNow === 'CANCELED') {
          await cashbox.removeForPayable(tx, u.id);
        } else if (!status && amountChanged && (current.status === 'PAID')) {
          await cashbox.ensureExpenseForPayable(tx, companyId, u);
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
    if (e?.code === 'P2003') {
      return res.status(400).json({ message: 'Referência inválida (fornecedor/categoria/forma).' });
    }
    console.error('Erro update payable:', e);
    return res.status(500).json({ message: 'Erro ao atualizar conta a pagar.' });
  }
};

/* ============================================================
 * DELETE
 * ==========================================================*/
export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.payable.findFirst({ where: { id, companyId } });
    if (!found) return res.status(404).json({ message: 'Conta a pagar não encontrada.' });

    await prisma.payable.delete({ where: { id } });
    // Opcional: remover lançamento se existir
    try {
      await cashbox.removeForPayable(prisma, id);
    } catch (_) {}
    return res.status(204).send();
  } catch (e) {
    console.error('Erro delete payable:', e);
    return res.status(500).json({ message: 'Erro ao excluir conta a pagar.' });
  }
};
