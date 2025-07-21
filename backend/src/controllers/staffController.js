import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Listar Colaboradores
export const listStaff = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { companyId: req.company.id },
      select: { id: true, name: true, email: true, role: true, showInBooking: true, workSchedule: true, commission: true }
    });
    res.status(200).json(staff);
  } catch (error) {
    console.error("Erro ao listar colaboradores:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// Criar Colaborador
export const createStaff = async (req, res) => {
  try {
    const { name, email, password, role, showInBooking, workSchedule, commission } = req.body;
    const companyId = req.company.id;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newStaff = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'STAFF',
        showInBooking: typeof showInBooking === 'boolean' ? showInBooking : true,
        workSchedule: workSchedule || {},
        commission: commission ? parseFloat(commission) : null,
        companyId: companyId,
      },
    });
    const { password: _, ...staffWithoutPassword } = newStaff;
    res.status(201).json(staffWithoutPassword);
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return res.status(409).json({ message: 'Este email já está em uso.' });
    }
    console.error("--- ERRO AO CRIAR COLABORADOR ---", error);
    res.status(500).json({ message: 'Erro ao criar colaborador.' });
  }
};

// ATUALIZAR Colaborador (LÓGICA CORRIGIDA)
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, showInBooking, workSchedule, commission } = req.body;
    const companyId = req.company.id;
    
    // CORREÇÃO: Construímos o objeto de atualização de forma segura,
    // apenas com os campos que realmente recebemos.
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof showInBooking === 'boolean') updateData.showInBooking = showInBooking;
    if (workSchedule) updateData.workSchedule = workSchedule;
    if (commission !== undefined) updateData.commission = commission ? parseFloat(commission) : null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedStaff = await prisma.user.update({
      where: { id: id, companyId: companyId },
      data: updateData,
    });
    const { password: _, ...staffWithoutPassword } = updatedStaff;
    res.status(200).json(staffWithoutPassword);
  } catch (error) {
    console.error("--- ERRO AO ATUALIZAR COLABORADOR ---", error);
    res.status(500).json({ message: 'Erro ao atualizar colaborador.' });
  }
};

// Deletar Colaborador
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id: id, companyId: req.company.id },
    });
    res.status(204).send();
  } catch (error) {
    console.error("--- ERRO AO DELETAR COLABORADOR ---", error);
    res.status(500).json({ message: 'Erro ao deletar colaborador.' });
  }
};