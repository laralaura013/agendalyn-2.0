import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// LISTAR CLIENTES (admin)
export const listClients = async (req, res) => {
  try {
    const companyId = req.company.id;

    const clients = await prisma.client.findMany({
      where: { companyId }, // ⛔ isActive removido
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(clients);
  } catch (error) {
    console.error('❌ Erro ao listar clientes:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// BUSCAR CLIENTE POR ID (admin)
export const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    const client = await prisma.client.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!client) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    res.status(200).json(client);
  } catch (error) {
    console.error('❌ Erro ao buscar cliente por ID:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// CRIAR CLIENTE (admin)
export const createClient = async (req, res) => {
  try {
    const { name, email, phone, birthDate, notes } = req.body;
    const companyId = req.company.id;

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        birthDate: birthDate ? new Date(birthDate) : null,
        notes,
        companyId,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('❌ Erro ao criar cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// ATUALIZAR CLIENTE (admin)
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, birthDate, notes } = req.body;
    const companyId = req.company.id;

    const result = await prisma.client.updateMany({
      where: { id, companyId },
      data: {
        name,
        email,
        phone,
        birthDate: birthDate ? new Date(birthDate) : null,
        notes,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    res.status(200).json({ message: 'Cliente atualizado com sucesso.' });
  } catch (error) {
    console.error('❌ Erro ao atualizar cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// DELETAR CLIENTE (admin)
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    const result = await prisma.client.deleteMany({
      where: { id, companyId },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    res.status(200).json({ message: 'Cliente deletado com sucesso.' });
  } catch (error) {
    console.error('❌ Erro ao deletar cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};
