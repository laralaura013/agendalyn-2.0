// src/controllers/finance/receivablesController.js
import prisma from '../../prismaClient.js';

/* ========================= Helpers ========================= */
const normalizeId = (v) =>
  v && typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

// Aceita 'YYYY-MM-DD' (vira 00:00 local) ou ISO completo
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
 * GET /api/finance/receivables
 * Query: status, date_from, date_to, categoryId, clientId, orderId
 * ==========================================================*/
export const list = async (req, res) => {
  try {
    const { status, date_from, date_to, categoryId, clientId, orderId } = req.query;
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
    if (clientId) where.clientId = String(clientId);
    if (orderId) where.orderId = String(orderId);

    const gte = parseDayBoundary(date_from, false);
    const lte = parseDayBoundary(date_to, true);
    if (gte || lte) {
      where.dueDate = {};
      if (gte) where.dueDate.gte = gte;
      if (lte) where.dueDate.lte = lte;
    }

    const data = await prisma.receivable.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        order: { select: { id: true, total: true, status: true } },
        category: { select: { id: true, name: true, type: true } },
        paymentMethod: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return res.json(data);
  } catch (e) {
    console.error('Erro list receivables:', e);
    return res.status(500).json({ message: 'Erro ao listar contas a receber.' });
  }
};

/* ============================================================
 * CREATE
 * POST /api/finance/receivables
 * Body: { clientId?, orderId?, categoryId?, paymentMethodId?, dueDate*, amount*, notes? }
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

    const amountNum = Number(amount);
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
 * UPDATE
 * PUT /api/finance/receivables/:id
 * Body parcial; se status='RECEIVED' e receivedAt ausente → define agora.
 * Se status voltar para 'OPEN' ou 'CANCELED', zera receivedAt salvo se vier explicitamente.
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

    // IDs relacionais — permitem limpar (null) se vier string vazia
    if (clientId !== undefined) data.clientId = clientId || null;
    if (orderId !== undefined) data.orderId = orderId || null;
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

      if (upStatus === 'RECEIVED') {
        data.receivedAt = receivedAt ? new Date(receivedAt) : new Date();
      } else if (upStatus === 'OPEN' || upStatus === 'CANCELED') {
        // volta para aberto/cancelado → zera receivedAt, a menos que o front mande explicitamente
        data.receivedAt = receivedAt ? new Date(receivedAt) : null;
      }
    } else if (receivedAt) {
      data.receivedAt = new Date(receivedAt);
    }

    const updated = await prisma.receivable.update({
      where: { id },
      data,
    });

    return res.json(updated);
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
 * DELETE
 * DELETE /api/finance/receivables/:id
 * ==========================================================*/
export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.receivable.findFirst({ where: { id, companyId } });
    if (!found) return res.status(404).json({ message: 'Conta a receber não encontrada.' });

    await prisma.receivable.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    console.error('Erro delete receivable:', e);
    return res.status(500).json({ message: 'Erro ao excluir conta a receber.' });
  }
};
