import prisma from '../../prismaClient.js';

export const list = async (req, res) => {
  try {
    const data = await prisma.paymentMethod.findMany({
      where: { companyId: req.company.id },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    res.json(data);
  } catch (e) {
    console.error('Erro list payment methods:', e);
    res.status(500).json({ message: 'Erro ao listar formas de pagamento.' });
  }
};

export const create = async (req, res) => {
  try {
    const { name, active } = req.body;
    if (!name) return res.status(400).json({ message: 'name é obrigatório.' });
    const data = await prisma.paymentMethod.create({
      data: { name, active: active ?? true, companyId: req.company.id },
    });
    res.status(201).json(data);
  } catch (e) {
    console.error('Erro create payment method:', e);
    res.status(400).json({ message: 'Erro ao criar forma de pagamento.' });
  }
};

export const update = async (req, res) => {
  try {
    const { name, active } = req.body;
    const { id } = req.params;
    const found = await prisma.paymentMethod.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!found) return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });

    const data = await prisma.paymentMethod.update({
      where: { id },
      data: {
        name: name ?? found.name,
        active: typeof active === 'boolean' ? active : found.active,
      },
    });
    res.json(data);
  } catch (e) {
    console.error('Erro update payment method:', e);
    res.status(400).json({ message: 'Erro ao atualizar forma de pagamento.' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const found = await prisma.paymentMethod.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!found) return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });

    await prisma.paymentMethod.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    console.error('Erro delete payment method:', e);
    res.status(400).json({ message: 'Erro ao excluir forma de pagamento.' });
  }
};
