import prisma from '../prismaClient.js';
export const listBrands = async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      where: { companyId: req.company.id },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(brands);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar marcas." });
  }
};

export const createBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const newBrand = await prisma.brand.create({
      data: { name, companyId: req.company.id },
    });
    res.status(201).json(newBrand);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar marca.' });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updatedBrand = await prisma.brand.update({
      where: { id: id, companyId: req.company.id },
      data: { name },
    });
    res.status(200).json(updatedBrand);
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar marca." });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.brand.delete({
      where: { id: id, companyId: req.company.id },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ message: "Esta marca não pode ser excluída, pois está a ser utilizada em um ou mais produtos." });
    }
    res.status(500).json({ message: "Erro ao deletar marca." });
  }
};