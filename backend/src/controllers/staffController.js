import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';

/* ===================== Helpers ===================== */
const parseDecimalNullable = (v) => {
  // "" | null | undefined -> null
  if (v === '' || v === null || v === undefined) return null;
  // números ou strings numéricas válidas -> number
  const n = Number(v);
  return Number.isFinite(n) ? n : null; // Prisma aceita number e converte para Decimal
};

/* ========================= LIST ========================= */
export const listStaff = async (req, res) => {
  try {
    const companyId = req.company.id;

    const staff = await prisma.user.findMany({
      where: { companyId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        showInBooking: true,
        workSchedule: true,
        commission: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json(staff);
  } catch (error) {
    console.error('Erro ao listar colaboradores:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/* ========================= CREATE ========================= */
export const createStaff = async (req, res) => {
  try {
    const { name, email, password, role, showInBooking, workSchedule, commission } = req.body;
    const companyId = req.company.id;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const created = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'STAFF',
        showInBooking: typeof showInBooking === 'boolean' ? showInBooking : true,
        workSchedule: workSchedule ?? {}, // JSON
        commission: parseDecimalNullable(commission), // null se "", null, undefined
        companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        showInBooking: true,
        workSchedule: true,
        commission: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({ message: 'Este email já está em uso.' });
    }
    console.error('--- ERRO AO CRIAR COLABORADOR ---', error);
    res.status(500).json({ message: 'Erro ao criar colaborador.' });
  }
};

/* ========================= UPDATE ========================= */
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    // Garante que o usuário pertence à empresa
    const exists = await prisma.user.findFirst({ where: { id, companyId } });
    if (!exists) return res.status(404).json({ message: 'Colaborador não encontrado.' });

    const { name, email, role, password, showInBooking, workSchedule, commission } = req.body;

    const data = {
      // somente define campos quando enviados
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(typeof showInBooking === 'boolean' ? { showInBooking } : {}),
      ...(workSchedule !== undefined ? { workSchedule } : {}),
    };

    if (commission !== undefined) {
      data.commission = parseDecimalNullable(commission);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
    }

    // update com escopo de empresa
    const result = await prisma.user.updateMany({
      where: { id, companyId },
      data,
    });

    if (result.count === 0) return res.status(404).json({ message: 'Colaborador não encontrado.' });

    const updated = await prisma.user.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        showInBooking: true,
        workSchedule: true,
        commission: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    if (error?.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({ message: 'Este email já está em uso.' });
    }
    console.error('--- ERRO AO ATUALIZAR COLABORADOR ---', error);
    res.status(500).json({ message: 'Erro ao atualizar colaborador.' });
  }
};

/* ========================= DELETE ========================= */
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    // valida escopo
    const exists = await prisma.user.findFirst({ where: { id, companyId } });
    if (!exists) return res.status(404).json({ message: 'Colaborador não encontrado.' });

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('--- ERRO AO DELETAR COLABORADOR ---', error);
    res.status(500).json({ message: 'Erro ao deletar colaborador.' });
  }
};
