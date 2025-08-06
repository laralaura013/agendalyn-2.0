import prisma from '../prismaClient.js';
// Listar todos os produtos
export const listProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { companyId: req.company.id },
      include: { category: true, brand: true },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(products);
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// Criar um novo produto
export const createProduct = async (req, res) => {
  try {
    const { name, price, stock, cost, description, categoryId, brandId } = req.body;
    const newProduct = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        cost: cost ? parseFloat(cost) : null,
        description,
        categoryId,
        brandId,
        companyId: req.company.id,
      },
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    res.status(500).json({ message: 'Erro ao criar produto.' });
  }
};

// Atualizar um produto
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, stock, cost, description, categoryId, brandId } = req.body;
        const updatedProduct = await prisma.product.update({
            where: { id: id, companyId: req.company.id },
            data: {
                name,
                price: parseFloat(price),
                stock: parseInt(stock) || 0,
                cost: cost ? parseFloat(cost) : null,
                description,
                categoryId,
                brandId,
            },
        });
        res.status(200).json(updatedProduct);
    } catch (error) {
        console.error("Erro ao atualizar produto:", error);
        res.status(500).json({ message: "Erro ao atualizar produto." });
    }
};

// Deletar um produto
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({
            where: { id: id, companyId: req.company.id },
        });
        res.status(204).send();
    } catch (error) {
        console.error("Erro ao deletar produto:", error);
        if (error.code === 'P2003') {
            return res.status(409).json({ message: "Este produto não pode ser excluído, pois está associado a uma ou mais comandas." });
        }
        res.status(500).json({ message: "Erro ao deletar produto." });
    }
};