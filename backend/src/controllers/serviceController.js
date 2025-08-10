import prisma from '../prismaClient.js';

// LISTAR
export const listServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({ where: { companyId: req.company.id } });
    res.status(200).json(services);
  } catch (error) {
    console.error("Erro ao listar serviços:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// CRIAR
export const createService = async (req, res) => {
  try {
    const { name, price, duration } = req.body;
    const newService = await prisma.service.create({
      data: {
        name,
        price, // Decimal como string é seguro
        duration: parseInt(duration),
        companyId: req.company.id
      },
    });
    res.status(201).json(newService);
  } catch (error) {
    console.error("Erro ao criar serviço:", error);
    res.status(500).json({ message: 'Erro ao criar serviço.' });
  }
};

// ATUALIZAR
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, duration } = req.body;

    const result = await prisma.service.updateMany({
      where: { id, companyId: req.company.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(duration !== undefined ? { duration: parseInt(duration) } : {}),
      },
    });

    if (result.count === 0) return res.status(404).json({ message: "Serviço não encontrado." });

    const updated = await prisma.service.findUnique({ where: { id } });
    res.status(200).json(updated);
  } catch (error) {
    console.error("Erro ao atualizar serviço:", error);
    res.status(500).json({ message: "Erro ao atualizar serviço." });
  }
};

// DELETAR
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await prisma.service.deleteMany({
      where: { id, companyId: req.company.id },
    });

    if (result.count === 0) return res.status(404).json({ message: "Serviço não encontrado." });

    res.status(204).send();
  } catch (error) {
    console.error("--- ERRO DETALHADO AO DELETAR SERVIÇO ---", error);
    if (error.code === 'P2003') {
      return res.status(409).json({
        message: "Este serviço não pode ser excluído, pois está sendo utilizado em um ou mais agendamentos."
      });
    }
    res.status(500).json({ message: "Erro ao deletar serviço." });
  }
};
