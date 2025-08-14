import prisma from '../../prismaClient.js';

export const list = async (req, res) => {
  try {
    const { status, date_from, date_to, categoryId, supplierId } = req.query;
    const where = { companyId: req.company.id };

    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;

    if (date_from || date_to) {
      where.dueDate = {};
      if (date_from) where.dueDate.gte = new Date(`${date_from}T00:00:00.000`);
      if (date_to) where.dueDate.lte = new Date(`${date_to}T23:59:59.999`);
    }

    const data = await prisma.payable.findMany({
      where,
      include: {
        supplier: true,
        category: true,
        paymentMethod: true,
      },
      orderBy: { dueDate: 'asc' },
    });
    res.json(data);
  } catch (e) {
    console.error('Erro list payables:', e);
    res.status(500).json({ message: 'Erro ao listar contas a pagar.' });
  }
};

export const create = async (req, res) => {
  try {
    const { supplierId, categoryId, paymentMethodId, dueDate, amount, notes } = req.body;
    if (!categoryId || !dueDate || !amount) {
      return res.status(400).json({ message: 'categoryId, dueDate e amount são obrigatórios.' });
    }
    const data = await prisma.payable.create({
      data: {
        companyId: req.company.id,
        supplierId: supplierId || null,
        categoryId,
        paymentMethodId: paymentMethodId || null,
        dueDate: new Date(dueDate),
        amount: Number(amount),
        status: 'OPEN',
        notes: notes || null,
      },
    });
    res.status(201).json(data);
  } catch (e) {
    console.error('Erro create payable:', e);
    res.status(400).json({ message: 'Erro ao criar conta a pagar.' });
  }
};

export const update = async (req, res) => {
  try {
    const { supplierId, categoryId, paymentMethodId, dueDate, amount, status, paidAt, notes } = req.body;
    const { id } = req.params;
    const found = await prisma.payable.findFirst({ where: { id, companyId: req.company.id } });
    if (!found) return res.status(404).json({ message: 'Conta a pagar não encontrada.' });

    const data = await prisma.payable.update({
      where: { id },
      data: {
        supplierId: supplierId ?? found.supplierId,
        categoryId: categoryId ?? found.categoryId,
        paymentMethodId: paymentMethodId ?? found.paymentMethodId,
        dueDate: dueDate ? new Date(dueDate) : found.dueDate,
        amount: amount != null ? Number(amount) : found.amount,
        status: status ?? found.status,
        paidAt: paidAt ? new Date(paidAt) : (status === 'PAID' ? new Date() : found.paidAt),
        notes: typeof notes === 'string' ? notes : found.notes,
      },
    });
    res.json(data);
  } catch (e) {
    console.error('Erro update payable:', e);
    res.status(400).json({ message: 'Erro ao atualizar conta a pagar.' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const found = await prisma.payable.findFirst({ where: { id, companyId: req.company.id } });
    if (!found) return res.status(404).json({ message: 'Conta a pagar não encontrada.' });
    await prisma.payable.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    console.error('Erro delete payable:', e);
    res.status(400).json({ message: 'Erro ao excluir conta a pagar.' });
  }
};
