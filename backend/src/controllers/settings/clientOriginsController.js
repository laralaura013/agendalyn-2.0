import prisma from '../../prismaClient.js';

export const list = async (_req, res) => {
  try {
    const data = await prisma.clientOrigin.findMany({
      where: { companyId: _req.company.id },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    res.json(data);
  } catch (e) {
    console.error('Erro list client origins:', e);
    res.status(500).json({ message: 'Erro ao listar origens de cliente.' });
  }
};

export const create = async (req, res) => {
  try {
    const { name, active } = req.body;
    if (!name) return res.status(400).json({ message: 'name é obrigatório.' });
    const data = await prisma.clientOrigin.create({
      data: { name, active: active ?? true, companyId: req.company.id },
    });
    res.status(201).json(data);
  } catch (e) {
    console.error('Erro create client origin:', e);
    res.status(400).json({ message: 'Erro ao criar origem de cliente.' });
  }
};

export const update = async (req, res) => {
  try {
    const { name, active } = req.body;
    const { id } = req.params;
    const found = await prisma.clientOrigin.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!found) return res.status(404).json({ message: 'Origem não encontrada.' });

    const data = await prisma.clientOrigin.update({
      where: { id },
      data: {
        name: name ?? found.name,
        active: typeof active === 'boolean' ? active : found.active,
      },
    });
    res.json(data);
  } catch (e) {
    console.error('Erro update client origin:', e);
    res.status(400).json({ message: 'Erro ao atualizar origem de cliente.' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const found = await prisma.clientOrigin.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!found) return res.status(404).json({ message: 'Origem não encontrada.' });

    await prisma.clientOrigin.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    console.error('Erro delete client origin:', e);
    res.status(400).json({ message: 'Erro ao excluir origem de cliente.' });
  }
};
