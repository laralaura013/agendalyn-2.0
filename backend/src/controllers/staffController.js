import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import bcrypt from 'bcryptjs';

export const listStaff = async (req, res) => {
  const { companyId } = req.company;
  try {
    const staff = await prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, role: true, commission: true, workSchedule: true },
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar colaboradores.' });
  }
};

export const createStaff = async (req, res) => {
  const { companyId } = req.company;
  const { name, email, password, role, commission, workSchedule } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newStaff = await prisma.user.create({
      data: { name, email, password: hashedPassword, role, commission, workSchedule, companyId },
    });
    res.status(201).json(newStaff);
  } catch (error) {
    if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Email já cadastrado.'});
    }
    res.status(500).json({ message: 'Erro ao criar colaborador.' });
  }
};
// Implementar update e delete