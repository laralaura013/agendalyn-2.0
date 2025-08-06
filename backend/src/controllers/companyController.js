import prisma from '../prismaClient.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Buscar o perfil da empresa logada
export const getCompanyProfile = async (req, res) => {
  try {
    const companyId = req.company.id;
    const companyProfile = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true, // <-- LINHA ADICIONADA
        name: true,
        phone: true,
        address: true,
      }
    });
    if (!companyProfile) {
      return res.status(404).json({ message: 'Empresa não encontrada.' });
    }
    res.status(200).json(companyProfile);
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// Atualizar o perfil da empresa logada
export const updateCompanyProfile = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { name, phone, address } = req.body;

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        phone,
        address,
      },
    });
    res.status(200).json(updatedCompany);
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar perfil da empresa." });
  }
};