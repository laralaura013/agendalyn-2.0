import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

export const register = async (req, res) => {
  try {
    const { companyName, name, email, password } = req.body;
    if (!companyName || !name || !email || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(409).json({ message: 'Este email já está em uso.' });
    }

    const newCompany = await prisma.company.create({
      data: { name: companyName }
    });

    const proPlan = await prisma.plan.findUnique({ where: { name: 'PRO' } });
    if (!proPlan) {
      console.error("ERRO CRÍTICO: O plano 'PRO' não foi encontrado no banco de dados.");
      return res.status(500).json({ message: 'Erro de configuração do sistema: Plano PRO não encontrado.' });
    }

    await prisma.subscription.create({
      data: {
        companyId: newCompany.id,
        planId: proPlan.id,
        status: 'ACTIVE',
        currentPeriodEnd: addDays(new Date(), 14),
      },
    });

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        companyId: newCompany.id,
        role: 'OWNER',
      },
    });

    const token = jwt.sign({ id: newUser.id, companyId: newCompany.id, role: 'OWNER' }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("--- ERRO NO REGISTO ---", error);
    res.status(500).json({ message: 'Erro ao registar novo utilizador.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user.id, companyId: user.companyId, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });
      res.status(200).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      res.status(401).json({ message: 'Credenciais inválidas.' });
    }
  } catch (error) {
    console.error("--- ERRO NO LOGIN ---", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};