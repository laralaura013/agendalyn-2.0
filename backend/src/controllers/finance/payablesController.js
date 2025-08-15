// src/controllers/finance/payablesController.js
import prisma from '../../prismaClient.js';

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

/* ============================================================
 * LIST
 * GET /api/finance/payables
 * Query: status, date_from, date_to, categoryId, supplierId
 * ==========================================================*/
export const list = async (req, res) => {
  try {
    const { status, date_from, date_to, categoryId, supplierId } = req.query;

    const where = { companyId: req.company.id };

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

    const gte = parseDayBoundary(date_from, false);
    const lte = parseDayBoundary(date_to, true);
    if (gte || lte) {
      where.dueDate = {};
      if (gte) where.dueDate.gte = gte;
      if (lte) where.dueDate.lte = lte;
    }

    const data = await prisma.payable.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, type: true } },
        paymentMethod: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return res.json(data);
  } catch (e) {
    console.error('Erro list payables:', e);
    return res.status(500).json({ message: 'Erro ao listar contas a pagar.' });
  }
};

/* ============================================================
 * CREATE
 * POST /api/finance/payables
 * Body: { supplierId?, categoryId*, paymentMethodId?, dueDate*, amount*, notes? }
 * Regras:
 *  - categoryId deve existir e ser do tipo PAYABLE.
 *  - supplier/paymentMethod, se enviados, devem existir na empresa.
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

    const amountNum = Number(amount);
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
 * UPDATE
 * PUT /api/finance/payables/:id
 * Body parcial. Regras de status:
 *  - Se status='PAID' e paidAt ausente → define agora.
 *  - Se status voltar para 'OPEN' ou 'CANCELED' → zera paidAt (salvo se vier explicitamente).
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

    // IDs relacionais — permitem limpar (null) se vier string vazia
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

    const updated = await prisma.payable.update({
      where: { id },
      data,
    });

    return res.json(updated);
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
 * DELETE
 * DELETE /api/finance/payables/:id
 * ==========================================================*/
export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.payable.findFirst({ where: { id, companyId } });
    if (!found) return res.status(404).json({ message: 'Conta a pagar não encontrada.' });

    await prisma.payable.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    console.error('Erro delete payable:', e);
    return res.status(500).json({ message: 'Erro ao excluir conta a pagar.' });
  }
};
