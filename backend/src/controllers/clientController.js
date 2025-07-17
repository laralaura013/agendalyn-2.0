import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// LISTAR Clientes
export const listClients = async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: {
        companyId: req.company.id,
      },
    });
    res.status(200).json(clients);
  } catch (error) {
    console.error("Erro ao listar clientes:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// CRIAR Cliente
export const createClient = async (req, res) => {
  try {
    const { name, phone, birthDate, notes } = req.body;
    const companyId = req.company.id;

    if (!name || !phone) {
        return res.status(400).json({ message: "Nome e telefone são obrigatórios." });
    }

    const newClient = await prisma.client.create({
      data: {
        name,
        phone,
        birthDate: birthDate ? new Date(birthDate) : null,
        notes,
        companyId,
      },
    });
    res.status(201).json(newClient);
  } catch (error) {
    console.error("--- ERRO DETALHADO AO CRIAR CLIENTE ---", error);
    res.status(500).json({ message: 'Erro ao criar cliente.' });
  }
};

// ATUALIZAR (EDITAR) Cliente
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, birthDate, notes } = req.body;
    const companyId = req.company.id;

    const updatedClient = await prisma.client.update({
      where: {
        id: id,
        companyId: companyId,
      },
      data: {
        name,
        phone,
        birthDate: birthDate ? new Date(birthDate) : null,
        notes,
      },
    });
    res.status(200).json(updatedClient);
  } catch (error) {
    console.error("--- ERRO DETALHADO AO ATUALIZAR CLIENTE ---", error);
    res.status(500).json({ message: 'Erro ao atualizar cliente.' });
  }
};

// DELETAR Cliente
export const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.company.id;

        await prisma.client.delete({
            where: {
                id: id,
                companyId: companyId,
            },
        });
        res.status(204).send(); // Sucesso, sem conteúdo
    } catch (error) {
        console.error("--- ERRO DETALHADO AO DELETAR CLIENTE ---", error);
        res.status(500).json({ message: "Erro ao deletar cliente." });
    }
};