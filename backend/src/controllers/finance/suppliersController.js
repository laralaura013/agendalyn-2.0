import prisma from '../../prismaClient.js';

export const list = async (req, res) => {
  try {
    const data = await prisma.supplier.findMany({
      where: { companyId: req.company.id },
      orderBy: { name: 'asc' },
    });
    res.json(data);
  } catch (e) {
    console.error('Erro list suppliers:', e);
    res.status(500).json({ message: 'Erro ao listar fornecedores.' });
  }
};

export const create = async (req, res) => {
  try {
    const { name, taxId, phone, email } = req.body;
    if (!name) return res.status(400).json({ message: 'name é obrigatório.' });
    const data = await prisma.supplier.create({
      data: { name, taxId, phone, email, companyId: req.company.id },
    });
    res.status(201).json(data);
  } catch (e) {
    console.error('Erro create supplier:', e);
    res.status(400).json({ message: 'Erro ao criar fornecedor.' });
  }
};

export const update = async (req, res) => {
  try {
    const { name, taxId, phone, email } = req.body;
    const { id } = req.params;
    const found = await prisma.supplier.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!found) return res.status(404).json({ message: 'Fornecedor não encontrado.' });

    const data = await prisma.supplier.update({
      where: { id },
      data: {
        name: name ?? found.name,
        taxId: taxId ?? found.taxId,
        phone: phone ?? found.phone,
        email: email ?? found.email,
      },
    });
    res.json(data);
  } catch (e) {
    console.error('Erro update supplier:', e);
    res.status(400).json({ message: 'Erro ao atualizar fornecedor.' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const found = await prisma.supplier.findFirst({
      where: { id, companyId: req.company.id },
    });
    if (!found) return res.status(404).json({ message: 'Fornecedor não encontrado.' });

    await prisma.supplier.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    console.error('Erro delete supplier:', e);
    res.status(400).json({ message: 'Erro ao excluir fornecedor.' });
  }
};
