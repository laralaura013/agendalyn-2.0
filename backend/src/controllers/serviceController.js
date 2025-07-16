import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const listServices = async (req, res) => {
  const { companyId } = req.company;
  try {
    const services = await prisma.service.findMany({
      where: { companyId },
      include: { availableTo: { select: { id: true, name: true } } },
    });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar serviços.' });
  }
};

export const createService = async (req, res) => {
  const { companyId } = req.company;
  const { name, price, duration, availableTo } = req.body; // availableTo: array de user IDs
  try {
    const newService = await prisma.service.create({
      data: {
        name,
        price,
        duration,
        companyId,
        availableTo: {
          connect: availableTo.map(id => ({ id })),
        },
      },
    });
    res.status(201).json(newService);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar serviço.' });
  }
};
// Implementar update e delete
