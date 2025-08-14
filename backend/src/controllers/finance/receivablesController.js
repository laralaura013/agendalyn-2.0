import prisma from '../../prismaClient.js';

export const list = async (req, res) => {
  try {
    const { status, date_from, date_to, categoryId, clientId, orderId } = req.query;
    const where = { companyId: req.company.id };

    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (clientId) where.clientId = clientId;
    if (orderId) where.orderId = orderId;

    if (date_from || date_to) {
      where.dueDate = {};
      if (date_from) where.dueDate.gte = new Date(`${date_from}T00:00:00.000`);
      if (date_to) where.dueDate.lte = new Date(`${date_to}T23:59:59.999`);
    }

    const data = await prisma.receivable.findMany({
      where,
      include: {
        client: { select: { name: true } },
        order: { select: { id: true, total: true, status: true } },
        category: true,
        paymentMethod: true,
      },
      orderBy: { dueDate: 'asc' },
    });
    res.json(data);
  } catch (e) {
    console.error('Erro list receivables:', e);
    res.status(500).json({ message: 'Erro ao listar contas a receber.' });
  }
};

export const create = async (req, res) => {
  try {
    const { clientId, orderId, categoryId, paymentMethodId, dueDate, amount, notes } = req.body;
    if (!dueDate || !amount) {
      return res.status(400).json({ message: 'dueDate e amount são obrigatórios.' });
    }
    const data = await prisma.receivable.create({
      data: {
        companyId: req.company.id,
        clientId: clientId || null,
        orderId: orderId || null,
        categoryId: categoryId || null,
        paymentMethodId: paymentMethodId || null,
        dueDate: new Date(dueDate),
        amount: Number(amount),
        status: 'OPEN',
        notes: notes || null,
      },
    });
    res.status(201).json(data);
  } catch (e) {
    console.error('Erro create receivable:', e);
    res.status(400).json({ message: 'Erro ao criar conta a receber.' });
  }
};

export const update = async (req, res) => {
  try {
    const { clientId, orderId, categoryId, paymentMethodId, dueDate, amount, status, receivedAt, notes } = req.body;
    const { id } = req.params;
    const found = await prisma.receivable.findFirst({ where: { id, companyId: req.company.id } });
    if (!found) return res.status(404).json({ message: 'Conta a receber não encontrada.' });

    const data = await prisma.receivable.update({
      where: { id },
      data: {
        clientId: clientId ?? found.clientId,
        orderId: orderId ?? found.orderId,
        categoryId: categoryId ?? found.categoryId,
        paymentMethodId: paymentMethodId ?? found.paymentMethodId,
        dueDate: dueDate ? new Date(dueDate) : found.dueDate,
        amount: amount != null ? Number(amount) : found.amount,
        status: status ?? found.status,
        receivedAt: receivedAt ? new Date(receivedAt) : (status === 'RECEIVED' ? new Date() : found.receivedAt),
        notes: typeof notes === 'string' ? notes : found.notes,
      },
    });
    res.json(data);
  } catch (e) {
    console.error('Erro update receivable:', e);
    res.status(400).json({ message: 'Erro ao atualizar conta a receber.' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const found = await prisma.receivable.findFirst({ where: { id, companyId: req.company.id } });
    if (!found) return res.status(404).json({ message: 'Conta a receber não encontrada.' });
    await prisma.receivable.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    console.error('Erro delete receivable:', e);
    res.status(400).json({ message: 'Erro ao excluir conta a receber.' });
  }
};
