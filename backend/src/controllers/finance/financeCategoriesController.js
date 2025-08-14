import prisma from '../../prismaClient.js';

export const list = async (req, res) => {
  try {
    const { type } = req.query; // PAYABLE | RECEIVABLE | opcional
    const where = { companyId: req.company.id };
    if (type) where.type = type;
    const data = await prisma.financeCategory.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    res.json(data);
  } catch (e) {
    console.error('Erro list categories:', e);
    res.status(500).json({ message: 'Erro ao listar categorias.' });
  }
};

export const create = async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ message: 'name e type são obrigatórios.' });

    const data = await prisma.financeCategory.create({
      data: { name, type, companyId: req.company.id },
    });
    res.status(201).json(data);
  } catch (e) {
    console.error('Erro create category:', e);
    res.status(400).json({ message: 'Erro ao criar categoria.' });
  }
};

export const update = async (req, res) => {
  try {
    const { name, type } = req.body;
    const { id } = req.params;
    const found = await prisma.financeCategory.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!found) return res.status(404).json({ message: 'Categoria não encontrada.' });

    const data = await prisma.financeCategory.update({
      where: { id },
      data: {
        name: name ?? found.name,
        type: type ?? found.type,
      },
    });
    res.json(data);
  } catch (e) {
    console.error('Erro update category:', e);
    res.status(400).json({ message: 'Erro ao atualizar categoria.' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const found = await prisma.financeCategory.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!found) return res.status(404).json({ message: 'Categoria não encontrada.' });

    await prisma.financeCategory.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    console.error('Erro delete category:', e);
    res.status(400).json({ message: 'Erro ao excluir categoria.' });
  }
};
