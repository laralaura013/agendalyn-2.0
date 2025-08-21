// src/controllers/authController.js
import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { addDays } from 'date-fns';

/** Obtém o companyId do request (quando disponível) */
const getCompanyId = (req) =>
  req?.body?.companyId ||
  req?.headers?.['x-company-id'] ||
  req?.company?.id ||
  null;

/** Assinatura do token (expiração de 1 dia) */
const signToken = (user) =>
  jwt.sign(
    { id: user.id, companyId: user.companyId, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1d' }
  );

/** Seleção segura de usuário (sem password) */
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  companyId: true,
  showInBooking: true,
  commission: true,
  phone: true,
  nickname: true,
  workSchedule: true,
  createdAt: true,
  updatedAt: true,
};

/* ============================= REGISTER ============================= */
export const register = async (req, res) => {
  try {
    const { companyName, name, email, password } = req.body;
    if (!companyName || !name || !email || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    // Se NÃO quiser permitir o mesmo e-mail em empresas diferentes, mantenha esta verificação:
    const emailAlreadyUsed = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (emailAlreadyUsed) {
      return res.status(409).json({ message: 'Este email já está em uso.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Cria empresa
    const newCompany = await prisma.company.create({
      data: { name: companyName },
    });

    // Assina plano PRO com 14 dias de trial
    const proPlan = await prisma.plan.findUnique({ where: { name: 'PRO' } });
    if (!proPlan) {
      console.error("ERRO CRÍTICO: O plano 'PRO' não foi encontrado no banco de dados.");
      return res
        .status(500)
        .json({ message: 'Erro de configuração do sistema: Plano PRO não encontrado.' });
    }

    await prisma.subscription.create({
      data: {
        companyId: newCompany.id,
        planId: proPlan.id,
        status: 'ACTIVE',
        currentPeriodEnd: addDays(new Date(), 14),
      },
    });

    // Cria usuário OWNER da empresa recém-criada
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        companyId: newCompany.id,
        role: 'OWNER',
      },
      select: userSelect,
    });

    const token = signToken(newUser);

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    if (error?.code === 'P2002' && error?.meta?.target?.includes('User_companyId_email_key')) {
      return res.status(409).json({ message: 'Este email já está em uso nesta empresa.' });
    }
    console.error('--- ERRO NO REGISTO ---', error);
    return res.status(500).json({ message: 'Erro ao registar novo utilizador.' });
  }
};

/* ============================== LOGIN ============================== */
export const login = async (req, res) => {
  try {
    const { email, password, companyId: bodyCompanyId } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    // companyId pode vir no body, header x-company-id ou não vir (cai para findFirst)
    const cid = bodyCompanyId || getCompanyId(req);

    let user;
    if (cid) {
      // Com chave composta (companyId, email) quando sabemos a empresa
      user = await prisma.user.findUnique({
        where: { companyId_email: { companyId: cid, email } },
        select: { ...userSelect, password: true },
      });
    } else {
      // Compat sem companyId: pega o mais recente com esse email
      user = await prisma.user.findFirst({
        where: { email },
        orderBy: { createdAt: 'desc' },
        select: { ...userSelect, password: true },
      });
    }

    if (!user) return res.status(401).json({ message: 'Credenciais inválidas.' });

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas.' });

    const token = signToken(user);
    const { password: _p, ...safeUser } = user;
    return res.status(200).json({
      token,
      user: {
        id: safeUser.id,
        name: safeUser.name,
        email: safeUser.email,
        role: safeUser.role,
      },
    });
  } catch (error) {
    console.error('--- ERRO NO LOGIN ---', error);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/* =============================== ME =============================== */
export const me = async (req, res) => {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ message: 'Não autenticado.' });

    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    return res.json({ user });
  } catch (error) {
    console.error('--- ERRO NO ME ---', error);
    return res.status(500).json({ message: 'Erro interno.' });
  }
};
