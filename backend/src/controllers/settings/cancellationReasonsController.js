import prisma from '../../prismaClient.js';

export const list = async (_req, res) => {
  try {
    const data = await prisma.cancellationReason.findMany({
      where: { companyId: _req.company.id },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    res.json(data);
  } catch (e) {
    console.error('Erro list cancellation reasons:', e);
    res.status(500).json({ message: 'Erro ao listar motivos de cancelamento.' });
  }
};

export const create = async (req, res) => {
  try {
    const { name, active } = req.body;
    if (!name) return res.status(400).json({ message: 'name é obrigatório.' });
    const data = await prisma.cancellationReason.create({
      data: { name, active: active ?? true, companyId: req.company.id },
    });
    res.status(201).json(data);
  } catch (e) {
    console.error('Erro create cancellation reason:', e);
    res.status(400).json({ message: 'Erro ao criar motivo de cancelamento.' });
  }
};

export const update = async (req, res) => {
  try {
    const { name, active } = req.body;
    const { id } = req.params;
    const found = await prisma.cancellationReason.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!found) return res.status(404).json({ message: 'Motivo não encontrado.' });

    const data = await prisma.cancellationReason.update({
      where: { id },
      data: {
        name: name ?? found.name,
        active: typeof active === 'boolean' ? active : found.active,
      },
    });
    res.json(data);
  } catch (e) {
    console.error('Erro update cancellation reason:', e);
    res.status(400).json({ message: 'Erro ao atualizar motivo de cancelamento.' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const found = await prisma.cancellationReason.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!found) return res.status(404).json({ message: 'Motivo não encontrado.' });

    await prisma.cancellationReason.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    console.error('Erro delete cancellation reason:', e);
    res.status(400).json({ message: 'Erro ao excluir motivo de cancelamento.' });
  }
};
