import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const listCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { companyId: req.company.id },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar categorias." });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const newCategory = await prisma.category.create({
      data: { name, companyId: req.company.id },
    });
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar categoria.' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updatedCategory = await prisma.category.update({
      where: { id: id, companyId: req.company.id },
      data: { name },
    });
    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar categoria." });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({
      where: { id: id, companyId: req.company.id },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ message: "Esta categoria não pode ser excluída, pois está a ser utilizada em um ou mais produtos." });
    }
    res.status(500).json({ message: "Erro ao deletar categoria." });
  }
};