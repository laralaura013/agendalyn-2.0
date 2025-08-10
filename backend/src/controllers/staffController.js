import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';

// LISTAR
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

// CRIAR
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
        commission: commission != null ? String(commission) : null,
        companyId,
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

// ATUALIZAR
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    const exists = await prisma.user.findFirst({ where: { id, companyId } });
    if (!exists) return res.status(404).json({ message: 'Colaborador não encontrado.' });

    const { name, email, role, password, showInBooking, workSchedule, commission } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (typeof showInBooking === 'boolean') data.showInBooking = showInBooking;
    if (workSchedule !== undefined) data.workSchedule = workSchedule;
    if (commission !== undefined) data.commission = commission != null ? String(commission) : null;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
    });
    const { password: _, ...staffWithoutPassword } = updated;
    res.status(200).json(staffWithoutPassword);
  } catch (error) {
    console.error("--- ERRO AO ATUALIZAR COLABORADOR ---", error);
    res.status(500).json({ message: 'Erro ao atualizar colaborador.' });
  }
};

// DELETAR
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    const exists = await prisma.user.findFirst({ where: { id, companyId } });
    if (!exists) return res.status(404).json({ message: 'Colaborador não encontrado.' });

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error("--- ERRO AO DELETAR COLABORADOR ---", error);
    res.status(500).json({ message: 'Erro ao deletar colaborador.' });
  }
};
