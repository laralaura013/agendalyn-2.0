import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const getClient = (id, companyId) => prisma.client.findFirst({ where: { id, companyId } });

export const listClients = async (req, res) => {
  const { companyId } = req.company;
  try {
    const clients = await prisma.client.findMany({ where: { companyId } });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar clientes.' });
  }
};

export const createClient = async (req, res) => {
  const { companyId } = req.company;
  const { name, phone, birthDate, notes } = req.body;
  try {
    const newClient = await prisma.client.create({
      data: { name, phone, birthDate: birthDate ? new Date(birthDate) : null, notes, companyId },
    });
    res.status(201).json(newClient);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar cliente.' });
  }
};

export const updateClient = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.company;
    const { name, phone, birthDate, notes } = req.body;
    try {
        if (!await getClient(id, companyId)) return res.status(404).json({ message: 'Cliente não encontrado.' });
        
        const updatedClient = await prisma.client.update({
            where: { id },
            data: { name, phone, birthDate: birthDate ? new Date(birthDate) : null, notes },
        });
        res.json(updatedClient);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar cliente.' });
    }
};

export const deleteClient = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.company;
    try {
        if (!await getClient(id, companyId)) return res.status(404).json({ message: 'Cliente não encontrado.' });
        
        await prisma.client.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar cliente.' });
    }
};
