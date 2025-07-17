import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// As funções listStaff, updateStaff, e deleteStaff continuam as mesmas...

export const listStaff = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { companyId: req.company.id },
      select: { id: true, name: true, email: true, role: true }
    });
    res.status(200).json(staff);
  } catch (error) {
    console.error("Erro ao listar colaboradores:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    const companyId = req.company.id;
    const updateData = { name, email, role };
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
    console.error("--- ERRO DETALHADO AO ATUALIZAR COLABORADOR ---", error);
    res.status(500).json({ message: 'Erro ao atualizar colaborador.' });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id: id, companyId: req.company.id },
    });
    res.status(204).send();
  } catch (error) {
    console.error("--- ERRO DETALHADO AO DELETAR COLABORADOR ---", error);
    res.status(500).json({ message: 'Erro ao deletar colaborador.' });
  }
};


// --- FUNÇÃO CREATESTAFF ATUALIZADA ---
export const createStaff = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
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
        companyId: companyId,
      },
    });

    const { password: _, ...staffWithoutPassword } = newStaff;
    res.status(201).json(staffWithoutPassword);

  } catch (error) {
    // ESTA PARTE FOI MELHORADA
    console.error("--- ERRO DETALHADO AO CRIAR COLABORADOR ---", error);
    // Verifica se o erro é de violação de campo único (P2002) no campo 'email'
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({ message: 'Este email já está em uso. Por favor, utilize outro.' });
    }
    // Para outros erros, mantém a resposta genérica
    res.status(500).json({ message: 'Erro ao criar colaborador.' });
  }
};
