// src/controllers/clientController.js
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

// OBTER Cliente por ID
export const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    const client = await prisma.client.findFirst({
      where: { id, companyId },
    });

    if (!client) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    res.status(200).json(client);
  } catch (error) {
    console.error("--- ERRO AO BUSCAR CLIENTE POR ID ---", error);
    res.status(500).json({ message: "Erro ao buscar cliente." });
  }
};

// CRIAR Cliente
export const createClient = async (req, res) => {
  try {
    const { name, phone, birthDate, notes } = req.body;
    const companyId = req.company.id;

    if (!name || !phone) {
      return res
        .status(400)
        .json({ message: "Nome e telefone são obrigatórios." });
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
    res.status(500).json({ message: "Erro ao criar cliente." });
  }
};

// ATUALIZAR (EDITAR) Cliente
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, birthDate, notes } = req.body;
    const companyId = req.company.id;

    const existingClient = await prisma.client.findFirst({
      where: { id, companyId },
    });

    if (!existingClient) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    const updatedClient = await prisma.client.update({
      where: { id },
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
    res.status(500).json({ message: "Erro ao atualizar cliente." });
  }
};

// DELETAR Cliente (corrigido)
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    const client = await prisma.client.findFirst({
      where: { id, companyId },
    });

    if (!client) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    await prisma.client.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error("--- ERRO DETALHADO AO DELETAR CLIENTE ---", error);
    res.status(500).json({ message: "Erro ao deletar cliente." });
  }
};
